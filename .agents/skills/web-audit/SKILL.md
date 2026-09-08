---
name: web-audit
description: "Build the code, start dev server, and perform DOM/console inspection via Antigravity browser actuation. Trigger when features are ready to preview or user asks to check/audit the site."
---

# Web Audit Skill

Skill ini bertugas melakukan audit menyeluruh terhadap aplikasi web, mulai dari tahap kompilasi/build, menjalankan development server di background, memverifikasi ketersediaan antarmuka melalui peramban (Antigravity browser actuation), hingga menganalisis DOM dan log konsol JavaScript untuk memastikan situs bebas dari error.

---

## 1. Execution Steps

Lakukan proses audit dengan alur bertahap berikut:

### Langkah 1.1: Eksekusi Build & Static Verification
1. Jalankan build check untuk memvalidasi bahwa tidak ada kesalahan sintaksis, TypeScript error, atau bundling failure:
   ```powershell
   npm run build
   ```
2. Pastikan direktori output build (misalnya `dist/` atau `build/`) berhasil dibuat jika proyek menggunakan bundler.

### Langkah 1.2: Jalankan Development Server di Background
1. Mulai dev server sebagai background process menggunakan parameter background runner:
   ```powershell
   npm run dev
   ```
2. Tangkap output terminal untuk mengidentifikasi URL lokal dan port yang aktif (misalnya `http://localhost:5173` atau `http://localhost:3000`).

### Langkah 1.3: Akses URL Localhost & Browser Actuation
1. Setelah server aktif dan port siap menerima koneksi, lakukan navigasi ke URL localhost menggunakan Antigravity browser actuation tool atau HTTP probe:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
   ```
2. Muat halaman utama di peramban untuk memulai inspeksi visual dan interaktif.

### Langkah 1.4: Inspeksi DOM & Konsol Runtime
1. Periksa hierarki DOM untuk memastikan elemen utama telah dimuat dan dirender dengan benar.
2. Ambil snapshot log konsol browser (stdout/stderr konsol JavaScript) untuk mendeteksi warning maupun fatal error.

---

## 2. Verification

Validasi bahwa aplikasi memenuhi kriteria rilis dan berfungsi tanpa anomali:

1. **HTTP Status Code 200**:
   - Pastikan permintaan ke server mengembalikan kode status `200 OK`.
   - Pastikan response headers mengembalikan `Content-Type: text/html`.

2. **Konsol Bersih dari Uncaught JavaScript Errors**:
   - Periksa console logs:
     - 0 Uncaught SyntaxError
     - 0 Uncaught ReferenceError
     - 0 Uncaught TypeError
     - 0 Unhandled Promise Rejection
   - Tidak ada error CORS atau kegagalan pemanggilan API penting.

3. **Integritas Komponen & DOM**:
   - Elemen root mount (`#app`, `#root`, atau tag semantik `<main>`) tidak kosong (terdapat child nodes yang dirender secara dinamis).
   - Seluruh resource statis (CSS bundler, script entry point, font, favicon, gambar) termuat dengan status HTTP 200 (tidak ada error 404 Not Found).

---

## 3. Error Recovery

Jika ditemukan kendala teknis saat audit, terapkan prosedur pemulihan otomatis berikut:

### 3.1. Penanganan Port Dev Server Bentrok (`EADDRINUSE`)
Jika port dev server (misal port 5173 atau 3000) telah digunakan oleh proses lain:
1. **Fallback Port Dinamis**:
   - Jalankan server dengan flag alokasi port berikutnya:
     ```powershell
     npm run dev -- --port 5174
     ```
   - Atau gunakan flag bawaan Vite/bundler untuk mencari port kosong secara otomatis (hindari `--strictPort`).
2. **Identifikasi & Terminasi Port Zombie**:
   - Cari PID proses yang mengunci port terkait pada Windows:
     ```powershell
     Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
     ```
   - Jika proses adalah sisa dev server lama yang tidak responsif, terminasi proses:
     ```powershell
     Stop-Process -Id <PID> -Force
     ```

### 3.2. Penanganan Build / Transpilasi Gagal
1. Baca baris error dan stack trace pada terminal output.
2. Identifikasi file sumber dan nomor baris penyebab error (misalnya missing imports, JSX malformed, atau syntax typo).
3. Lakukan koreksi file sumber, lalu jalankan ulang langkah build.

### 3.3. Penanganan Server Timeout / Unresponsive Host
1. Jika server belum merespons dalam waktu 10 detik, periksa status background task.
2. Verifikasi apakah ada prompt interaktif di terminal yang menahan eksekusi.
3. Hentikan task bermasalah dan jalankan ulang dengan logging diagnostik.
