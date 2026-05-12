# Panduan Fitur Broadcast Personal WhatsApp

## Overview
Fitur Broadcast Personal memungkinkan Kepala Puskesmas dan Admin IT Manager mengirim pesan WhatsApp personal kepada pasien/kontak secara individual melalui Fonnte Gateway.

## Akses & Peran
- **Kepala Puskesmas**: Dapat mengakses seluruh fitur broadcast (massal dan personal)
- **Admin IT Manager**: Dapat mengakses seluruh fitur broadcast (massal dan personal)  
- **Tenaga Medis (Nurse)**: Hanya dapat melihat riwayat broadcast (read-only)
- **Pasien**: Tidak memiliki akses ke halaman ini

## Cara Menggunakan Fitur Broadcast Personal

### 1. Navigasi ke Halaman Broadcast
- Login sebagai **Kepala Puskesmas** atau **Admin IT Manager**
- Klik menu **"WA Gateway"** di dropdown profil (desktop) atau sidebar
- Atau navigasi ke `/admin/broadcast`

### 2. Buka Tab "Kirim Personal"
- Di halaman Broadcast Manager, klik tab **"Kirim Personal"**
- Atau, dari tab **"Daftar Kontak"**, klik tombol **"Kirim"** di baris kontak yang dituju

### 3. Isi Form Pengiriman
Saat form "Kirim Pesan Personal" terbuka:

**a. Pilih Penerima**
- Dropdown menampilkan daftar semua pasien/kontak yang terdaftar
- Pilih nama dan nomor WhatsApp yang ingin menerima pesan

**b. Informasi Penerima** (Read-only, ditampilkan otomatis)
- Nama lengkap penerima
- Nomor WhatsApp (format: +62 XXX-XXXX-XXXX)
- Email penerima

**c. Tulis Pesan**
- Textarea untuk menuliskan isi pesan
- **Gunakan `{name}`** dalam pesan untuk menyisipkan nama penerima secara otomatis
  - Contoh: `"Halo {name}, jangan lupa jadwal imunisasi Anda minggu ini."`
  - Hasilnya: `"Halo John Doe, jangan lupa jadwal imunisasi Anda minggu ini."`

### 4. Kirim Pesan
- Tekan tombol **"Kirim Pesan"** (berwarna hijau)
- Sistem akan:
  1. Mengirim pesan ke Fonnte Gateway
  2. Menampilkan status pengiriman (berhasil atau gagal)
  3. Mencatat dalam riwayat broadcast untuk audit trail

### 5. Verifikasi Pengiriman
- Pesan yang berhasil ditandai dengan **✓ Terkirim** (hijau)
- Pesan yang gagal ditandai dengan **✗ Gagal** (merah) beserta alasan
- Cek tab **"Riwayat Kirim"** untuk melihat log lengkap semua pengiriman

## Format Nomor Telepon yang Diterima
Sistem secara otomatis menormalisasi nomor telepon. Format yang diterima:
- ✅ `08123456789` (Indonesia standard)
- ✅ `628123456789` (format 62)
- ✅ `+628123456789` (format internasional)
- ✅ `6281234567` (tanpa leading 0)
- ❌ `+1234567890` (negara lain - akan ditolak)

## Persyaratan Fonnte Gateway
Untuk fitur ini berfungsi:

1. **Token Fonnte harus dikonfigurasi** di file `.env`:
   ```
   FONNTE_TOKEN=your_fonnte_token_here
   ```

2. **Device Fonnte harus terhubung**:
   - Status ditampilkan di atas halaman broadcast
   - Jika offline, pesan akan diantrekan dan dikirim saat device kembali online

3. **Dapatkan Token Fonnte**:
   - Kunjungi: https://md.fonnte.com
   - Login dengan akun Fonnte Anda
   - Navigasi ke **Devices** → Salin **Token**
   - Tambahkan ke `.env` dan restart aplikasi

## Template Pesan Rekomendasi

### Pemberitahuan Jadwal
```
Halo {name}!

Ini pemberitahuan dari Puskesmas Wori.
Mohon hadir sesuai jadwal yang telah ditentukan.

Terima kasih.
- Tim Puskesmas Wori
```

### Imunisasi Anak
```
Halo {name}!

Jangan lupa jadwal imunisasi anak Anda di Puskesmas Wori.
Pastikan membawa buku KIA.

Info lebih lanjut: https://woricare.online

- Tim Puskesmas Wori
```

### Pengingat Kunjungan
```
Halo {name}!

Kami ingin mengingatkan Anda bahwa jadwal pemeriksaan kesehatan Anda sudah tiba.
Silakan datang ke Puskesmas Wori pada waktu yang telah disepakati.

Terima kasih atas kepercayaan Anda.
```

## Riwayat & Audit Trail

### Melihat Riwayat Pengiriman
1. Buka tab **"Riwayat Kirim"**
2. Daftar menampilkan:
   - Status (Terkirim/Gagal/Sebagian)
   - Tanggal dan waktu pengiriman
   - Isi pesan (preview)
   - Jumlah penerima dan status pengiriman

### Informasi yang Dicatat
- Admin/Kepala yang melakukan pengiriman
- Pesan yang dikirim
- Nomor penerima
- Status (sukses/gagal)
- Waktu pengiriman

## Batasan & Kebijakan

### Batasan Teknis
- **Panjang pesan**: Maksimal 60.000 karakter (WhatsApp: ~4.096 karakter per pesan, sistem akan memotong)
- **Frekuensi**: Delay 2-5 detik antar pesan (built-in untuk hindari spam/blokir)
- **Jumlah kontak**: Unlimited (tergantung quota Fonnte)

### Kebijakan Penggunaan
- ✅ Gunakan untuk informasi kesehatan penting
- ✅ Berikan opsi opt-out dalam pesan
- ✅ Hormati jadwal (hindari malam hari)
- ❌ Jangan gunakan untuk spam atau marketing
- ❌ Jangan bagikan data kontak ke pihak ketiga
- ❌ Jangan kirim pesan promosi/komersial

## Troubleshooting

### Tombol "Kirim Pesan" Disabled (Abu-abu)
**Penyebab**: Salah satu dari kondisi berikut:
1. Kontak belum dipilih
2. Pesan masih kosong
3. Fonnte Gateway belum dikonfigurasi
4. Device Fonnte sedang offline

**Solusi**: 
- Pastikan semua field terisi
- Cek status Fonnte (hijau = siap)
- Tunggu device Fonnte online kembali

### Pesan Gagal Terkirim
**Pesan error mungkin**:
- "Nomor telepon tidak valid" → Check format nomor
- "Device offline" → Tunggu device Fonnte menyala
- "Quota habis" → Upgrade paket Fonnte

**Solusi**:
- Verifikasi nomor telepon penerima
- Pastikan device Fonnte aktif
- Check sisa quota di Fonnte Dashboard

### Kontak Tidak Muncul di Dropdown
**Penyebab**: Kontak tidak memiliki nomor WhatsApp

**Solusi**:
- Pastikan pasien sudah mengisi nomor WhatsApp di profil
- Nomor harus valid dan aktif (10-15 digit)

## Security & Privacy

- ✅ Hanya staff (Head/Admin) yang dapat mengirim
- ✅ Setiap pengiriman dicatat untuk audit trail
- ✅ Kontak pasien hanya digunakan untuk broadcast kesehatan
- ✅ Token Fonnte disimpan di `.env` (tidak di kode)
- ✅ Data respons Fonnte tidak disimpan secara penuh

## API Endpoints (Developer)

### Send Individual Message
```
POST /api/fonnte/send-individual

Headers:
- Authorization: (session-based)

Body:
{
  "phone": "08123456789",
  "message": "Halo {name}!",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "detail": "Pesan terkirim"
}
```

### Get Broadcast Logs
```
GET /api/fonnte/logs?limit=30

Response:
{
  "logs": [
    {
      "id": 1,
      "adminEmail": "admin@puskesmas.local",
      "message": "...",
      "recipientCount": 100,
      "successCount": 98,
      "failCount": 2,
      "status": "partial",
      "createdAt": "2026-05-01T14:30:00Z"
    }
  ]
}
```

## FAQ

**Q: Apakah pesan dapat dikirimi ke grup WhatsApp?**
A: Tidak, hanya ke nomor individual (1:1 chat).

**Q: Berapa lama pesan sampai?**
A: Biasanya 1-5 detik, tergantung koneksi Fonnte device.

**Q: Apakah bisa membatalkan pesan yang sudah dikirim?**
A: Tidak, sekali dikirim ke Fonnte tidak bisa dibatalkan.

**Q: Apakah saya bisa schedule pesan untuk nanti?**
A: Fitur ini belum tersedia. Pengiriman bersifat real-time.

**Q: Apakah ada batasan jumlah pesan per hari?**
A: Tergantung paket Fonnte yang digunakan. Check di https://md.fonnte.com.

---

**Terakhir diperbarui**: 1 Mei 2026
**Versi**: 1.0
