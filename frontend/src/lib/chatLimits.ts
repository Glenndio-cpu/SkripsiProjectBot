export const GUEST_SESSION_MESSAGE_LIMIT = 12;
export const GUEST_DAILY_MESSAGE_LIMIT = 30;
export const PATIENT_DAILY_MESSAGE_LIMIT = 60;

export const CHAT_DAILY_USAGE_STORAGE_KEY = 'puskesbot:chat-daily-usage:v1';
export const CHAT_GUEST_SESSION_STORAGE_KEY = 'puskesbot:guest-session-usage:v1';

interface DailyChatUsageRecord {
  date: string;
  guestCount: number;
  patientCounts: Record<string, number>;
}

interface GuestSessionUsageRecord {
  date: string;
  count: number;
}

const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createEmptyDailyUsageRecord = (date = getTodayDateKey()): DailyChatUsageRecord => ({
  date,
  guestCount: 0,
  patientCounts: {},
});

const sanitizeCount = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
};

const sanitizePatientCounts = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') return {};

  const counts: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([email, rawCount]) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    const count = sanitizeCount(rawCount);
    if (count > 0) {
      counts[normalizedEmail] = count;
    }
  });

  return counts;
};

const readDailyUsageRecord = (): DailyChatUsageRecord => {
  const today = getTodayDateKey();

  if (typeof window === 'undefined') {
    return createEmptyDailyUsageRecord(today);
  }

  try {
    const raw = window.localStorage.getItem(CHAT_DAILY_USAGE_STORAGE_KEY);
    if (!raw) return createEmptyDailyUsageRecord(today);

    const parsed = JSON.parse(raw) as Partial<DailyChatUsageRecord>;
    const parsedDate = typeof parsed?.date === 'string' ? parsed.date : '';

    if (parsedDate !== today) {
      return createEmptyDailyUsageRecord(today);
    }

    return {
      date: today,
      guestCount: sanitizeCount(parsed?.guestCount),
      patientCounts: sanitizePatientCounts(parsed?.patientCounts),
    };
  } catch {
    return createEmptyDailyUsageRecord(today);
  }
};

const writeDailyUsageRecord = (record: DailyChatUsageRecord): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHAT_DAILY_USAGE_STORAGE_KEY, JSON.stringify(record));
};

export const getGuestDailyUsageCount = (): number => {
  return readDailyUsageRecord().guestCount;
};

export const getPatientDailyUsageCount = (email: string): number => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return 0;

  const usage = readDailyUsageRecord();
  return usage.patientCounts[normalizedEmail] || 0;
};

export const incrementGuestDailyUsageCount = (): number => {
  const usage = readDailyUsageRecord();
  usage.guestCount += 1;
  writeDailyUsageRecord(usage);
  return usage.guestCount;
};

export const incrementPatientDailyUsageCount = (email: string): number => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return 0;

  const usage = readDailyUsageRecord();
  const current = usage.patientCounts[normalizedEmail] || 0;
  usage.patientCounts[normalizedEmail] = current + 1;
  writeDailyUsageRecord(usage);
  return usage.patientCounts[normalizedEmail];
};

// ── Guest session usage (persisted to localStorage) ──────────────────────

const readGuestSessionRecord = (): GuestSessionUsageRecord => {
  const today = getTodayDateKey();

  if (typeof window === 'undefined') {
    return { date: today, count: 0 };
  }

  try {
    const raw = window.localStorage.getItem(CHAT_GUEST_SESSION_STORAGE_KEY);
    if (!raw) return { date: today, count: 0 };

    const parsed = JSON.parse(raw) as Partial<GuestSessionUsageRecord>;

    // Auto-reset if date changed (new day = fresh session)
    if (typeof parsed?.date !== 'string' || parsed.date !== today) {
      return { date: today, count: 0 };
    }

    return {
      date: today,
      count: sanitizeCount(parsed?.count),
    };
  } catch {
    return { date: today, count: 0 };
  }
};

const writeGuestSessionRecord = (record: GuestSessionUsageRecord): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHAT_GUEST_SESSION_STORAGE_KEY, JSON.stringify(record));
};

export const getGuestSessionUsageCount = (): number => {
  return readGuestSessionRecord().count;
};

export const incrementGuestSessionUsageCount = (): number => {
  const record = readGuestSessionRecord();
  record.count += 1;
  writeGuestSessionRecord(record);
  return record.count;
};

export const resetGuestSessionUsageCount = (): void => {
  const today = getTodayDateKey();
  writeGuestSessionRecord({ date: today, count: 0 });
};

// ── Cross-tab sync via BroadcastChannel ─────────────────────────────────

const QUOTA_CHANNEL_NAME = 'puskesbot:quota-sync';

let _channel: BroadcastChannel | null = null;

const getQuotaChannel = (): BroadcastChannel | null => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!_channel) {
    try {
      _channel = new BroadcastChannel(QUOTA_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return _channel;
};

/** Notify other tabs that a quota value was updated. */
export const broadcastQuotaChange = (): void => {
  const ch = getQuotaChannel();
  if (ch) {
    try { ch.postMessage({ type: 'quota-changed', ts: Date.now() }); } catch { /* ignore */ }
  }
};

/**
 * Subscribe to quota-change notifications from other tabs.
 * Returns an unsubscribe function.
 */
export const onQuotaChanged = (callback: () => void): (() => void) => {
  const ch = getQuotaChannel();
  if (!ch) return () => {};

  const handler = () => { callback(); };
  ch.addEventListener('message', handler);
  return () => { ch.removeEventListener('message', handler); };
};

/**
 * Helper: read all quota values from localStorage in one call.
 * Components can call this on mount, on focus, or on broadcast.
 */
export const readAllQuotas = (patientEmail?: string) => ({
  guestDaily: getGuestDailyUsageCount(),
  guestSession: getGuestSessionUsageCount(),
  patientDaily: patientEmail ? getPatientDailyUsageCount(patientEmail) : 0,
});
