# SkripsiProjectBot

Repository utama untuk aplikasi PuskesBot (frontend + backend).

## Dokumentasi

- Panduan frontend: [frontend/README.md](frontend/README.md)
- Panduan backend: [backend/README.md](backend/README.md)

## Struktur Project

- frontend/: aplikasi client (React + Vite + TypeScript)
- backend/: API service (Flask)

## Catatan

Commit awal repository dibuat sebagai inisialisasi tanpa menambahkan seluruh source code sekaligus. Commit dokumentasi dilakukan terpisah agar alur kontribusi tetap rapi.

## Setup CAPTCHA Kontak (Turnstile)

Untuk mengaktifkan proteksi bot pada fitur kontak:

1. Buat widget Cloudflare Turnstile dan dapatkan `site key` + `secret key`.
2. Set variabel frontend `VITE_TURNSTILE_SITE_KEY`.
3. Set variabel backend `TURNSTILE_SECRET_KEY` dan `CONTACT_CAPTCHA_ENFORCE=true`.
4. Restart frontend dan backend.

Form kontak akan menolak submit jika CAPTCHA tidak lolos verifikasi di backend.
