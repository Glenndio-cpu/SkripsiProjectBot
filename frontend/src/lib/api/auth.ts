import { API_BASE, request } from './core';
import type { RegisterPayload } from './types';

export const authApi = {
    login: (identifier: string, password: string, role: string) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password, role }),
        }),

    register: (data: RegisterPayload) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    logout: async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            const raw = await response.text();
            if (!raw) return {};

            try {
                return JSON.parse(raw);
            } catch {
                return {};
            }
        } catch {
            return {};
        }
    },

    me: () => request('/auth/me'),

    getRegistrationStatus: (identifier: string) =>
        request(`/auth/registration-status?identifier=${encodeURIComponent(identifier)}`),

    changePassword: (email: string, currentPassword: string, newPassword: string) =>
        request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ email, currentPassword, newPassword }),
        }),

    deleteAccount: (email: string, password: string, adminEmail?: string) =>
        request('/auth/delete-account', {
            method: 'POST',
            body: JSON.stringify({ email, password, adminEmail }),
        }),
};
