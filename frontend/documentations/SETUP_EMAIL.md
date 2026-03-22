# Setup Email Notification dengan EmailJS untuk ViralCare AIDE

## Langkah 1: Install EmailJS Library

Buka PowerShell sebagai Administrator dan jalankan:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Kemudian install EmailJS:

```powershell
cd "c:\Users\Asus\Documents\SEMESTER9\Skripsi I\AI-Kesehatan-ViralCare-AIDE"
npm install @emailjs/browser
```

## Langkah 2: Buat Akun EmailJS (GRATIS)

1. Kunjungi: https://www.emailjs.com/
2. Klik "Sign Up" untuk membuat akun gratis
3. Verifikasi email Anda

## Langkah 3: Setup Email Service di EmailJS

1. Login ke dashboard EmailJS
2. Klik "Add New Service"
3. Pilih "Gmail" sebagai email service
4. Klik "Connect Account" dan login dengan Gmail Anda
5. Beri nama service (contoh: "ViralCare_Gmail")
6. Salin **Service ID** (contoh: service_abc123)

## Langkah 4: Buat Email Template

### Template 1: Konfirmasi Konsultasi
1. Di dashboard, klik "Email Templates"
2. Klik "Create New Template"
3. Isi template:

**Template Name:** viralcare_consultation

**Subject:** Konfirmasi Konsultasi ViralCare AIDE - {{user_name}}

**Content:**
```
Halo Admin ViralCare AIDE,

Ada konsultasi baru dari:

Nama: {{user_name}}
Email: {{user_email}}

Gejala yang dialami:
{{symptoms}}

Ringkasan Konsultasi:
{{consultation_summary}}

---
Pesan ini dikirim otomatis dari ViralCare AIDE
{{reply_to}}
```

4. Salin **Template ID** (contoh: template_xyz789)

### Template 2: Pesan Kontak
1. Buat template baru
2. **Template Name:** viralcare_contact

**Subject:** Pesan Baru dari {{from_name}} - ViralCare AIDE

**Content:**
```
Halo Admin,

Ada pesan baru dari website ViralCare AIDE:

Dari: {{from_name}}
Email: {{from_email}}
Subjek: {{subject}}

Pesan:
{{message}}

---
Kirim dari: ViralCare AIDE Website
Reply to: {{reply_to}}
```

3. Salin **Template ID**

## Langkah 5: Dapatkan Public Key

1. Di dashboard EmailJS, klik "Account" (ikon user di kanan atas)
2. Klik "General" tab
3. Salin **Public Key** (contoh: abcd1234efgh5678)

## Langkah 6: Masukkan Credentials ke File .env

Buat file `.env` di root project dengan isi:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_CONSULTATION=template_xyz789
VITE_EMAILJS_TEMPLATE_CONTACT=template_abc456
VITE_EMAILJS_PUBLIC_KEY=abcd1234efgh5678
```

Ganti dengan credentials Anda yang sebenarnya!

## Langkah 7: Testing

Setelah semua setup selesai:
1. Restart development server (`npm run dev`)
2. Coba kirim konsultasi atau pesan kontak
3. Cek email Gmail Anda untuk notifikasi

## Catatan Penting

- **Free Plan EmailJS**: 200 emails/bulan gratis
- **Gmail Settings**: Pastikan "Less secure app access" diaktifkan jika diminta
- **Email Delivery**: Email biasanya sampai dalam 1-2 menit
- **Spam Folder**: Cek spam folder jika email tidak masuk

## Troubleshooting

Jika email tidak terkirim:
1. Cek console browser untuk error
2. Pastikan semua credentials benar
3. Cek quota EmailJS (max 200/bulan untuk free)
4. Verifikasi Gmail sudah terkoneksi di EmailJS dashboard

## Support

Jika ada masalah, hubungi:
- EmailJS Support: https://www.emailjs.com/docs/
- EmailJS Forum: https://www.emailjs.com/forum/
