import { authApi } from './auth';
import { chatApi } from './chat';
import { usersApi } from './users';
import { emailApi } from './email';
import { ragApi } from './rag';
import { announcementsApi } from './announcements';
import { fonnteApi } from './fonnte';

export { API_BASE, request } from './core';
export * from './types';

export const api = {
    ...chatApi,
    ...authApi,
    ...usersApi,
    ...emailApi,
    ...ragApi,
    ...announcementsApi,
    ...fonnteApi,
};

export default api;
