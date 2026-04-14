import { request } from './core';
import type {
    AnnouncementCategory,
    CreateAnnouncementPayload,
    PatientNotificationListResponse,
    UpdateAnnouncementPayload,
} from './types';

export const announcementsApi = {
    getPublicAnnouncements: (opts?: { category?: AnnouncementCategory }) => {
        const query = opts?.category ? `?category=${encodeURIComponent(opts.category)}` : '';
        return request(`/announcements/public${query}`);
    },

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    getAnnouncements: (_adminEmail?: string, category?: AnnouncementCategory) => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return request(`/announcements${query}`);
    },

    createAnnouncement: ({ adminEmail: _adminEmail, ...data }: CreateAnnouncementPayload) =>
        request('/announcements', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateAnnouncement: (id: number, { adminEmail: _adminEmail, ...data }: UpdateAnnouncementPayload) =>
        request(`/announcements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    deleteAnnouncement: (id: number, _adminEmail?: string) =>
        request(`/announcements/${id}`, {
            method: 'DELETE',
        }),

    setAnnouncementApproval: (id: number, status: 'approved' | 'rejected') =>
        request(`/announcements/${id}/approval`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    getPatientNotifications: (): Promise<PatientNotificationListResponse> =>
        request('/announcements/notifications'),

    markPatientNotificationRead: (id: number) =>
        request(`/announcements/notifications/${id}/read`, {
            method: 'PATCH',
        }),

    markAllPatientNotificationsRead: () =>
        request('/announcements/notifications/read-all', {
            method: 'PATCH',
        }),
};
