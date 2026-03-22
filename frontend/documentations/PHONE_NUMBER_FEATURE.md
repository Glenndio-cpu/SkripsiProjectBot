# Fitur Nomor Telepon

## Deskripsi
Fitur ini memungkinkan pengguna untuk mendaftarkan nomor telepon mereka saat registrasi. Satu nomor telepon hanya dapat digunakan untuk satu akun.

## Fitur Utama

### 1. **Registrasi dengan Nomor Telepon**
- Field nomor telepon **wajib** diisi saat registrasi
- Validasi format: 10-15 digit angka
- Satu nomor hanya bisa digunakan untuk satu akun
- Format yang diterima: `08123456789` atau `+628123456789`

### 2. **Login dengan Email atau Nomor Telepon**
- User dapat login menggunakan:
  - Email: `nama@email.com`
  - Nomor telepon: `08123456789` atau `+628123456789`
- Sistem otomatis mendeteksi apakah input adalah email atau nomor telepon

### 3. **Manajemen Nomor Telepon di Profile**
- **Lihat nomor telepon** yang terdaftar
- **Edit nomor telepon** ke nomor lain (dengan validasi keunikan)
- **Lepas nomor telepon** dari akun dengan tombol "Lepas"
  - Konfirmasi diperlukan sebelum melepas nomor
  - Setelah dilepas, nomor bisa digunakan untuk akun lain

### 4. **Tampilan Nomor Telepon**
- Ditampilkan di halaman Profile
- Ditampilkan di Sidebar (mobile menu) jika sudah login
- Icon telepon 📞 untuk indikasi visual

## Struktur Data

### User Object
```json
{
  "email": "user@example.com",
  "name": "Nama User",
  "phone": "08123456789",
  "password": "hashed_password",
  "profileImage": "base64_image_data",
  "createdAt": "2025-11-01T10:00:00.000Z"
}
```

### localStorage Keys
- `user` - Data user yang sedang login (session)
- `users` - Array semua user yang terdaftar

## Validasi

### Saat Registrasi
1. Nomor telepon wajib diisi
2. Format: 10-15 digit angka (spasi, tanda kurung, dan dash akan dibersihkan)
3. Cek duplikasi: nomor tidak boleh sudah terdaftar

### Saat Update di Profile
1. Format yang sama seperti registrasi
2. Cek duplikasi: nomor tidak boleh digunakan akun lain
3. Boleh kosong (opsional) jika user ingin melepas nomor

### Saat Login
1. Sistem mendeteksi input berisi angka = nomor telepon
2. Sistem mendeteksi input berisi @ = email
3. Nomor dibersihkan dari spasi dan karakter khusus sebelum pencocokan

## File yang Dimodifikasi

1. **src/pages/Register.tsx**
   - Tambah field `phone` di form
   - Validasi nomor telepon
   - Cek duplikasi nomor saat registrasi

2. **src/pages/Login.tsx**
   - Ubah field `email` menjadi `identifier`
   - Support login dengan email atau nomor
   - Deteksi otomatis tipe input

3. **src/pages/Profile.tsx**
   - Tambah field phone di form edit
   - Fungsi `handleRemovePhone()` untuk melepas nomor
   - Validasi nomor saat update
   - Tampilkan nomor di profile info

4. **src/components/layout/Header.tsx**
   - Update type definition untuk include `phone`

5. **src/components/layout/Sidebar.tsx**
   - Tampilkan nomor telepon di user info section
   - Update type definition untuk include `phone`

## Cara Penggunaan

### Registrasi Akun Baru
1. Buka halaman `/register`
2. Isi form:
   - Nama Lengkap
   - Email
   - **Nomor Telepon** (contoh: 08123456789)
   - Password
   - Konfirmasi Password
3. Klik "Daftar"

### Login
1. Buka halaman `/login`
2. Masukkan Email **ATAU** Nomor Telepon
3. Masukkan Password
4. Klik "Masuk"

### Melepas Nomor Telepon
1. Login ke akun
2. Buka halaman `/profile`
3. Klik "Edit Profil"
4. Klik tombol merah "Lepas" di sebelah nomor telepon
5. Konfirmasi dengan klik "OK"
6. Nomor berhasil dilepas dan bisa digunakan akun lain

### Mengganti Nomor Telepon
1. Login ke akun
2. Buka halaman `/profile`
3. Klik "Edit Profil"
4. Ubah nomor telepon ke nomor baru
5. Klik "Simpan"
6. Sistem akan validasi:
   - Format nomor valid
   - Nomor belum digunakan akun lain

## Keamanan

1. **Password Hashing**: Password disimpan dengan SHA-256 hash
2. **Validasi Unik**: Setiap nomor telepon hanya untuk satu akun
3. **Normalisasi Input**: Nomor dibersihkan dari karakter non-angka
4. **Session Management**: Data sensitif (password) tidak disimpan di session

## Catatan Pengembangan

### Untuk Production
Saat memindahkan ke production dengan backend:

1. Gunakan database relational (PostgreSQL/MySQL)
2. Ganti SHA-256 dengan bcrypt atau argon2 untuk password hashing
3. Tambahkan verifikasi OTP untuk validasi nomor telepon
4. Implementasi rate limiting untuk prevent brute force
5. Gunakan JWT untuk session management
6. Tambahkan field `phoneVerified` (boolean)
7. Implementasi SMS verification untuk verifikasi nomor

### Integrasi WhatsApp (Opsional)
Nomor telepon ini bisa digunakan untuk:
- Notifikasi WhatsApp reminder
- Broadcast informasi kesehatan
- Konfirmasi janji konsultasi
- OTP verification

Lihat dokumentasi lengkap integrasi WhatsApp di file terpisah.

## Troubleshooting

### "Nomor telepon sudah terdaftar"
- Nomor sudah digunakan akun lain
- Solusi: Gunakan nomor lain atau lepas nomor dari akun lama

### Login gagal dengan nomor telepon
- Pastikan format nomor sama dengan saat registrasi
- Coba login dengan email sebagai alternatif
- Pastikan tidak ada spasi di awal/akhir input

### Tidak bisa melepas nomor
- Pastikan sudah klik "Edit Profil" terlebih dahulu
- Tombol "Lepas" hanya muncul jika nomor sudah terdaftar

## Support

Untuk pertanyaan atau issue:
- Buka GitHub Issues di repository ini
- Kontak: puskesmas.desawori@gmail.com
- WhatsApp: +62 896-5739-8733
