# Puskesmas Wori Online

> **Chatbot Pendamping Puskesmas Sebagai Inovasi Layanan Kesehatan Desa Wori Menggunakan WhatsApp Gateway Terintegrasi RAG dan LLM**

Aplikasi web informasi kesehatan untuk **Puskesmas Desa Wori**, dilengkapi dengan chatbot AI berbasis Google Gemini 2.0 Flash untuk konsultasi kesehatan dan pencegahan penyakit menular.

## Fitur Utama

- **Chatbot AI (Gemini 2.0 Flash)** — Konsultasi kesehatan interaktif dengan dua mode:
  - *Mode Publik*: Informasi umum Puskesmas (jam layanan, lokasi, kontak)
  - *Mode Konsultasi*: Informasi penyakit, gejala, pencegahan, dan saran kesehatan
- **Ensiklopedia Penyakit** — Informasi penyakit menular & tidak menular, dengan filter dan pencarian
- **Tips Pencegahan** — Panduan pencegahan penyakit dan gaya hidup sehat
- **Integrasi WhatsApp** — Kirim ringkasan konsultasi langsung ke WhatsApp
- **Notifikasi Email** — Kirim ringkasan konsultasi via email (EmailJS)
- **Panel Admin** — Dashboard, manajemen pasien, dan broadcast WhatsApp
- **Tracking Aktivitas** — Statistik konsultasi, artikel dibaca, dan hari aktif per user
- **Profil User** — Upload foto profil dengan crop, edit data, lihat statistik aktivitas

## Tech Stack

| Teknologi | Keterangan |
|---|---|
| React + TypeScript | Frontend framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui | UI component library |
| Framer Motion | Animasi |
| Google Gemini 2.0 Flash | AI chatbot |
| EmailJS | Email service |

## Instalasi & Setup

### Prasyarat

- [Node.js](https://nodejs.org/) (v18+)
- npm atau bun

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/Glenndio-cpu/SkripsiProject.git

# 2. Masuk ke folder project
cd SkripsiProject

# 3. Install dependencies
npm install

# 4. Copy file environment
cp .env.example .env

# 5. Jalankan development server
npm run dev
```

### Konfigurasi Environment (`.env`)

```env
# Gemini AI — dapatkan gratis di https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_gemini_api_key

# EmailJS — dapatkan di https://www.emailjs.com/
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_CONSULTATION=your_template_id
VITE_EMAILJS_TEMPLATE_CONTACT=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# Admin
VITE_ADMIN_ACCESS_CODE=your_admin_code

# Kontak Puskesmas
VITE_PUSKESMAS_PHONE=+62 896-5739-8733
VITE_PUSKESMAS_WHATSAPP=6289657398733
VITE_PUSKESMAS_EMAIL=puskesmas.desawori@gmail.com
VITE_PUSKESMAS_ADDRESS=Universitas Klabat, Manado
```

> **Penting:** Jangan commit file `.env` ke repository. File `.env` sudah tercantum di `.gitignore`.

## Struktur Halaman

| Route | Halaman | Akses |
|---|---|---|
| `/` | Beranda | Publik |
| `/tentang` | Tentang Puskesmas | Publik |
| `/penyakit` | Ensiklopedia Penyakit | Login |
| `/pencegahan` | Tips Pencegahan | Login |
| `/konsultasi` | Chatbot Konsultasi AI | Publik (terbatas) / Login (penuh) |
| `/kontak` | Formulir Kontak | Publik |
| `/profile` | Profil User | Login |
| `/admin/dashboard` | Dashboard Admin | Admin/Perawat |
| `/admin/patients` | Manajemen Pasien | Admin/Perawat |
| `/admin/broadcast` | Broadcast WhatsApp | Admin/Perawat |
| `/admin/register` | Registrasi Admin | Admin/Perawat |

## SDGs

Aplikasi ini mendukung:
- **SDG 3** — Good Health and Well-being
- **SDG 12** — Responsible Consumption and Production

## Penulis

**Glenndio Umboh** — Universitas Klabat

