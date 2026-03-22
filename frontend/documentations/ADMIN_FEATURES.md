# 🔐 Fitur Admin Puskesmas Wori Online

## 📋 Deskripsi

Sistem administrasi lengkap untuk mengelola website Puskesmas Wori Online, termasuk pengelolaan pasien, monitoring aktivitas, dan broadcast informasi kesehatan.

---

## ✨ Fitur Utama Admin

### 1. **Dashboard Admin** 📊
Dashboard komprehensif dengan overview semua aktivitas website.

**Akses:** `/admin/dashboard`

**Fitur:**
- 📈 Statistik real-time:
  - Total Pasien
  - Total Konsultasi
  - Artikel Dibaca
  - Pasien Aktif Hari Ini
  - Pasien dengan Nomor HP
  - Rata-rata Konsultasi per Pasien
  - Pendaftar Baru Minggu Ini
- ⚡ Quick Actions:
  - Kelola Pasien
  - Broadcast WhatsApp
  - Tambah Admin Baru
- 📝 Aktivitas Terbaru:
  - 10 pasien terakhir yang aktif
  - Detail konsultasi dan artikel dibaca
  - Timestamp aktivitas

### 2. **Kelola Pasien** 👥
Manajemen komplet data pasien yang terdaftar.

**Akses:** `/admin/patients`

**Fitur:**
- 🔍 **Pencarian:**
  - Berdasarkan nama
  - Berdasarkan email
  - Berdasarkan nomor HP
  
- 🎯 **Filter:**
  - Semua Pasien
  - Dengan Nomor HP
  - Aktif Hari Ini
  - Pendaftar Baru (7 hari terakhir)
  
- 📊 **Tabel Pasien:**
  - Foto profil
  - Nama & Email
  - Nomor HP
  - Tanggal Daftar
  - Statistik Aktivitas (Konsultasi, Artikel, Hari Aktif)
  
- 👁️ **Detail Pasien:**
  - Informasi lengkap pasien
  - Statistik aktivitas detail
  - Daftar artikel yang dibaca
  - Terakhir aktif
  - Chat WhatsApp langsung
  - Hapus pasien
  
- 📥 **Export Data:**
  - Download CSV semua pasien
  - Lengkap dengan statistik

### 3. **Registrasi Admin Baru** ➕
Sistem aman untuk menambah admin/petugas kesehatan baru.

**Akses:** `/admin/register`

**Fitur:**
- 🔐 **Kode Akses Khusus:**
  - Validasi kode akses sebelum registrasi
  - Kode: `PUSKESMAS2025ADMIN`
  - Hanya diketahui super admin
  
- 📝 **Form Registrasi:**
  - Nama Lengkap
  - Email
  - Nomor Telepon/WhatsApp
  - Password (min 6 karakter)
  - Konfirmasi Password
  
- ✅ **Validasi:**
  - Email valid & unique
  - Nomor HP valid & unique
  - Password match
  - Auto role "nurse"

### 4. **Broadcast WhatsApp** 📢
(Existing feature - sudah ada sebelumnya)

**Akses:** `/admin/broadcast`

**Fitur:**
- Lihat semua pasien dengan nomor HP
- Export nomor untuk broadcast
- Copy nomor ke clipboard
- Statistik kontak

---

## 🔑 Akses Admin

### Cara Login sebagai Admin

1. **Buka halaman Login** (`/login`)
2. **Pilih "Login sebagai Admin"**
3. **Masukkan kredensial admin:**
   - Email admin yang sudah terdaftar
   - Password admin
4. **Klik Login**

### Role Admin
- **Role name:** `nurse` (petugas kesehatan)
- **Permissions:**
  - Akses Dashboard Admin
  - Kelola Pasien
  - Broadcast WhatsApp
  - Tambah Admin Baru
  - Semua fitur pasien regular

---

## 🔐 Kode Akses Admin

### Kode Registrasi Admin Baru

```
PUSKESMAS2025ADMIN
```

**⚠️ PENTING:**
- Jangan bagikan kode ini ke sembarang orang
- Hanya untuk keperluan registrasi admin resmi
- Ubah kode di source code jika diperlukan

**Lokasi kode di source:**
```typescript
// File: src/pages/AdminRegister.tsx
const ADMIN_ACCESS_CODE = 'PUSKESMAS2025ADMIN';
```

---

## 👤 Akun Admin Default

Untuk testing, Anda perlu membuat akun admin pertama secara manual:

### Cara Membuat Admin Pertama

**Opsi 1: Via Browser Console**
```javascript
// Buka DevTools (F12) → Console
const users = JSON.parse(localStorage.getItem('users') || '[]');

// Password: "admin123" (sudah di-hash)
const adminUser = {
  email: "admin@puskesmaswori.id",
  name: "Admin Puskesmas",
  phone: "6289657398733",
  password: "$2a$10$YourHashedPasswordHere", // Ganti dengan hash password
  createdAt: new Date().toISOString(),
  role: "nurse"
};

users.push(adminUser);
localStorage.setItem('users', JSON.stringify(users));
console.log('✅ Admin berhasil ditambahkan!');
```

**Opsi 2: Registrasi Manual**
1. Daftar akun biasa via `/register`
2. Buka DevTools → Application → Local Storage
3. Edit `users` → Ubah role dari "patient" menjadi "nurse"
4. Refresh halaman
5. Login ulang sebagai admin

---

## 📱 Menu Admin di Sidebar

Saat login sebagai admin, menu khusus akan muncul di sidebar:

```
Menu Admin (Section Header)
├── 📊 Dashboard Admin     → /admin/dashboard
├── 👥 Kelola Pasien      → /admin/patients
├── 📢 Broadcast WhatsApp → /admin/broadcast
└── ➕ Tambah Admin       → /admin/register
```

---

## 🎯 Use Cases

### Use Case 1: Monitoring Pasien
```
1. Admin login
2. Buka Dashboard Admin
3. Lihat statistik total pasien & aktivitas
4. Cek pasien aktif hari ini
5. Monitor trend konsultasi
```

### Use Case 2: Mencari Pasien Spesifik
```
1. Admin login
2. Buka Kelola Pasien
3. Ketik nama/email di search
4. Klik "Lihat Detail"
5. Lihat semua aktivitas pasien
6. Chat via WhatsApp jika perlu
```

### Use Case 3: Export Data Pasien
```
1. Admin login
2. Buka Kelola Pasien
3. (Opsional) Terapkan filter
4. Klik "Export CSV"
5. File CSV otomatis terdownload
6. Buka di Excel/Google Sheets
```

### Use Case 4: Menambah Admin Baru
```
1. Admin login
2. Buka Tambah Admin
3. Masukkan kode akses: PUSKESMAS2025ADMIN
4. Isi form registrasi admin baru
5. Klik "Daftarkan Admin"
6. Admin baru siap login
```

### Use Case 5: Broadcast Informasi
```
1. Admin login
2. Buka Broadcast WhatsApp
3. Lihat daftar pasien dengan HP
4. Download CSV atau Copy nomor
5. Buka WhatsApp Business
6. Import kontak & broadcast
```

---

## 🔒 Keamanan

### Protected Routes
Semua halaman admin dilindungi dengan `ProtectedRoute`:
```typescript
<ProtectedRoute allow={["nurse"]}>
  <AdminDashboard />
</ProtectedRoute>
```

### Role Check
- Otomatis redirect jika bukan admin
- Cek role di localStorage
- Validasi di setiap halaman admin

### Access Code
- Kode akses untuk registrasi admin
- Wajib valid sebelum bisa daftar
- Dapat diubah di source code

### Data Privacy
- Admin hanya lihat data pasien (non-admin)
- Password ter-hash (bcrypt)
- Data di localStorage (bisa migrasi ke backend)

---

## 📊 Data & Storage

### LocalStorage Keys

```javascript
'users' → Array semua user (patient + nurse)
'user' → User yang sedang login (session)
'userActivities' → Aktivitas tracking semua user
```

### User Data Structure
```typescript
{
  email: "user@example.com",
  name: "Nama User",
  phone: "08123456789",
  password: "hashed_password",
  profileImage: "base64_data",
  createdAt: "2025-11-01T10:00:00.000Z",
  role: "patient" | "nurse"
}
```

### Activity Data Structure
```typescript
{
  email: "user@example.com",
  consultationCount: 5,
  articlesRead: ["COVID-19", "Influenza"],
  activeDays: ["2025-11-01", "2025-11-02"],
  lastUpdated: "2025-11-01T10:00:00.000Z"
}
```

---

## 🛠️ Troubleshooting

### Menu admin tidak muncul?
**Solusi:**
- Cek role user di localStorage `user`
- Pastikan role = "nurse"
- Logout dan login ulang
- Clear cache browser

### Tidak bisa akses halaman admin?
**Solusi:**
- Login sebagai admin (pilih "Login sebagai Admin")
- Cek URL role requirement
- Buka DevTools → Console untuk error

### Kode akses ditolak?
**Solusi:**
- Pastikan kode: `PUSKESMAS2025ADMIN`
- Case-sensitive!
- Tidak ada spasi
- Cek kode di source jika diubah

### Data pasien tidak muncul?
**Solusi:**
- Refresh halaman
- Cek localStorage `users`
- Pastikan ada user dengan role "patient"
- Clear cache dan coba lagi

### Export CSV kosong?
**Solusi:**
- Pastikan ada pasien di list
- Cek filter yang aktif
- Reset filter ke "Semua Pasien"

---

## 📈 Metrics yang Ditampilkan

### Dashboard Metrics
1. **Total Pasien**: Semua user role "patient"
2. **Total Konsultasi**: Sum consultationCount semua pasien
3. **Artikel Dibaca**: Sum articlesRead.length semua pasien
4. **Aktif Hari Ini**: Pasien dengan activeDays hari ini
5. **Pasien dengan HP**: Pasien yang phone !== null
6. **Rata-rata Konsultasi**: totalConsultations / totalPatients
7. **Pendaftar Baru**: Pasien createdAt dalam 7 hari terakhir

### Patient Metrics (Detail)
1. **Jumlah Konsultasi**: consultationCount
2. **Artikel Dibaca**: articlesRead.length
3. **Hari Aktif**: activeDays.length
4. **Daftar Artikel**: Array articlesRead
5. **Terakhir Aktif**: lastUpdated timestamp

---

## 🔄 Workflow Admin

### Daily Workflow
```
08:00 - Login sebagai admin
08:05 - Cek Dashboard → Lihat pasien aktif hari ini
08:10 - Review aktivitas baru
08:30 - Respond to high consultation users
12:00 - Export data untuk laporan bulanan
16:00 - Broadcast info kesehatan ke pasien
17:00 - Logout
```

### Weekly Workflow
```
Senin - Review pendaftar baru minggu ini
Rabu - Export data pasien untuk analisis
Jumat - Broadcast tips kesehatan mingguan
```

### Monthly Workflow
```
Awal Bulan - Export semua data pasien
Pertengahan - Review engagement metrics
Akhir Bulan - Laporan bulanan ke supervisor
```

---

## 🎓 Best Practices

### Untuk Admin
1. ✅ Login dengan akun admin official
2. ✅ Jaga kerahasiaan kode akses
3. ✅ Backup data secara berkala (export CSV)
4. ✅ Monitor aktivitas pasien rutin
5. ✅ Respond to pasien dengan banyak konsultasi
6. ✅ Broadcast info kesehatan berkala
7. ✅ Jaga privacy data pasien
8. ❌ Jangan bagikan kode akses sembarangan
9. ❌ Jangan hapus pasien tanpa alasan kuat
10. ❌ Jangan export data untuk tujuan diluar official

### Untuk Pengembangan
1. ✅ Ubah ADMIN_ACCESS_CODE secara berkala
2. ✅ Migrate dari localStorage ke backend (production)
3. ✅ Tambahkan audit log untuk aksi admin
4. ✅ Implementasi role hierarchy (super admin, admin, nurse)
5. ✅ Tambahkan email notification untuk admin actions
6. ✅ Rate limiting untuk prevent abuse
7. ✅ 2FA untuk login admin

---

## 📞 Support & Contact

### Untuk Pertanyaan Admin
- Email: admin@puskesmaswori.id
- WhatsApp: +62 896-5739-8733
- Office Hours: Senin-Jumat, 08:00-16:00

### Untuk Technical Issues
- Contact Developer
- Open issue di repository
- Check documentation

---

## 📝 Changelog

### Version 1.0 (2025-11-01)
- ✅ Dashboard Admin dengan real-time statistics
- ✅ Patient Management dengan search & filter
- ✅ Admin Registration dengan access code
- ✅ Patient Detail Modal
- ✅ Export to CSV
- ✅ WhatsApp integration
- ✅ Role-based access control
- ✅ Activity tracking integration
- ✅ Admin menu di sidebar
- ✅ Protected routes
- ✅ Full documentation

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Super admin role
- [ ] Audit log system
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Patient communication history
- [ ] Appointment scheduling
- [ ] Multi-admin collaboration
- [ ] Backend API integration
- [ ] Real database (MongoDB/PostgreSQL)
- [ ] Cloud storage for images
- [ ] Mobile responsive improvements
- [ ] Push notifications
- [ ] 2FA authentication
- [ ] Advanced reporting
- [ ] Data backup automation

---

**Sistem Admin Puskesmas Wori Online - Lengkap & Aman! 🔐✨**
