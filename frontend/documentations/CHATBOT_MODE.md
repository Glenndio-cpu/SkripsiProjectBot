# Fitur Mode Chatbot

## Overview
Chatbot ViralCare AIDE kini memiliki dua mode operasi berdasarkan status login pengguna:

### 🔒 Mode Info Puskesmas (Belum Login)
**Tujuan**: Memberikan informasi umum tentang Puskesmas Wori tanpa konsultasi medis.

**Topik yang Diperbolehkan**:
- ⏰ Jam operasional dan layanan
- 📍 Lokasi, alamat, dan rute
- 📞 Kontak, telepon, WhatsApp
- 🏥 Layanan dan fasilitas yang tersedia
- 📝 Cara pendaftaran dan antrian
- 💉 Jadwal vaksinasi dan imunisasi
- 💰 Biaya dan administrasi
- 👤 Cara membuat akun, login, register
- 📜 Kebijakan privasi dan syarat ketentuan

**Topik yang Diblokir**:
- ❌ Gejala penyakit
- ❌ Diagnosis
- ❌ Rekomendasi obat
- ❌ Konsultasi medis
- ❌ Informasi penyakit spesifik

**Respons saat bertanya topik medis**:
> "Untuk konsultasi medis dan informasi penyakit, silakan login terlebih dahulu. Saat ini saya hanya dapat membantu dengan informasi umum Puskesmas seperti jam layanan, lokasi, pendaftaran, kontak, dan jadwal imunisasi."

---

### 💬 Mode Konsultasi (Sudah Login)
**Tujuan**: Memberikan konsultasi kesehatan dan informasi penyakit.

**Fitur**:
- ✅ Informasi lengkap tentang penyakit menular dan tidak menular
- ✅ Penjelasan gejala, cara penularan, dan pencegahan
- ✅ Saran kesehatan umum yang dapat dipercaya
- ✅ Rekomendasi untuk konsultasi profesional
- ✅ Edukasi kesehatan masyarakat
- ✅ Promosi pola hidup sehat

**Batasan**:
- ⚠️ Tidak mendiagnosis penyakit secara pasti
- ⚠️ Tidak meresepkan obat spesifik atau dosis
- ⚠️ Tidak menggantikan konsultasi medis profesional
- ⚠️ Selalu menyarankan konsultasi dokter untuk gejala serius

---

## Implementasi Teknis

### File yang Diubah

#### 1. `src/lib/gemini.ts`
- Menambahkan tipe `ChatMode`: `'public' | 'consultation'`
- Membuat dua system prompt terpisah:
  - `PUBLIC_SYSTEM_PROMPT` - untuk mode publik
  - `CONSULTATION_SYSTEM_PROMPT` - untuk mode konsultasi
- Menambahkan fungsi `isLoggedIn()` - deteksi status login dari localStorage
- Menambahkan fungsi `isPublicAllowed()` - filter pertanyaan di mode publik
- Update `getGeminiResponse()` dengan parameter `mode?: ChatMode`
- Mode otomatis ditentukan berdasarkan status login jika tidak dispesifikasi

#### 2. `src/pages/Konsultasi.tsx`
- Menambahkan state `isUserLoggedIn` untuk tracking status login
- Menambahkan badge mode di header halaman
- Menambahkan info banner untuk user yang belum login
- Auto-update saat login/logout melalui event listener

#### 3. `src/components/AIAssistant.tsx`
- Update untuk menggunakan service Gemini yang baru
- Menambahkan state `isUserLoggedIn`
- Menambahkan badge mode di header chatbot
- Menghapus hardcoded API call, gunakan `getGeminiResponse()`
- Auto-update badge saat login/logout

### Badge Mode

**Belum Login**:
```
🔒 Mode: Info Puskesmas
```
- Background: Blue
- Icon: ℹ️

**Sudah Login**:
```
💬 Mode: Konsultasi
```
- Background: Green
- Icon: 💬

---

## Cara Kerja

### Flow Diagram

```
┌─────────────────┐
│  User bertanya  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Cek status login    │
│ localStorage.user   │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌──────┐
│Login│   │Guest │
└──┬──┘   └───┬──┘
   │          │
   ▼          ▼
┌─────────┐ ┌──────────────┐
│KONSUL   │ │INFO PUSKESMAS│
│TASI MODE│ │    MODE      │
└─────────┘ └──────────────┘
   │          │
   │          ▼
   │     ┌──────────────┐
   │     │Filter topik  │
   │     │isPublicAllowed│
   │     └──────┬───────┘
   │            │
   │       ┌────┴────┐
   │       │         │
   │       ▼         ▼
   │    ┌────┐   ┌──────┐
   │    │OK  │   │BLOCK │
   │    └─┬──┘   └───┬──┘
   │      │          │
   │      │          ▼
   │      │   ┌─────────────┐
   │      │   │Pesan tolak  │
   │      │   │"Silakan     │
   │      │   │ login..."   │
   │      │   └─────────────┘
   │      │
   └──────┴──────────┐
                     │
                     ▼
            ┌────────────────┐
            │ Kirim ke       │
            │ Gemini 2.0     │
            │ Flash dengan   │
            │ system prompt  │
            │ yang sesuai    │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │ Respons AI     │
            └────────────────┘
```

### Event Listeners
Komponen mendengarkan perubahan status login melalui:
- `userUpdated` - custom event saat login/logout
- `storage` - untuk sync antar tab browser

---

## Testing

### Skenario Test

#### 1. Guest User (Belum Login)
- [ ] Buka chatbot → Badge "Mode: Info Puskesmas"
- [ ] Tanya jam buka → Dijawab
- [ ] Tanya lokasi → Dijawab
- [ ] Tanya kontak → Dijawab
- [ ] Tanya gejala demam → Ditolak + suruh login
- [ ] Tanya obat flu → Ditolak + suruh login
- [ ] Tanya tentang COVID → Ditolak + suruh login

#### 2. Logged-in User
- [ ] Login → Badge berubah "Mode: Konsultasi"
- [ ] Tanya gejala demam → Dijawab lengkap
- [ ] Tanya pencegahan DBD → Dijawab lengkap
- [ ] Tanya info penyakit → Dijawab lengkap
- [ ] Tanya jam buka puskesmas → Tetap dijawab

#### 3. Logout Behavior
- [ ] Logout → Badge kembali "Mode: Info Puskesmas"
- [ ] Conversation tetap ada tapi mode berubah
- [ ] Pertanyaan medis selanjutnya ditolak

---

## Keamanan & Privacy

- ✅ Tidak ada data medis disimpan untuk guest user
- ✅ Filter pertanyaan di client-side sebelum kirim ke API
- ✅ System prompt berbeda untuk mencegah prompt injection
- ✅ Logging status disimpan di localStorage (client-side)

---

## Future Improvements

1. **Analitik**:
   - Track jenis pertanyaan yang sering ditolak
   - Identifikasi topik yang perlu ditambahkan ke mode publik

2. **Enhanced Filtering**:
   - Machine learning untuk deteksi topik medis lebih akurat
   - Daftar kata kunci yang lebih komprehensif

3. **User Experience**:
   - Toast notification saat mode berubah
   - Tooltip di badge untuk penjelasan mode
   - Quick login button di respons penolakan

4. **Admin Dashboard**:
   - Monitor conversation rate per mode
   - Statistics guest vs logged-in queries
   - Most blocked topics analytics

---

## Troubleshooting

### Badge tidak muncul
- Cek apakah component sudah di-update
- Periksa console untuk error
- Pastikan `isUserLoggedIn` state ter-update

### Mode tidak berubah setelah login/logout
- Periksa event listener `userUpdated` dan `storage`
- Cek apakah localStorage `user` sudah di-set/remove
- Restart browser atau clear cache

### Pertanyaan medis tetap dijawab di mode publik
- Periksa fungsi `isPublicAllowed()` di `gemini.ts`
- Cek regex pattern di `allowedTopics` dan `blockedTopics`
- Debug dengan console.log untuk melihat hasil filtering

### API Error
- Pastikan VITE_GEMINI_API_KEY sudah di-set
- Cek quota API Gemini
- Periksa network request di DevTools

---

## Kontak
Untuk pertanyaan atau isu terkait fitur ini, hubungi tim development ViralCare AIDE.
