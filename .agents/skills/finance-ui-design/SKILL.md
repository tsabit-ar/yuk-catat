---
name: finance-ui-design
description: Design, structure, and visually audit modern financial dashboard interfaces, expense/income trackers, and transaction tables. Trigger when creating or refining financial UI components, balance cards, or transaction forms.
---

# Financial Tracker UI Design Skill

## 1. Design System & Visual Standards
- Color Semantics (WCAG AA Compliant):
  - Background: Neutral slate/zinc gelap (`#0f172a` / `#18181b`) atau clean white/off-white (`#f8fafc`).
  - Net Balance / Primary: Netral atau aksen biru/indigo tajam.
  - Income (Pemasukan): Emerald green (`#10b981` / text `#047857`), gunakan tanda plus `+`.
  - Expense (Pengeluaran): Rose/crimson red (`#f43f5e` / text `#b91c1c`), gunakan tanda minus `-`.
- Typography & Numerical Alignment:
  - Semua nominal uang wajib menggunakan format tabular (`font-variant-numeric: tabular-nums` atau font monospace/inter) agar digit sejajar vertikal.
  - Format mata uang wajib konsisten: `Rp 150.000` atau `IDR 150,000`.
  - Nominal pada tabel/daftar transaksi wajib rata kanan (right-aligned).

## 2. Core Layout Architecture
- Stat Cards (Top Row):
  - 3 kartu ringkasan wajib: "Total Saldo", "Total Pemasukan Bulan Ini", "Total Pengeluaran Bulan Ini".
  - Ukuran nominal 24px-30px (bold/semibold), dengan micro-label di atasnya (12px uppercase, text-muted).
- Quick Entry Form:
  - Form pencatatan (Nominal, Kategori, Tanggal, Catatan) dalam bentuk modal atau card sticky di atas list.
  - Input nominal berukuran besar dengan state autofokus.
- Transaction Table / Feed:
  - Desktop: Tabel dengan kolom Tanggal, Kategori (badge), Keterangan, Tipe, dan Jumlah.
  - Mobile: Tampilan kartu ringkas (list items) dengan tanggal dan keterangan di kiri, nominal berwarna di kanan.

## 3. Execution Steps
1. Baca arsitektur UI saat ini.
2. Terapkan grid responsif (1 kolom di mobile, 12-kolom layout di desktop).
3. Bungkus data transaksi dalam markup semantik (tabel atau semantic list).
4. Berikan validasi visual instan pada form (toggle switch tegas untuk tipe Pemasukan vs Pengeluaran).

## 4. Verification Checklist
- Buka preview browser Antigravity pada resolusi 375px (mobile) dan 1440px (desktop).
- Pastikan nominal uang pada tabel transaksi sejajar rata kanan.
- Pastikan tidak ada horizontal scrollbar liar di mobile.
- Pastikan rasio kontras teks badge kategori terbaca jelas.

## 5. Error Recovery
- Jika nominal tabel rata kiri/tengah, ubah styling menjadi right-aligned.
- Jika form pencatatan terlalu panjang, pindahkan ke dalam floating modal dialog.
- Jika warna teks transaksi membingungkan, tambahkan penanda eksplisit `+ Rp` atau `- Rp`.
