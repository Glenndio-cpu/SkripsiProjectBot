# Fitur Tracking Aktivitas User Otomatis

## 📊 Deskripsi

Sistem tracking aktivitas user yang **otomatis** mendeteksi dan mencatat:
- **Jumlah Konsultasi**: Berapa kali user melakukan chat konsultasi kesehatan
- **Artikel Dibaca**: Berapa artikel penyakit yang sudah dibaca (tidak duplikat)
- **Hari Aktif**: Berapa hari user aktif menggunakan website

Semua data ditampilkan secara **real-time** di halaman Profile user.

---

## ✨ Fitur Utama

### 1. **Tracking Konsultasi** 💬
- Otomatis menghitung setiap kali user mengirim pesan di chatbot (halaman Konsultasi atau floating AI Assistant)
- Hanya dihitung untuk user yang sudah login
- Counter bertambah setiap ada interaksi dengan AI chatbot

### 2. **Tracking Artikel Dibaca** 📖
- Otomatis mencatat ketika user mengklik card penyakit di halaman Penyakit
- Menggunakan nama penyakit sebagai unique identifier
- **Tidak ada duplikasi**: Jika artikel yang sama diklik lagi, tidak dihitung ulang
- Total artikel dibaca = jumlah artikel unik yang pernah diklik

### 3. **Tracking Hari Aktif** 📅
- Otomatis mencatat setiap hari user mengunjungi website
- Tracking dilakukan setiap kali App.tsx di-load (setiap buka website)
- Format tanggal: YYYY-MM-DD
- **Tidak ada duplikasi**: Satu hari hanya dihitung sekali
- Total hari aktif = jumlah hari unik sejak pertama kali login

### 4. **Tampilan Real-time di Profile** 👤
- Statistics di halaman Profile menampilkan angka asli dari tracking
- Update otomatis setiap kali user membuka halaman Profile
- Menggantikan angka hardcode (5, 12, 3) dengan data real

---

## 🔧 Implementasi Teknis

### File yang Dibuat/Diubah

#### 1. **`src/lib/userActivityTracking.ts`** (Baru)
Service utama untuk tracking aktivitas user.

**Key Functions:**
```typescript
// Track satu konsultasi (increment count)
trackConsultation(): void

// Track artikel dibaca (unique, no duplicates)
trackArticleRead(articleId: string): void

// Track daily activity (unique date)
trackDailyActivity(): void

// Get statistics untuk current user
getUserStats(): UserStats

// Reset statistics (untuk testing)
resetUserStats(): void
```

**Data Structure:**
```typescript
interface UserActivity {
  email: string;              // User identifier
  consultationCount: number;  // Total konsultasi
  articlesRead: string[];     // Array artikel IDs (unique)
  activeDays: string[];       // Array tanggal YYYY-MM-DD (unique)
  lastUpdated: string;        // Timestamp terakhir update
}
```

**Storage:**
- localStorage key: `userActivities`
- Data disimpan per user (berdasarkan email)
- Format: Array of UserActivity objects

#### 2. **`src/pages/Konsultasi.tsx`**
Tracking konsultasi di halaman utama.

**Changes:**
```tsx
import { trackConsultation } from '../lib/userActivityTracking';

// Di dalam handleSendMessage, setelah AI response berhasil:
if (isUserLoggedIn) {
  trackConsultation();
}
```

#### 3. **`src/components/AIAssistant.tsx`**
Tracking konsultasi di floating chatbot.

**Changes:**
```tsx
import { trackConsultation } from '../lib/userActivityTracking';

// Di dalam handleSendMessage, setelah AI response berhasil:
if (isUserLoggedIn) {
  trackConsultation();
}
```

#### 4. **`src/pages/Penyakit.tsx`**
Tracking artikel yang dibaca.

**Changes:**
```tsx
import { trackArticleRead } from '../lib/userActivityTracking';

// Handler untuk tracking
const handleDiseaseClick = (diseaseName: string) => {
  trackArticleRead(diseaseName);
};

// Di disease card:
<div onClick={() => handleDiseaseClick(disease.name)}>
  {/* Card content */}
</div>
```

#### 5. **`src/App.tsx`**
Tracking daily activity di root level.

**Changes:**
```tsx
import { trackDailyActivity } from './lib/userActivityTracking';
import { useEffect } from 'react';

const App = () => {
  useEffect(() => {
    trackDailyActivity(); // Track setiap app load
  }, []);
  
  return (
    // ... routes
  );
};
```

#### 6. **`src/pages/Profile.tsx`**
Menampilkan statistics real-time.

**Changes:**
```tsx
import { getUserStats } from '../lib/userActivityTracking';

const [userStats, setUserStats] = useState({ 
  consultationCount: 0, 
  articlesReadCount: 0, 
  activeDaysCount: 0 
});

useEffect(() => {
  const stats = getUserStats();
  setUserStats(stats);
}, []);

// Di render:
<div className="text-3xl font-bold">{userStats.consultationCount}</div>
<div className="text-3xl font-bold">{userStats.articlesReadCount}</div>
<div className="text-3xl font-bold">{userStats.activeDaysCount}</div>
```

---

## 🎯 Cara Kerja

### Tracking Konsultasi

**Trigger:**
- User login → mengirim pesan di chatbot → AI response berhasil → `trackConsultation()` dipanggil

**Flow:**
1. Ambil email user dari localStorage `user`
2. Load data aktivitas user dari localStorage `userActivities`
3. Increment `consultationCount`
4. Simpan kembali ke localStorage

**Contoh:**
```javascript
// User1 melakukan 3x konsultasi:
{
  email: "user1@example.com",
  consultationCount: 3,  // ← otomatis increment
  articlesRead: [],
  activeDays: []
}
```

---

### Tracking Artikel Dibaca

**Trigger:**
- User klik card penyakit di halaman Penyakit → `trackArticleRead(disease.name)` dipanggil

**Flow:**
1. Ambil email user dari localStorage `user`
2. Load data aktivitas user
3. Cek apakah `articleId` sudah ada di array `articlesRead`
4. Jika belum ada → tambahkan ke array
5. Jika sudah ada → tidak ada perubahan (prevent duplicate)
6. Simpan kembali ke localStorage

**Contoh:**
```javascript
// User1 klik "COVID-19", "Influenza", lalu "COVID-19" lagi:
{
  email: "user1@example.com",
  consultationCount: 0,
  articlesRead: ["COVID-19", "Influenza"],  // ← COVID-19 tidak duplikat
  activeDays: []
}
```

---

### Tracking Hari Aktif

**Trigger:**
- User buka/refresh website → `App.tsx` load → `trackDailyActivity()` dipanggil

**Flow:**
1. Ambil email user dari localStorage `user`
2. Get tanggal hari ini (format: YYYY-MM-DD)
3. Load data aktivitas user
4. Cek apakah tanggal hari ini sudah ada di array `activeDays`
5. Jika belum ada → tambahkan ke array
6. Jika sudah ada → tidak ada perubahan (prevent duplicate)
7. Simpan kembali ke localStorage

**Contoh:**
```javascript
// User1 buka website pada 3 hari berbeda:
{
  email: "user1@example.com",
  consultationCount: 0,
  articlesRead: [],
  activeDays: ["2025-11-01", "2025-11-02", "2025-11-05"]  // ← 3 hari aktif
}
```

---

## 📱 Cara Penggunaan

### Untuk User

1. **Login** ke website
2. **Gunakan website seperti biasa**:
   - Chat dengan AI → konsultasi tercatat ✅
   - Klik card penyakit → artikel tercatat ✅
   - Buka website setiap hari → hari aktif tercatat ✅
3. **Lihat statistik** di halaman Profile (`/profile`)

### Untuk Developer

#### Reset Statistics (Testing)
```typescript
import { resetUserStats } from '@/lib/userActivityTracking';

// Reset stats untuk current user
resetUserStats();
```

#### Get All User Statistics (Admin/Debug)
```typescript
import { getAllUserStats } from '@/lib/userActivityTracking';

// Get semua data aktivitas
const allActivities = getAllUserStats();
console.log(allActivities);
```

---

## 🔒 Privacy & Storage

### Data yang Disimpan
```typescript
{
  email: "user@example.com",           // User identifier
  consultationCount: 5,                 // Total konsultasi
  articlesRead: ["COVID-19", "Flu"],   // Artikel unik
  activeDays: ["2025-11-01"],          // Tanggal aktif
  lastUpdated: "2025-11-01T10:00:00Z"  // Timestamp
}
```

### Privacy
- ✅ Data disimpan **lokal** (localStorage)
- ✅ Tidak dikirim ke server eksternal
- ✅ Per-user (isolated by email)
- ✅ User dapat reset sendiri (via resetUserStats)

### Storage Limit
- localStorage limit: ~5-10 MB per domain
- Estimasi data per user: ~1-2 KB
- Kapasitas: ribuan user tanpa masalah

---

## 🧪 Testing

### Test Manual

#### 1. Test Konsultasi
```
1. Login → buka /konsultasi
2. Kirim pesan "Apa gejala COVID-19?"
3. Tunggu AI response
4. Buka /profile → cek "Konsultasi" bertambah 1
5. Ulangi → setiap chat bertambah 1
```

#### 2. Test Artikel Dibaca
```
1. Login → buka /penyakit
2. Klik card "COVID-19"
3. Buka /profile → cek "Artikel Dibaca" = 1
4. Kembali → klik "COVID-19" lagi
5. Buka /profile → tetap 1 (tidak duplikat) ✅
6. Klik "Influenza"
7. Buka /profile → "Artikel Dibaca" = 2 ✅
```

#### 3. Test Hari Aktif
```
1. Login → buka website
2. Buka /profile → "Hari Aktif" = 1
3. Refresh halaman 10x
4. Buka /profile → tetap 1 (satu hari) ✅
5. Ubah system date ke besok (testing)
6. Buka website
7. Buka /profile → "Hari Aktif" = 2 ✅
```

### Test via Console

```javascript
// Open browser console (F12)

// 1. Cek current stats
import { getUserStats } from '@/lib/userActivityTracking';
console.log(getUserStats());

// 2. Test tracking manual
import { trackConsultation, trackArticleRead, trackDailyActivity } from '@/lib/userActivityTracking';

trackConsultation();
console.log('Konsultasi tracked!');

trackArticleRead('COVID-19');
console.log('Artikel COVID-19 tracked!');

trackDailyActivity();
console.log('Hari ini tracked!');

// 3. Cek stats lagi
console.log(getUserStats());

// 4. Reset (testing)
import { resetUserStats } from '@/lib/userActivityTracking';
resetUserStats();
console.log('Stats reset!');
```

---

## 🚀 Fitur Lanjutan (Opsional)

### 1. Export Statistics
```typescript
// Download stats sebagai JSON
const downloadStats = () => {
  const stats = getUserStats();
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-health-stats.json';
  a.click();
};
```

### 2. Weekly/Monthly Reports
```typescript
// Filter aktivitas per periode
const getWeeklyStats = () => {
  const allActivities = getAllUserStats();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return allActivities.filter(activity => {
    const lastUpdate = new Date(activity.lastUpdated);
    return lastUpdate >= weekAgo;
  });
};
```

### 3. Leaderboard (Gamification)
```typescript
// Ranking user berdasarkan aktivitas
const getLeaderboard = () => {
  const allActivities = getAllUserStats();
  return allActivities
    .sort((a, b) => b.consultationCount - a.consultationCount)
    .slice(0, 10); // Top 10
};
```

---

## ⚠️ Troubleshooting

### Stats tidak update?
**Solusi:**
1. Cek apakah user sudah login (`localStorage.getItem('user')`)
2. Buka DevTools → Application → Local Storage → cek `userActivities`
3. Clear cache dan coba lagi
4. Cek console untuk error

### Stats tereset setelah logout?
**Penyebab:**
- Data disimpan per email, logout tidak menghapus data
- Jika benar-benar hilang, cek apakah localStorage di-clear

**Solusi:**
```javascript
// Jangan hapus userActivities saat logout
// Di Sidebar.tsx/logout function:
localStorage.removeItem('user'); // ✅ OK
// JANGAN: localStorage.clear(); // ❌ Hapus semua data
```

### Duplikat tetap tercatat?
**Debug:**
```javascript
// Cek isi articlesRead
const activities = JSON.parse(localStorage.getItem('userActivities'));
const myActivity = activities.find(a => a.email === 'myemail@example.com');
console.log(myActivity.articlesRead); // Cek apakah ada duplikat
```

---

## 📈 Metrics & Analytics

### Current User Stats
```typescript
const stats = getUserStats();
// {
//   consultationCount: 5,
//   articlesReadCount: 12,
//   activeDaysCount: 3
// }
```

### All Users Aggregate
```typescript
const allActivities = getAllUserStats();
const totalConsultations = allActivities.reduce((sum, a) => sum + a.consultationCount, 0);
const totalArticles = allActivities.reduce((sum, a) => sum + a.articlesRead.length, 0);
const totalActiveUsers = allActivities.length;

console.log({
  totalConsultations,    // Total konsultasi semua user
  totalArticles,         // Total artikel dibaca semua user
  totalActiveUsers,      // Total user yang pernah aktif
  avgConsultationsPerUser: totalConsultations / totalActiveUsers,
  avgArticlesPerUser: totalArticles / totalActiveUsers
});
```

---

## 📝 Changelog

### Version 1.0 (2025-11-01)
- ✅ Initial implementation
- ✅ Automatic tracking untuk consultations, articles, active days
- ✅ Real-time display di Profile page
- ✅ Duplicate prevention
- ✅ localStorage storage
- ✅ Reset functionality
- ✅ Full documentation

---

## 🎓 Best Practices

1. **Jangan track saat guest**: Semua tracking hanya untuk logged-in users
2. **Unique identifiers**: Gunakan nama penyakit sebagai ID artikel
3. **Date format consistency**: Selalu `YYYY-MM-DD` untuk tracking hari
4. **No duplicates**: Selalu cek sebelum tambah data ke array
5. **Update timestamp**: Setiap perubahan data, update `lastUpdated`

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Cek Troubleshooting section di atas
2. Buka DevTools Console untuk debug
3. Cek localStorage `userActivities` untuk raw data
4. Contact developer untuk advanced issues

---

**Sistem Tracking Aktivitas User - Otomatis & Real-time! 📊✨**
