// Backend API base URL. In production this should be proxied to Flask (/api/*).
const DEFAULT_API_BASE = '/api';
export const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE}${endpoint}`;

    let res: Response;
    try {
        res = await fetch(url, {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Gagal terhubung ke server';
        throw new Error(`Tidak dapat menghubungi API (${API_BASE}). ${msg}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const raw = await res.text();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;
    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            data = null;
        }
    }

    const isJson = contentType.includes('application/json');

    if (!res.ok) {
        if (res.status === 401) {
            const msg = data && typeof data === 'object' && typeof data.error === 'string'
                ? data.error
                : 'Sesi tidak valid. Silakan login ulang';

            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem('user');
                } catch {
                    // ignore localStorage access failures
                }

                if (!window.location.pathname.startsWith('/login')) {
                    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
                    window.location.href = `/login?next=${next}`;
                }
            }

            throw new Error(msg);
        }

        if (data && typeof data === 'object' && typeof data.error === 'string') {
            throw new Error(data.error);
        }

        if (!isJson && raw) {
            const preview = raw.replace(/\s+/g, ' ').trim().slice(0, 140);
            throw new Error(
                `Server mengembalikan respons non-JSON (HTTP ${res.status}). ` +
                `Cek konfigurasi VITE_API_URL atau reverse proxy /api. ` +
                `Preview: ${preview}`
            );
        }

        throw new Error(`HTTP ${res.status}`);
    }

    if (!isJson && raw) {
        throw new Error('Server mengembalikan respons non-JSON saat aplikasi mengharapkan JSON.');
    }

    return data ?? {};
}
