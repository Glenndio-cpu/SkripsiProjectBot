import { API_BASE, request } from './core';
import type {
    CreateUserPayload,
    PendingRegistrationListResponse,
    PatientComplaintListResponse,
    ReviewPendingRegistrationPayload,
    UpdatePatientComplaintPayload,
    UpdateProfilePayload,
    UserRole,
} from './types';

function buildAbsoluteApiUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
        return `${API_BASE}${normalizedEndpoint}`;
    }

    if (typeof window === 'undefined') {
        return `${API_BASE}${normalizedEndpoint}`;
    }

    return `${window.location.origin}${API_BASE}${normalizedEndpoint}`;
}

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

    getPatientComplaints: (email: string, limit?: number): Promise<PatientComplaintListResponse> => {
        const safeLimit = typeof limit === 'number'
            ? Math.max(1, Math.min(Math.round(limit), 50))
            : undefined;
        const query = safeLimit ? `?limit=${safeLimit}` : '';
        return request(`/users/complaints/${encodeURIComponent(email)}${query}`);
    },

    updatePatientComplaint: (data: UpdatePatientComplaintPayload) =>
        request('/users/complaints', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getPatientComplaintsStreamUrl: (opts?: { interval?: number }) => {
        const params = new URLSearchParams();
        if (typeof opts?.interval === 'number' && Number.isFinite(opts.interval)) {
            params.set('interval', String(Math.round(opts.interval)));
        }
        const query = params.toString();
        return buildAbsoluteApiUrl(`/users/complaints/stream${query ? `?${query}` : ''}`);
    },

    getPendingRegistrations: (limit?: number): Promise<PendingRegistrationListResponse> => {
        const safeLimit = typeof limit === 'number'
            ? Math.max(1, Math.min(Math.round(limit), 500))
            : undefined;
        const query = safeLimit ? `?limit=${safeLimit}` : '';
        return request(`/users/pending${query}`);
    },

    reviewPendingRegistration: (email: string, payload: ReviewPendingRegistrationPayload) =>
        request(`/users/pending/${encodeURIComponent(email)}/approval`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),

    getActivePatients: (sinceMinutes?: number) => {
        const qs = typeof sinceMinutes === 'number' ? `?since_minutes=${Math.round(sinceMinutes)}` : '';
        return request(`/users/active${qs}`);
    },
};
