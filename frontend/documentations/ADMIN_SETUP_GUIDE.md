# 🚀 Quick Start: Setup Admin Pertama

## Cara Membuat Akun Admin Pertama

Karena registrasi admin memerlukan admin yang sudah login untuk mengakses `/admin/register`, Anda perlu membuat admin pertama secara manual.

### Metode 1: Via Browser Console (Recommended)

1. **Buka website** di browser
2. **Tekan F12** untuk membuka DevTools
3. **Pilih tab Console**
4. **Copy-paste script berikut:**

```javascript
// Hash password "admin123" untuk admin pertama
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createFirstAdmin() {
  const hashedPassword = await hashPassword('admin123');
  
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  
  const firstAdmin = {
    email: "admin@puskesmaswori.id",
    name: "Admin Puskesmas Wori",
    phone: "6289657398733",
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    role: "nurse",
    profileImage: ""
  };
  
  // Cek apakah admin sudah ada
  const adminExists = users.some(u => u.email === firstAdmin.email);
  if (adminExists) {
    console.log('❌ Admin sudah ada!');
    return;
  }
  
  users.push(firstAdmin);
  localStorage.setItem('users', JSON.stringify(users));
  
  console.log('✅ Admin pertama berhasil dibuat!');
  console.log('📧 Email: admin@puskesmaswori.id');
  console.log('🔑 Password: admin123');
  console.log('');
  console.log('Silakan login dengan kredensial di atas.');
}

createFirstAdmin();
```

5. **Tekan Enter**
6. **Refresh halaman**
7. **Login dengan:**
   - Email: `admin@puskesmaswori.id`
   - Password: `admin123`
   - Pilih: **"Login sebagai Admin"**

---

### Metode 2: Via Register + Edit LocalStorage

1. **Daftar akun biasa** via `/register`:
   - Nama: Admin Puskesmas Wori
   - Email: admin@puskesmaswori.id
   - HP: 08123456789
   - Password: admin123

2. **Jangan logout!** Tetap di website

3. **Buka DevTools (F12)** → Tab **Application**

4. **Klik "Local Storage"** → Pilih domain website Anda

5. **Klik key `users`**

6. **Edit JSON:**
   - Cari user dengan email yang baru didaftar
   - Ubah `"role": "patient"` menjadi `"role": "nurse"`

7. **Klik ✅ (checkmark)** untuk save

8. **Refresh halaman**

9. **Logout dan Login ulang** sebagai admin

---

### Metode 3: Langsung Edit LocalStorage

1. **Buka website**
2. **Tekan F12** → Tab **Application**
3. **Local Storage** → Domain website
4. **Klik key `users`**
5. **Jika kosong, paste ini:**

```json
[
  {
    "email": "admin@puskesmaswori.id",
    "name": "Admin Puskesmas Wori",
    "phone": "6289657398733",
    "password": "5f4dcc3b5aa765d61d8327deb882cf99",
    "createdAt": "2025-11-01T10:00:00.000Z",
    "role": "nurse",
    "profileImage": ""
  }
]
```

6. **Save (✅ checkmark)**
7. **Refresh halaman**
8. **Login:**
   - Email: `admin@puskesmaswori.id`
   - Password: `password` (sesuai hash di atas)

---

## ✅ Verifikasi Admin Berhasil

Setelah login sebagai admin, Anda harus melihat:

1. ✅ **Menu "Menu Admin"** di sidebar kiri:
   - 📊 Dashboard Admin
   - 👥 Kelola Pasien
   - 📢 Broadcast WhatsApp
   - ➕ Tambah Admin

2. ✅ **Akses ke halaman:**
   - `/admin/dashboard` - berhasil
   - `/admin/patients` - berhasil
   - `/admin/broadcast` - berhasil
   - `/admin/register` - berhasil

3. ❌ **Jika gagal:**
   - Cek localStorage `user` → pastikan `role: "nurse"`
   - Logout dan login ulang
   - Clear cache browser
   - Ulangi metode di atas

---

## 🔐 Kode Akses Admin

Untuk mendaftarkan admin baru via `/admin/register`, gunakan kode akses ini:

```
PUSKESMAS2025ADMIN
```

**Catatan:** Kode ini diperlukan SETELAH login sebagai admin.

---

## 📝 Kredensial Admin Pertama

```
Email    : admin@puskesmaswori.id
Password : admin123
Role     : nurse
```

**⚠️ PENTING:** Ubah password setelah login pertama!

---

## 🎯 Next Steps

Setelah login sebagai admin:

1. ✅ **Ubah password** di halaman Profile
2. ✅ **Buka Dashboard Admin** untuk overview
3. ✅ **Tambah admin lain** via `/admin/register` (jika perlu)
4. ✅ **Coba fitur Kelola Pasien** untuk melihat data
5. ✅ **Setup Broadcast WhatsApp** untuk komunikasi

---

## 🆘 Troubleshooting

### "Menu admin tidak muncul setelah login"
- Cek localStorage → `user` → pastikan `role: "nurse"`
- Logout → Login ulang → Pilih "Login sebagai Admin"
- Hard refresh (Ctrl+Shift+R)

### "Tidak bisa akses /admin/dashboard"
- Pastikan sudah login
- Pastikan role = "nurse"
- Cek console untuk error
- Buka `/login` → Login sebagai admin

### "Password salah terus"
- Gunakan Metode 1 (Console script) yang pasti work
- Atau reset password via edit localStorage
- Atau buat akun baru dan ubah rolenya

---

**Admin siap digunakan! 🎉**
