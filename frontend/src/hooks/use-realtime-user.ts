import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';

export interface RealtimeUser {
  name?: string;
  email?: string;
  phone?: string;
  ktp?: string;
  medicalHistory?: string;
  profileImage?: string;
  role?: string;
  [key: string]: unknown;
}

const USER_STORAGE_KEY = 'user';
const USER_UPDATED_EVENT = 'userUpdated';
const PUBLIC_ROLE = 'public';

const readStoredUser = (): RealtimeUser | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const role = (parsed as RealtimeUser).role;
    if (role === PUBLIC_ROLE) return null;

    return parsed as RealtimeUser;
  } catch {
    return null;
  }
};

export const getUserInitial = (name?: string, fallback = 'U'): string => {
  const first = (name || '').trim().charAt(0).toUpperCase();
  return first || fallback;
};

export function useRealtimeUser(): RealtimeUser | null {
  const [user, setUser] = useState<RealtimeUser | null>(() => readStoredUser());

  const syncUser = useCallback(() => {
    setUser(readStoredUser());
  }, []);

  const syncFromServer = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const current = readStoredUser();
    if (!current || current.role === PUBLIC_ROLE) return;

    try {
      const response = await api.me();
      if (!response?.user) return;

      const next = response.user as RealtimeUser;
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      setUser(next);
      window.dispatchEvent(new Event(USER_UPDATED_EVENT));
    } catch {
      // ignore sync failures; auth layer will handle invalid sessions
    }
  }, []);

  useEffect(() => {
    syncUser();

    void syncFromServer();
    const timer = window.setInterval(() => {
      void syncFromServer();
    }, 6000);

    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, syncUser);
      window.removeEventListener('storage', syncUser);
      window.clearInterval(timer);
    };
  }, [syncFromServer, syncUser]);

  return user;
}
