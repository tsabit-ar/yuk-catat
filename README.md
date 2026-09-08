# YukCatat - PWA Expense Tracker & Cash Flow Ledger

YukCatat adalah aplikasi pencatat pengeluaran dan buku kas digital berbasis **Progressive Web App (PWA)** dengan perhitungan saldo berjalan (*running balance*) dinamis, antarmuka modern yang responsif, serta kemampuan ekspor laporan profesional.

---

## Fitur Utama

- **Real-time Running Balance**: Total Saldo dihitung secara dinamis saat runtime (*reduction pass* matematis secara kronologis ASC, dengan tampilan terbalik DESC untuk UX optimal).
- **Auto-Save & Flush onBlur**: Input teks menggunakan debounce 600ms dengan mekanisme *immediate flush* saat kehilangan fokus (`onBlur`) untuk mencegah race condition. Input angka tervalidasi non-negatif.
- **Filter Rentang Tanggal & Saldo Awal**: Menghitung *Opening Balance* secara otomatis dari seluruh transaksi sebelum tanggal mulai filter.
- **Visual Trend Analytics**: Grafik tren arus kas kumulatif menggunakan Chart.js dengan konfigurasi anti-blank saat ekspor.
- **Export Engine**:
  - **Excel (.xlsx)**: Lembar kerja terstruktur lengkap dengan header, rincian transaksi, dan baris ringkasan total.
  - **PDF Resmi**: Dokumen A4 siap cetak memuat ringkasan metrik, grafik tren visual, dan tabel transaksi rapi.
- **PWA & Web Push Notification**:
  - Dukungan instalasi mandiri (Standalone PWA) di desktop maupun mobile.
  - Service Worker (`sw.js`) dan Web App Manifest (`manifest.json`).
  - Pengaturan pengingat harian dengan format 24 jam dan pemilihan hari aktif.
  - Banner panduan instalasi untuk pengguna Safari iOS.

---

## Tech Stack

- **Framework**: [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) (TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Slate/Zinc palette, tabular numbers)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Export**: [jsPDF](https://github.com/parallax/jsPDF), [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable), dan [XLSX](https://github.com/SheetJS/sheetjs)

---

## Memulai Proyek

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:5173`.

### 3. Build untuk Produksi
```bash
npm run build
```
Hasil build siap rilis akan dihasilkan pada direktori `dist/`.
