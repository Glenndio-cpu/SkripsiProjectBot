# Setup Gemini 2.0 Flash AI

## Panduan Lengkap Konfigurasi Gemini AI untuk ViralCare AIDE

Website ini sekarang menggunakan **Gemini 2.0 Flash** dari Google sebagai AI untuk konsultasi kesehatan.

---

## 📋 Persyaratan

- Node.js (sudah terinstall)
- Akun Google (gratis)
- Koneksi internet

---

## 🔑 Cara Mendapatkan API Key Gemini

### Langkah 1: Buka Google AI Studio

1. Kunjungi: **https://makersuite.google.com/app/apikey**
2. Login dengan akun Google Anda
3. Jika diminta, setujui Terms of Service

### Langkah 2: Buat API Key

1. Klik tombol **"Create API Key"** atau **"Get API Key"**
2. Pilih project Google Cloud (atau buat baru jika belum ada)
3. Klik **"Create API key in new project"** jika ini pertama kali
4. API key akan muncul (format: `AIzaSy...`)
5. **COPY** API key tersebut

⚠️ **PENTING**: Jangan share API key Anda ke publik!

### Langkah 3: (Opsional) Verifikasi Quota

- Gemini API memiliki free tier yang sangat generous
- Cek quota di: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
- Free tier: 15 requests per minute, 1500 requests per day

---

## ⚙️ Konfigurasi di Project

### Langkah 1: Buat File .env

Di root folder project, buat file bernama `.env` (tanpa .example):

```bash
# Windows Command Prompt
copy .env.example .env

# PowerShell
Copy-Item .env.example .env
```

### Langkah 2: Isi API Key

Buka file `.env` dengan text editor, lalu isi:

```env
VITE_GEMINI_API_KEY=AIzaSy_PASTE_API_KEY_ANDA_DISINI
```

Ganti `AIzaSy_PASTE_API_KEY_ANDA_DISINI` dengan API key yang sudah Anda copy.

### Langkah 3: Restart Development Server

**PENTING**: Vite hanya membaca .env saat startup!

```bash
# Stop server yang sedang running (Ctrl+C)
# Lalu jalankan ulang:
npm run dev
```

---

## ✅ Verifikasi Setup

### Test 1: Cek Console Browser

1. Buka website di browser: http://localhost:8081
2. Buka Developer Tools (F12)
3. Pergi ke tab **Console**
4. Pastikan **TIDAK ADA** warning:
   ```
   ⚠️ VITE_GEMINI_API_KEY belum diset di file .env
   ```

### Test 2: Coba Konsultasi

1. Buka halaman **Konsultasi** di website
2. Ketik pertanyaan kesehatan, contoh:
   ```
   Apa gejala demam berdarah?
   ```
3. Klik kirim
4. AI harus merespons dalam 2-5 detik

### Test 3: Cek Response Format

Response dari AI harus berisi informasi kesehatan yang relevan tentang:
- Rekomendasi
- Pencegahan
- Gejala/informasi penyakit

---

## 🛠️ Troubleshooting

### Problem: "API key Gemini belum dikonfigurasi"

**Solusi**:
1. Pastikan file `.env` ada di root folder
2. Pastikan nama variable: `VITE_GEMINI_API_KEY` (huruf besar semua)
3. Pastikan tidak ada spasi: `VITE_GEMINI_API_KEY=AIza...`
4. Restart dev server

### Problem: "API key tidak valid"

**Solusi**:
1. Periksa API key tidak terpotong saat copy-paste
2. Buat API key baru di Google AI Studio
3. Pastikan API key dimulai dengan `AIza`

### Problem: "Quota exceeded"

**Solusi**:
1. Tunggu 1 menit (limit: 15 requests/minute)
2. Atau tunggu sampai hari berikutnya (limit: 1500/day)
3. Untuk production, upgrade ke paid tier

### Problem: "SAFETY error"

**Solusi**:
1. Pertanyaan mungkin dianggap sensitif
2. Coba pertanyaan lain yang lebih spesifik ke kesehatan
3. Gemini memiliki safety filter ketat

### Problem: Response lambat atau timeout

**Solusi**:
1. Cek koneksi internet
2. Gemini 2.0 Flash seharusnya sangat cepat (< 3 detik)
3. Periksa Network tab di DevTools untuk error

---

## 📊 Model yang Digunakan

### Gemini 2.0 Flash Experimental

```typescript
const MODEL_NAME = "gemini-2.0-flash-exp";
```

**Karakteristik**:
- ✅ Sangat cepat (< 2 detik response time)
- ✅ Gratis dengan quota generous
- ✅ Mendukung Bahasa Indonesia
- ✅ Context window besar
- ⚠️ Experimental (bisa berubah)

### Alternatif Model (Jika Perlu)

Jika `gemini-2.0-flash-exp` error, edit `src/lib/gemini.ts`:

```typescript
// Ganti dari:
const MODEL_NAME = "gemini-2.0-flash-exp";

// Menjadi (stable):
const MODEL_NAME = "gemini-1.5-flash";
```

---

## 🔒 Keamanan

### ⚠️ JANGAN:

- ❌ Commit file `.env` ke Git
- ❌ Share API key di public repository
- ❌ Hardcode API key di source code
- ❌ Share screenshot yang menampilkan API key

### ✅ LAKUKAN:

- ✅ Tambahkan `.env` ke `.gitignore` (sudah otomatis)
- ✅ Gunakan `.env.example` sebagai template
- ✅ Regenerate API key jika bocor
- ✅ Monitor usage di Google Cloud Console

### Untuk Production:

1. **Jangan pakai API key dari browser** (tidak aman!)
2. Buat backend server/proxy yang memanggil Gemini
3. Browser → Backend → Gemini API
4. Backend menyimpan API key dengan aman
5. Gunakan environment variables di server

---

## 📈 Monitoring & Quota

### Cek Usage:

1. Buka: https://console.cloud.google.com/
2. Pilih project yang berisi API key
3. Menu: **APIs & Services** → **Credentials**
4. Klik API key untuk melihat details
5. Menu: **Quotas** untuk melihat usage

### Free Tier Limits:

- **RPM** (Requests Per Minute): 15
- **RPD** (Requests Per Day): 1500
- **TPM** (Tokens Per Minute): 1,000,000

Untuk project skripsi, free tier sudah lebih dari cukup.

---

## 📝 Konfigurasi Lanjutan

### Mengubah Temperature (Kreativitas AI):

Edit `src/lib/gemini.ts`:

```typescript
generationConfig: {
  temperature: 0.7, // 0.0 = konsisten, 1.0 = kreatif
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
},
```

### Mengubah System Prompt:

Edit `HEALTH_SYSTEM_PROMPT` di `src/lib/gemini.ts` untuk customisasi perilaku AI.

---

## 🆘 Support

### Jika Masih Bermasalah:

1. **Baca error message** di browser console (F12)
2. **Cek file** `.env` ada dan formatnya benar
3. **Restart** development server
4. **Regenerate** API key di Google AI Studio
5. **Hubungi**:
   - Email: puskesmas.desawori@gmail.com
   - WhatsApp: +62 896-5739-8733

---

## 📚 Referensi

- **Google AI Studio**: https://makersuite.google.com/
- **Gemini API Docs**: https://ai.google.dev/docs
- **Gemini Pricing**: https://ai.google.dev/pricing
- **GitHub Repo SDK**: https://github.com/google/generative-ai-js

---

## ✨ Selesai!

Jika setup berhasil, Anda akan melihat:
- ✅ Konsultasi AI merespons dengan cepat
- ✅ Tidak ada error di console
- ✅ Response relevan dengan pertanyaan kesehatan

**Selamat! Gemini 2.0 Flash sudah aktif di ViralCare AIDE** 🎉
