# 🚀 QUICK START - Aktifkan Chatbot (5 Menit)

## ⚡ Langkah Super Cepat

### 1️⃣ Dapatkan API Key (2 menit)
```
🔗 Buka: https://aistudio.google.com/app/apikey

1. Klik "Create API Key"
2. Pilih "Create API key in new project"
3. COPY API key (format: AIzaSy...)
```

### 2️⃣ Edit File .env (1 menit)
```bash
📁 Lokasi: AI-Kesehatan-ViralCare-AIDE\.env

Baris 3, ubah dari:
VITE_GEMINI_API_KEY=

Menjadi:
VITE_GEMINI_API_KEY=AIzaSyAaBbCcDdEeFfGg... (paste API key Anda)
```

### 3️⃣ Restart Server (1 menit)
```powershell
# Di terminal PowerShell:
Ctrl + C        # Stop server
npm run dev     # Start server lagi
```

### 4️⃣ Test Chatbot (1 menit)
```
✅ Buka: http://localhost:5173
✅ Login ke aplikasi
✅ Klik menu "Konsultasi"
✅ Warning kuning HILANG = SUKSES! 🎉
✅ Ketik: "Apa gejala demam berdarah?"
✅ Chatbot merespons = BERHASIL! 🎊
```

---

## 🎯 Visual Checklist

```
┌─────────────────────────────────────┐
│  SEBELUM (❌ Error)                 │
├─────────────────────────────────────┤
│  [!] Warning Banner Kuning Muncul   │
│  [!] Chatbot: "Belum Dikonfigurasi" │
│  [!] Tidak ada respons AI           │
└─────────────────────────────────────┘

         ⬇️  SETUP (5 menit)  ⬇️

┌─────────────────────────────────────┐
│  SESUDAH (✅ Working)                │
├─────────────────────────────────────┤
│  [✓] No Warning Banner              │
│  [✓] Chatbot merespons normal       │
│  [✓] AI memberikan saran kesehatan  │
└─────────────────────────────────────┘
```

---

## 🔥 Pro Tips

### Jika Gagal:
```bash
# 1. Cek file .env ada di root
dir .env          # PowerShell
ls -la .env       # Git Bash

# 2. Cek isi .env
cat .env          # Git Bash
type .env         # PowerShell

# 3. Pastikan format benar (TANPA SPASI)
VITE_GEMINI_API_KEY=AIzaSy...
# ❌ SALAH: VITE_GEMINI_API_KEY = AIzaSy...
# ❌ SALAH: VITE_GEMINI_API_KEY= AIzaSy...

# 4. Hard restart
# Tutup terminal
# Buka terminal baru
npm run dev
```

### Test Cepat di Console:
```javascript
// Buka browser → F12 → Console
console.log(import.meta.env.VITE_GEMINI_API_KEY);

// Harus muncul: "AIzaSy..."
// Jika "undefined" → .env belum terbaca → restart server!
```

---

## 📸 Screenshot Guide

### Step 1: Google AI Studio
```
https://aistudio.google.com/app/apikey
→ [Create API Key] button
→ Pilih project
→ Copy key
```

### Step 2: File .env
```
Before:  VITE_GEMINI_API_KEY=
After:   VITE_GEMINI_API_KEY=AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq
         └────────────────────┬───────────────────────────────┘
                         Paste key di sini
```

### Step 3: Restart
```powershell
PS C:\...\AI-Kesehatan-ViralCare-AIDE> npm run dev
                                        ^^^^^^^^^^^^
                                        Jalankan ini
```

### Step 4: Verify
```
Halaman Konsultasi:
┌──────────────────────────────────────────┐
│ [✓] No yellow warning banner             │
│ [✓] Chat input aktif                     │
│ [✓] Mode: Konsultasi (badge hijau)       │
│                                           │
│ User: Apa gejala demam berdarah?         │
│                                           │
│ AI: Gejala demam berdarah meliputi:      │
│     1. Demam tinggi mendadak...          │
│     2. Sakit kepala...                    │
│     ... [respons lengkap] ...            │
└──────────────────────────────────────────┘
```

---

## ⏱️ Timeline

```
00:00 - Buka Google AI Studio
00:30 - Login & create key
01:00 - Copy API key
01:30 - Buka VSCode → file .env
02:00 - Paste key → Save
02:30 - Terminal → Ctrl+C
03:00 - npm run dev
03:30 - Wait server start
04:00 - Browser → refresh
04:30 - Test chatbot
05:00 - ✅ DONE!
```

---

## 🎊 Selamat!

Jika chatbot sudah merespons, berarti setup BERHASIL! 🎉

**Fitur yang sekarang aktif:**
- ✅ AI Consultation (Gemini 2.0 Flash)
- ✅ Disease Information
- ✅ Prevention Tips
- ✅ Health Recommendations
- ✅ Activity Tracking
- ✅ WhatsApp Share
- ✅ Email Notification

**Next Steps:**
- Explore fitur konsultasi
- Coba berbagai pertanyaan kesehatan
- Share hasil konsultasi via WhatsApp
- Track statistik konsultasi di Profile

---

**Made with ❤️ for Puskesmas Wori Online**
