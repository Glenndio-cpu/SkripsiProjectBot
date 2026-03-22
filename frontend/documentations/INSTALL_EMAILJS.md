# 📧 Panduan Instalasi Package EmailJS

Karena PowerShell memiliki restriction policy, ikuti langkah-langkah berikut:

## Option 1: Enable PowerShell Script Execution (Recommended)

1. **Buka PowerShell sebagai Administrator**
   - Klik kanan pada Start Menu
   - Pilih "Windows PowerShell (Admin)" atau "Terminal (Admin)"

2. **Jalankan perintah berikut:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   
3. **Ketik `Y` untuk confirm**

4. **Install package:**
   ```powershell
   cd "c:\Users\Asus\Documents\SEMESTER9\Skripsi I\AI-Kesehatan-ViralCare-AIDE"
   npm install @emailjs/browser
   ```

## Option 2: Menggunakan CMD (Command Prompt)

1. **Buka Command Prompt**
   - Tekan `Win + R`
   - Ketik `cmd` dan tekan Enter

2. **Install package:**
   ```cmd
   cd "c:\Users\Asus\Documents\SEMESTER9\Skripsi I\AI-Kesehatan-ViralCare-AIDE"
   npm install @emailjs/browser
   ```

## Option 3: Menggunakan Git Bash

1. **Buka Git Bash** di folder project

2. **Install package:**
   ```bash
   npm install @emailjs/browser
   ```

## Verifikasi Instalasi

Setelah install berhasil, cek file `package.json` Anda.
Seharusnya ada entry baru di dependencies:

```json
{
  "dependencies": {
    "@emailjs/browser": "^4.x.x",
    ...
  }
}
```

## Langkah Selanjutnya

Setelah package terinstall, lanjutkan dengan panduan di file `SETUP_EMAIL.md` untuk:
1. Setup akun EmailJS
2. Konfigurasi email service
3. Buat email templates
4. Setup file .env

## Troubleshooting

### Error: "npm is not recognized"
- Install Node.js dari https://nodejs.org/
- Restart terminal setelah install

### Error: "permission denied"
- Jalankan terminal sebagai Administrator
- Atau gunakan Option 2 (CMD) atau Option 3 (Git Bash)

### Error: "EACCES"  
- Hapus folder `node_modules` dan file `package-lock.json`
- Jalankan `npm install` lagi

## Bantuan

Jika masih ada masalah, hubungi:
- Email: support@viralcare-aide.com
- WhatsApp: +62 896-5739-8733
