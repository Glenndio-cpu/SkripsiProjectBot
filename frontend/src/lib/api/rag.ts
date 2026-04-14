import { API_BASE, request } from './core';

export const ragApi = {
    ragStatus: () => request('/rag/status'),

    ragDocuments: () => request('/rag/documents'),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    ragUpload: (file: File, _adminEmail?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        const url = `${API_BASE}/rag/upload`;
        return fetch(url, { method: 'POST', body: formData, credentials: 'include' }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
        });
    },

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    ragDelete: (filename: string, _adminEmail?: string) =>
        request(`/rag/document/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    ragReindex: (_adminEmail?: string) =>
        request('/rag/reindex', {
            method: 'POST',
            body: JSON.stringify({}),
        }),

    // adminEmail kept for backward compatibility in callers; backend auth uses session.
    ragSystemInfo: (_adminEmail?: string) => request('/rag/system-info'),

    ragQuery: (query: string, topK?: number) =>
        request('/rag/query', {
            method: 'POST',
            body: JSON.stringify({ query, topK: topK || 5 }),
        }),
};
