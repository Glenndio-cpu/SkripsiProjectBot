// Backend API base URL
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.BASE_URL.replace(/\/+$/, '') + '/api');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export const api = {
  // Chat
  chat: (messages: { role: string; content: string }[], mode: string, email?: string) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, mode, ...(email && { email }) }),
    }),

  chatStatus: () => request('/chat/status'),

  // Auth
  login: (identifier: string, password: string, role: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role }),
    }),

  register: (data: {
    name: string;
    email: string;
    phone?: string;
    ktp?: string;
    password: string;
    role?: string;
    adminAccessCode?: string;
  }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users (admin-only endpoints pass adminEmail)
  getUsers: (adminEmail?: string) => {
    const params = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : '';
    return request(`/users${params}`);
  },
  getContacts: (adminEmail?: string) => {
    const params = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : '';
    return request(`/users/contacts${params}`);
  },
  updateProfile: (data: { email: string; name?: string; phone?: string; ktp?: string; profileImage?: string }) =>
    request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  me: () => request('/auth/me'),

  // Activity tracking
  getActivity: (email: string) => request(`/users/activity/${encodeURIComponent(email)}`),
  trackActivity: (email: string, type: string, articleId?: string) =>
    request('/users/activity/track', {
      method: 'POST',
      body: JSON.stringify({ email, type, articleId }),
    }),
  getAllActivities: (adminEmail?: string) => {
    const params = adminEmail ? `?adminEmail=${encodeURIComponent(adminEmail)}` : '';
    return request(`/users/activities/all${params}`);
  },

  // Email
  sendConsultationEmail: (data: {
    user_name: string;
    user_email: string;
    symptoms: string;
    consultation_summary: string;
  }) =>
    request('/email/consultation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendContactEmail: (data: {
    from_name: string;
    from_email: string;
    subject: string;
    message: string;
  }) =>
    request('/email/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  emailStatus: () => request('/email/status'),

  // Password & Account
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

  // Chat History
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

  getChatHistoryCount: (email: string) =>
    request(`/chat/history/count/${encodeURIComponent(email)}`),

  // RAG / Document Management (Admin)
  ragStatus: () => request('/rag/status'),

  ragDocuments: () => request('/rag/documents'),

  ragUpload: (file: File, adminEmail: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('adminEmail', adminEmail);
    const url = `${API_BASE}/rag/upload`;
    return fetch(url, { method: 'POST', body: formData, credentials: 'include' }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    });
  },

  ragDelete: (filename: string, adminEmail: string) =>
    request(`/rag/document/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminEmail }),
    }),

  ragReindex: (adminEmail: string) =>
    request('/rag/reindex', {
      method: 'POST',
      body: JSON.stringify({ adminEmail }),
    }),

  ragSystemInfo: (adminEmail: string) => {
    const params = `?adminEmail=${encodeURIComponent(adminEmail)}`;
    return request(`/rag/system-info${params}`);
  },

  ragQuery: (query: string, topK?: number) =>
    request('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query, topK: topK || 5 }),
    }),

  // Announcements
  getPublicAnnouncements: () => request('/announcements/public'),

  getAnnouncements: (adminEmail: string) => {
    const params = `?adminEmail=${encodeURIComponent(adminEmail)}`;
    return request(`/announcements${params}`);
  },

  createAnnouncement: (data: {
    adminEmail: string;
    title: string;
    content: string;
    type?: string;
    priority?: number;
    expiresAt?: string | null;
  }) =>
    request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAnnouncement: (id: number, data: {
    adminEmail: string;
    title?: string;
    content?: string;
    type?: string;
    priority?: number;
    active?: boolean;
    expiresAt?: string | null;
  }) =>
    request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAnnouncement: (id: number, adminEmail: string) =>
    request(`/announcements/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminEmail }),
    }),

  // Fonnte WhatsApp Gateway (Admin)
  fonnteStatus: (adminEmail: string) => {
    const params = `?adminEmail=${encodeURIComponent(adminEmail)}`;
    return request(`/fonnte/status${params}`);
  },

  fonnteSend: (data: {
    adminEmail: string;
    target: string;
    message: string;
    delay?: string;
    url?: string;
    typing?: boolean;
  }) =>
    request('/fonnte/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fonnteBroadcast: (data: {
    adminEmail: string;
    message: string;
    delay?: string;
    url?: string;
  }) =>
    request('/fonnte/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fonnteValidate: (adminEmail: string, target: string) =>
    request('/fonnte/validate', {
      method: 'POST',
      body: JSON.stringify({ adminEmail, target }),
    }),

  fonnteSendIndividual: (data: {
    adminEmail: string;
    phone: string;
    message: string;
    name?: string;
  }) =>
    request('/fonnte/send-individual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fonnteLogs: (adminEmail: string, limit?: number) => {
    const params = new URLSearchParams();
    params.set('adminEmail', adminEmail);
    if (limit) params.set('limit', String(limit));
    return request(`/fonnte/logs?${params.toString()}`);
  },
};

export default api;
