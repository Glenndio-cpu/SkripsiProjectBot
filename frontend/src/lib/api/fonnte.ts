import { request } from './core';
import type {
    FonnteBroadcastPayload,
    FonnteSendIndividualPayload,
    FonnteSendPayload,
} from './types';

export const fonnteApi = {
    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    // force=true bypasses server-side cache for manual Refresh clicks
    fonnteStatus: (_adminEmail?: string, force?: boolean) =>
        request(`/fonnte/status${force ? '?force=true' : ''}`),

    fonnteSend: ({ adminEmail: _adminEmail, ...data }: FonnteSendPayload) =>
        request('/fonnte/send', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    fonnteBroadcast: ({ adminEmail: _adminEmail, ...data }: FonnteBroadcastPayload) =>
        request('/fonnte/broadcast', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    fonnteValidate: (_adminEmail: string, target: string) =>
        request('/fonnte/validate', {
            method: 'POST',
            body: JSON.stringify({ target }),
        }),

    fonnteSendIndividual: ({ adminEmail: _adminEmail, ...data }: FonnteSendIndividualPayload) =>
        request('/fonnte/send-individual', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    fonnteLogs: (_adminEmail?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return request(`/fonnte/logs${qs ? '?' + qs : ''}`);
    },
};
