import { request } from './core';
import type { ChatMessagePayload } from './types';

export const chatApi = {
    chat: (messages: ChatMessagePayload[], mode: string, email?: string) =>
        request('/chat', {
            method: 'POST',
            body: JSON.stringify({ messages, mode, ...(email && { email }) }),
        }),

    chatStatus: () => request('/chat/status'),

    getChatHistory: (email: string, mode?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (mode) params.set('mode', mode);
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return request(`/chat/history/${encodeURIComponent(email)}${qs ? '?' + qs : ''}`);
    },

    clearChatHistory: (email: string, mode?: string) =>
        request(`/chat/history/${encodeURIComponent(email)}${mode ? '?mode=' + mode : ''}`, {
            method: 'DELETE',
        }),

    getChatHistoryCount: (email: string) => request(`/chat/history/count/${encodeURIComponent(email)}`),
};
