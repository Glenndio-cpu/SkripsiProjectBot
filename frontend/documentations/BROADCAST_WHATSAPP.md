# Fitur Broadcast WhatsApp - Manajemen Kontak User

## Deskripsi
Sistem manajemen kontak user untuk broadcast notifikasi kesehatan via WhatsApp. Setiap user **WAJIB** memasukkan nomor telepon dan email saat registrasi.

---

## 🎯 Tujuan

Mengumpulkan database kontak user (nomor WhatsApp) untuk:
- 📢 Broadcast informasi kesehatan terbaru
- 💉 Reminder jadwal vaksinasi
- 🦠 Alert wabah penyakit menular
- 📅 Notifikasi program Puskesmas Wori

---

## ✅ Fitur Utama

### 1. **Registrasi Wajib dengan Nomor Telepon**
- **Email** dan **Nomor Telepon** wajib diisi (required)
- Validasi format nomor Indonesia (10-15 digit)
- Satu nomor hanya untuk satu akun (unique)
- Checkbox persetujuan menerima broadcast

### 2. **Halaman Broadcast Manager** (`/admin/broadcast`)
Dashboard lengkap untuk mengelola kontak:
- **Statistik**: Total user, user dengan HP, dll
- **Export CSV**: Download database kontak
- **Copy Nomor**: Copy semua nomor untuk paste ke WhatsApp
- **Tabel Kontak**: List semua user dengan nama, HP, email
- **Search**: Cari user by nama/HP/email

### 3. **Utility Functions** (`src/lib/userBroadcast.ts`)
- `getAllUsers()` - Ambil semua user
- `getAllPhoneNumbers()` - Ambil semua nomor HP
- `getBroadcastContacts()` - Data lengkap untuk broadcast
- `downloadContactsCSV()` - Export ke CSV
- `copyPhonestoClipboard()` - Copy ke clipboard
- `formatPhoneDisplay()` - Format nomor untuk display
- `isValidIndonesianPhone()` - Validasi nomor Indonesia

---

## 📋 Cara Penggunaan

### Untuk User (Registrasi)

1. **Buka halaman Register** (`/register`)
2. **Isi form lengkap**:
   - Nama Lengkap *
   - Email *
   - **Nomor Telepon WhatsApp** * (contoh: 08123456789)
   - Password *
   - Konfirmasi Password *
3. **Centang checkbox** persetujuan broadcast
4. **Klik "Daftar"**

**Validasi:**
- Semua field wajib diisi
- Nomor telepon 10-15 digit angka
- Format: `08xxx`, `+62xxx`, atau `62xxx`
- Satu nomor hanya untuk satu akun

---

### Untuk Admin (Broadcast)

#### Akses Dashboard
```
URL: http://localhost:8081/admin/broadcast
```

#### Melihat Statistik
Dashboard menampilkan:
- 👥 Total User terdaftar
- 📱 User dengan Nomor HP
- ✉️ User tanpa Nomor HP
- 📊 % Registrasi Lengkap

#### Export Data

**Option 1: Download CSV**
1. Klik tombol "Download File CSV"
2. File akan terdownload: `puskesmas-wori-contacts-YYYY-MM-DD.csv`
3. Import CSV ke:
   - WhatsApp Business API
   - Tools broadcast seperti WATI, Qontak, dll
   - Excel/Google Sheets untuk analisis

**Format CSV:**
```csv
Nama,Nomor WhatsApp,Email
"John Doe","+6281234567890","john@email.com"
"Jane Smith","+6281987654321","jane@email.com"
```

**Option 2: Copy Semua Nomor**
1. Klik tombol "Copy Semua Nomor"
2. Nomor tersalin ke clipboard dengan format: `+6281234567890,+6281987654321,...`
3. Paste ke:
   - WhatsApp Web (broadcast list)
   - Aplikasi broadcast lainnya
   - Text editor untuk backup

#### Search & Filter
- Ketik di search box untuk cari user
- Filter berdasarkan: Nama, Nomor HP, atau Email
- Real-time filtering

#### Klik Nomor HP
- Klik nomor HP di tabel
- Otomatis buka WhatsApp Web chat dengan user tersebut
- Icon WhatsApp hijau

---

## 🔧 Struktur Data

### User Object (localStorage)
```typescript
{
  email: "user@example.com",
  name: "Nama Lengkap",
  phone: "628123456789",        // Format E.164
  password: "hashed_password",
  profileImage: "base64_data",
  createdAt: "2025-11-01T10:00:00.000Z"
}
```

### Storage Keys
- `users` - Array semua user terdaftar
- `user` - Data user yang sedang login (session)

---

## 📊 Format Nomor Telepon

### Input Format (User bisa input dalam berbagai format)
```
08123456789
+628123456789
628123456789
0812-3456-789
```

### Storage Format (Disimpan normalized)
```
628123456789
```

### Display Format (Ditampilkan di UI)
```
+62 812-3456-789
```

### Export Format WhatsApp API (E.164)
```
+628123456789
```

---

## 🚀 Cara Broadcast

### Menggunakan WhatsApp Business App

1. **Buka Broadcast Manager** → Download CSV
2. **Import contacts** dari CSV ke WhatsApp Business
3. **Buat Broadcast List** baru
4. **Pilih contacts** dari import
5. **Kirim message** broadcast

### Menggunakan WhatsApp Business API

1. **Setup** WhatsApp Cloud API / Business API
2. **Export CSV** dari Broadcast Manager
3. **Upload** contacts ke platform API (WATI, Twilio, dll)
4. **Buat campaign** broadcast
5. **Kirim** dengan template message approved

### Menggunakan WhatsApp Web

1. **Copy Semua Nomor** dari Broadcast Manager
2. **Buka WhatsApp Web**
3. **Klik** ⋮ (Menu) → **New Broadcast**
4. **Paste** nomor yang sudah di-copy
5. **Add contacts** dan kirim message

---

## ⚠️ Best Practices Broadcast

### DO ✅
- ✅ Kirim informasi bermanfaat (jadwal vaksin, tips kesehatan)
- ✅ Waktu yang tepat (pagi/siang, hindari malam hari)
- ✅ Pesan singkat dan jelas
- ✅ Include link untuk info lebih lanjut
- ✅ Berikan opsi opt-out dalam pesan
- ✅ Hormati privasi user

### DON'T ❌
- ❌ Spam broadcast setiap hari
- ❌ Pesan promosi berlebihan
- ❌ Share data user ke pihak ketiga
- ❌ Kirim di waktu tidak pantas (tengah malam)
- ❌ Pesan terlalu panjang
- ❌ Clickbait atau misleading

### Template Message yang Baik

```
🏥 *Puskesmas Wori - Info Kesehatan*

Halo {nama},

📢 Pengumuman: Program vaksinasi flu gratis akan dimulai tanggal 5 November 2025.

📅 Lokasi: Puskesmas Wori
⏰ Jam: 08:00 - 14:00 WIB
📝 Daftar: https://viralcare-aide.com/daftar-vaksin

Pertanyaan? Hubungi kami:
📞 +62 896-5739-8733

---
Balas STOP untuk berhenti menerima notifikasi.
```

---

## 🔒 Privasi & Keamanan

### Perlindungan Data
- Data nomor HP hanya untuk keperluan Puskesmas Wori
- Tidak dibagikan ke pihak ketiga
- Disimpan secara lokal (localStorage)
- User bisa hapus nomor dari profile

### User Rights
- ✅ Lihat data mereka di Profile
- ✅ Update nomor HP kapan saja
- ✅ Hapus/Lepas nomor dari akun
- ✅ Opt-out dari broadcast (lewat pesan STOP)

### Compliance
- Sesuai dengan UU Perlindungan Data Pribadi
- User setuju menerima notifikasi saat registrasi (checkbox)
- Opt-out option selalu tersedia

---

## 📈 Monitoring & Analytics

### Statistik yang Tersedia
```javascript
const stats = getUserStats();
// Returns:
{
  totalUsers: 150,           // Total user terdaftar
  usersWithPhone: 145,       // User dengan nomor HP
  usersWithoutPhone: 5,      // User tanpa HP
  registrationRate: "96.7"   // % user lengkap data
}
```

### Export untuk Analisis
- Download CSV → Import ke Excel/Google Sheets
- Lihat trend registrasi
- Analisis demografi (jika perlu tambah data)
- Track response rate broadcast

---

## 🛠️ Troubleshooting

### "Nomor telepon sudah terdaftar"
**Penyebab:** Nomor sudah digunakan akun lain
**Solusi:**
- Gunakan nomor lain
- Atau hubungi admin untuk reset

### "Nomor telepon tidak valid"
**Penyebab:** Format tidak sesuai
**Solusi:**
- Harus 10-15 digit angka
- Contoh valid: `08123456789`, `+628123456789`
- Hapus spasi, tanda kurung, dash saat input

### Export CSV tidak jalan
**Penyebab:** Browser block download otomatis
**Solusi:**
- Allow downloads di browser settings
- Atau klik manual jika ada popup

### Copy ke clipboard gagal
**Penyebab:** Browser permissions
**Solusi:**
- Allow clipboard access
- Atau gunakan export CSV sebagai alternatif

---

## 📁 File & Code Reference

### File Utama
```
src/
├── pages/
│   ├── Register.tsx          # Form registrasi dengan validasi HP
│   ├── Profile.tsx           # Edit/Hapus nomor HP
│   └── BroadcastManager.tsx  # Dashboard broadcast admin
├── lib/
│   └── userBroadcast.ts      # Utility functions
└── App.tsx                   # Route /admin/broadcast
```

### API Functions
```typescript
// Import
import {
  getAllUsers,
  getBroadcastContacts,
  downloadContactsCSV,
  copyPhonestoClipboard,
  getUserStats,
  formatPhoneDisplay
} from '@/lib/userBroadcast';

// Usage
const contacts = getBroadcastContacts();
const stats = getUserStats();
downloadContactsCSV();
await copyPhonestoClipboard();
```

---

## 🚦 Testing

### Test Registrasi
1. Buka `/register`
2. Coba daftar tanpa nomor HP → harus error
3. Coba nomor invalid (< 10 digit) → harus error
4. Coba nomor yang sama 2x → harus error kedua kali
5. Registrasi sukses → cek data tersimpan

### Test Broadcast Manager
1. Buka `/admin/broadcast`
2. Cek statistik benar
3. Download CSV → cek isi file
4. Copy nomor → paste di notepad, cek format
5. Search user → cek filtering works
6. Klik nomor HP → harus buka WhatsApp Web

---

## 📞 Support

**Untuk Pertanyaan:**
- Email: puskesmas.desawori@gmail.com
- WhatsApp: +62 896-5739-8733
- Website: ViralCare AIDE

---

## 🎓 Untuk Pengembangan Lebih Lanjut

### Integrasi WhatsApp Business API
Lihat file: `WHATSAPP_INTEGRATION.md` (jika tersedia)

### Fitur yang Bisa Ditambahkan
- 🔔 Scheduled broadcast (cron jobs)
- 📊 Analytics dashboard (open rate, click rate)
- 🎯 Segmentasi user (by lokasi, usia, dll)
- 📝 Template message library
- 🤖 Auto-reply bot
- 📈 A/B testing broadcast
- 🗄️ Backend database (bukan localStorage)

---

**Dokumentasi ini untuk ViralCare AIDE - Puskesmas Wori Online**
Version 1.0 - November 2025
