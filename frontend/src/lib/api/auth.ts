import { request } from './core';
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

    logout: () =>
        request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({}),
        }),

    me: () => request('/auth/me'),

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
