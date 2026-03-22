import api from './api';

/**
 * User Activity Tracking Service
 * Now uses backend API instead of localStorage
 */

export interface UserStats {
  consultationCount: number;
  articlesReadCount: number;
  activeDaysCount: number;
}

/**
 * Get current user's email from localStorage
 */
function getCurrentUserEmail(): string | null {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    const userData = JSON.parse(user);
    return userData.email || null;
  } catch (error) {
    console.error('Error getting current user email:', error);
    return null;
  }
}

/**
 * Track a consultation (increments count)
 */
export function trackConsultation(): void {
  const email = getCurrentUserEmail();
  if (!email) return;
  api.trackActivity(email, 'consultation').catch(err =>
    console.error('Failed to track consultation:', err)
  );
}

/**
 * Track an article read (prevents duplicates)
 */
export function trackArticleRead(articleId: string): void {
  const email = getCurrentUserEmail();
  if (!email) return;
  api.trackActivity(email, 'article', articleId).catch(err =>
    console.error('Failed to track article:', err)
  );
}

/**
 * Track daily activity
 */
export function trackDailyActivity(): void {
  const email = getCurrentUserEmail();
  if (!email) return;
  api.trackActivity(email, 'daily').catch(err =>
    console.error('Failed to track daily activity:', err)
  );
}

/**
 * Get statistics for current user
 */
export async function getUserStats(): Promise<UserStats> {
  const email = getCurrentUserEmail();
  if (!email) {
    return { consultationCount: 0, articlesReadCount: 0, activeDaysCount: 0 };
  }
  try {
    return await api.getActivity(email);
  } catch {
    return { consultationCount: 0, articlesReadCount: 0, activeDaysCount: 0 };
  }
}

/**
 * Sync version for backward compatibility - returns defaults, triggers async fetch
 */
export function getUserStatsSync(): UserStats {
  return { consultationCount: 0, articlesReadCount: 0, activeDaysCount: 0 };
}

/**
 * Get all user activities (admin)
 */
export async function getAllUserStats(): Promise<any[]> {
  try {
    const adminEmail = getAdminEmail();
    const data = await api.getAllActivities(adminEmail);
    return data.activities || [];
  } catch {
    return [];
  }
}

/**
 * Get admin email from localStorage session
 */
function getAdminEmail(): string | undefined {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.role === 'nurse') return user.email;
    }
  } catch { /* ignore */ }
  return undefined;
}
