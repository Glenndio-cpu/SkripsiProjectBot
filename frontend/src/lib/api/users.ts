import { request } from './core';
import type { CreateUserPayload, UpdateProfilePayload, UserRole } from './types';

export const usersApi = {
    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    getUsers: (_adminEmail?: string) => request('/users'),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    getContacts: (_adminEmail?: string) => request('/users/contacts'),

    updateProfile: (data: UpdateProfilePayload) =>
        request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    createUser: (data: CreateUserPayload) =>
        request('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateUserRole: (email: string, role: UserRole) =>
        request(`/users/${encodeURIComponent(email)}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),

    deleteUser: (email: string) =>
        request(`/users/${encodeURIComponent(email)}`, {
            method: 'DELETE',
        }),

    getActivity: (email: string) => request(`/users/activity/${encodeURIComponent(email)}`),

    trackActivity: (email: string, type: string) =>
        request('/users/activity/track', {
            method: 'POST',
            body: JSON.stringify({ email, type }),
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    getAllActivities: (_adminEmail?: string) => request('/users/activities/all'),
};
