---
name: web-scaffold
description: "Setup project structure, package manager dependencies, and standard web layout. Trigger when user asks to start, setup, or initialize a web project."
---

# Web Scaffold Skill

Skill ini bertugas menginisialisasi arsitektur dan struktur proyek web secara terstandarisasi, bersih, dan siap pakai, baik untuk proyek vanilla (HTML/CSS/JS) maupun framework/bundler modern (Vite, React, Vue, Tailwind CSS).

---

## 1. Prerequisites

Sebelum menjalankan inisialisasi, lakukan inspeksi lingkungan sistem:

1. **Deteksi Runtime Node.js**:
   - Jalankan pemeriksaan versi:
     ```powershell
     node -v
     ```
   - Pastikan Node.js terinstal dengan versi LTS aktif (disarankan Node.js >= 18.x).
   - Jika Node.js belum terpasang, periksa ketersediaan alternatif runtime seperti Bun (`bun -v`) atau tawarkan setup vanilla HTML/CSS statis tanpa ketergantungan runtime.

2. **Deteksi Package Manager**:
   - Periksa package manager yang tersedia secara berurutan:
     ```powershell
     npm -v
     pnpm -v
     yarn -v
     bun -v
     ```
   - Gunakan package manager yang terdeteksi atau preferensi proyek (default: `npm`).

3. **Integritas Direktori Kerja**:
   - Pastikan direktori kerja bersih atau tidak menimpa file penting yang sudah ada tanpa konfirmasi.

---

## 2. Execution Steps

Lakukan inisialisasi dengan alur terstruktur berikut:

### Langkah 2.1: Penentuan Arsitektur & Template Proyek
- Tentukan apakah proyek menggunakan:
  - **Modern Bundler (Vite + Vanilla/React/Vue/TypeScript)** untuk aplikasi web interaktif.
  - **Clean Vanilla Web Layout** untuk landing page atau prototipe ringan.

### Langkah 2.2: Pembuatan Struktur Direktori Standar
Buat hierarki folder sesuai standar arsitektur:
```plaintext
├── public/              # Aset statis (favicon, icons, static images)
├── src/
│   ├── assets/          # Media, font, dan stylesheet global
│   ├── components/      # Komponen UI modular
│   ├── styles/          # File CSS/SCSS/Tailwind
│   └── main.js (atau index.js)
├── index.html           # Entry point HTML utama
├── package.json         # Konfigurasi dependensi dan scripts
└── .gitignore           # File pengabaian Git standar
```

### Langkah 2.3: Konfigurasi File Inti
1. **`index.html`**:
   - Sertakan metadata standar (`<!DOCTYPE html>`, meta viewport, charset UTF-8, title SEO-friendly).
   - Pastikan tag mount root tersedia (misalnya `<div id="app"></div>` atau `<main id="root"></main>`).
   - Tautkan file script dan stylesheet dengan path yang benar.

2. **`package.json`**:
   - Cantumkan metadata nama proyek, version, type (`module`), serta script standar:
     ```json
     {
       "name": "project-name",
       "version": "1.0.0",
       "type": "module",
       "scripts": {
         "dev": "vite",
         "build": "vite build",
         "preview": "vite preview"
       }
     }
     ```

3. **`.gitignore`**:
   - Masukkan entri wajib: `node_modules/`, `dist/`, `.env`, `.env.local`, `.DS_Store`, `npm-debug.log*`.

### Langkah 2.4: Instalasi Dependensi
- Jalankan instalasi dependensi menggunakan package manager yang dipilih:
  ```powershell
  npm install
  ```

---

## 3. Verification

Lakukan validasi menyeluruh setelah scaffold selesai dibuat:

1. **Validasi File Kunci**:
   - Pastikan file `package.json` dan `index.html` ada pada root proyek.
   - Uji validitas sintaks `package.json` (parse JSON tanpa error):
     ```powershell
     Get-Content package.json | ConvertFrom-Json
     ```
2. **Validasi Entry Point**:
   - Pastikan path file script yang dirujuk di dalam `index.html` benar-benar ada di filesystem (`src/main.js` atau `src/index.js`).
3. **Dry-Run Script Check**:
   - Periksa script yang terdaftar di `package.json` dan pastikan perintah build atau dev siap dieksekusi.

---

## 4. Error Recovery

Jika terjadi kegagalan selama proses scaffold, terapkan prosedur mitigasi berikut:

1. **Network Timeout / Registry Failure saat `npm install`**:
   - Bersihkan cache npm atau coba instalasi ulang:
     ```powershell
     npm cache clean --force
     npm install --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000
     ```
   - Jika registry bermasalah, gunakan registry resmi npm secara eksplisit:
     ```powershell
     npm install --registry=https://registry.npmjs.org/
     ```

2. **Dependency Conflicts (Peer Dependencies ERESOLVE)**:
   - Jalankan instalasi dengan penanganan kompatibilitas:
     ```powershell
     npm install --legacy-peer-deps
     ```

3. **Node Version Incompatibility**:
   - Deteksi apakah fitur engine memerlukan versi node yang lebih tinggi. Berikan rekomendasi upgrade atau sesuaikan versi paket dependensi yang kompatibel.

4. **I/O Permission / File Lock**:
   - Jika proses gagal menulis file karena permission atau antivirus file lock, lakukan retry setelah interval singkat atau verifikasi hak akses direktori kerja.
