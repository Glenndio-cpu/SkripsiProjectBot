import { request } from './core';
import type { ConsultationEmailPayload, ContactEmailPayload } from './types';

export const emailApi = {
    sendConsultationEmail: (data: ConsultationEmailPayload) =>
        request('/email/consultation', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    sendContactEmail: (data: ContactEmailPayload) =>
        request('/email/contact', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    emailStatus: () => request('/email/status'),
};
