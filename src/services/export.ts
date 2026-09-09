import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LedgerCalculationResult, DateRangeFilter } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';

/**
 * Generates and downloads a structured Excel (.xlsx) file.
 */
export function exportToExcel(
  ledger: LedgerCalculationResult,
  filter?: DateRangeFilter,
  filenamePrefix = 'Laporan_Keuangan_YukCatat'
): void {
  if (!ledger.displayRows || ledger.displayRows.length === 0) {
    console.warn('[Export] Tidak ada data transaksi untuk diekspor.');
    return;
  }

  // Sort rows chronologically ascending for standard accounting sheet layout
  const chronologicalRows = [...ledger.displayRows].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const worksheetData: (string | number)[][] = [];

  // Header Title
  worksheetData.push(['LAPORAN BUKU KAS & ARUS KAS - YUKCATAT']);
  worksheetData.push([
    `Periode: ${filter?.startDate || 'Semua'} s/d ${filter?.endDate || 'Hari Ini'}`,
    `Diekspor Pada: ${new Date().toLocaleString('id-ID')}`,
  ]);
  worksheetData.push([]); // blank row

  // Table Column Headers
  worksheetData.push([
    'No',
    'Tanggal',
    'Keterangan Transaksi',
    'Debit / Masuk (Rp)',
    'Kredit / Keluar (Rp)',
    'Total Saldo (Rp)',
  ]);

  // Opening balance row if filtered
  let rowNumber = 1;
  if (filter?.startDate) {
    worksheetData.push([
      '-',
      filter.startDate,
      'SALDO AWAL (OPENING BALANCE)',
      0,
      0,
      ledger.openingBalance,
    ]);
  }

  // Data rows
  chronologicalRows.forEach((row) => {
    worksheetData.push([
      rowNumber++,
      row.date,
      row.description || '-',
      row.debit || 0,
      row.credit || 0,
      row.runningBalance,
    ]);
  });

  // Blank separator
  worksheetData.push([]);

  // Summary row
  worksheetData.push([
    '',
    '',
    'TOTAL PERIODE / SALDO AKHIR',
    ledger.periodDebit,
    ledger.periodCredit,
    ledger.closingBalance,
  ]);

  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 42 }, // Keterangan
    { wch: 22 }, // Debit
    { wch: 22 }, // Kredit
    { wch: 24 }, // Total Saldo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas');

  // Trigger download
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStamp}.xlsx`);
}

/**
 * Generates and downloads a clean A4 PDF report with Anti-Blank Canvas Guard.
 */
export function exportToPDF(
  ledger: LedgerCalculationResult,
  filter?: DateRangeFilter,
  chartCanvas?: HTMLCanvasElement | null,
  filenamePrefix = 'Laporan_Keuangan_YukCatat'
): void {
  if (!ledger.displayRows || ledger.displayRows.length === 0) {
    console.warn('[Export] Tidak ada data transaksi untuk diekspor.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // 1. Header Title & Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // Brand blue
  doc.text('YukCatat', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('Buku Kas Digital & Pelacak Pengeluaran', 14, currentY + 6);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const exportedAt = `Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(exportedAt, pageWidth - 14, currentY + 6, { align: 'right' });

  currentY += 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // 2. Summary Cards Table (Opening Balance, Debit, Credit, Closing Balance)
  const periodText = `Periode: ${filter?.startDate ? formatDateDisplay(filter.startDate) : 'Awal'} s/d ${filter?.endDate ? formatDateDisplay(filter.endDate) : 'Sekarang'}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(periodText, 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Saldo Awal', 'Total Pemasukan (Debit)', 'Total Pengeluaran (Kredit)', 'Saldo Akhir']],
    body: [
      [
        formatCurrency(ledger.openingBalance),
        `+ ${formatCurrency(ledger.periodDebit)}`,
        `- ${formatCurrency(ledger.periodCredit)}`,
        formatCurrency(ledger.closingBalance),
      ],
    ],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [15, 23, 42],
    },
    margin: { left: 14, right: 14 },
  });

  // Move Y down after summary table
  const lastTableInfo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  currentY = lastTableInfo ? lastTableInfo.finalY + 8 : currentY + 25;

  // 3. Chart Snapshot Injection with Anti-Blank Fallback (Fix 4)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Tren Arus Kas & Saldo', 14, currentY);
  currentY += 4;

  let hasValidChart = false;
  if (chartCanvas) {
    try {
      const base64Img = chartCanvas.toDataURL('image/png');
      // Fix 4: Validate base64 string length and image header
      if (base64Img && base64Img.length > 500 && base64Img.startsWith('data:image/png;base64,')) {
        const imgWidth = pageWidth - 28;
        const imgHeight = 45;
        doc.addImage(base64Img, 'PNG', 14, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 8;
        hasValidChart = true;
      }
    } catch {
      hasValidChart = false;
    }
  }

  if (!hasValidChart) {
    // Graceful fallback if chart is blank or unrendered
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('[Grafik tidak tersedia]', 14, currentY + 5);
    currentY += 12;
  }

  // 4. Ledger Table (Chronological ASC for clean reading)
  const chronologicalRows = [...ledger.displayRows].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const tableBody = chronologicalRows.map((row, idx) => [
    idx + 1,
    formatDateDisplay(row.date),
    row.description || '-',
    row.debit > 0 ? formatCurrency(row.debit) : '-',
    row.credit > 0 ? formatCurrency(row.credit) : '-',
    formatCurrency(row.runningBalance),
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['No', 'Tanggal', 'Keterangan', 'Debit (+)', 'Kredit (-)', 'Total Saldo']],
    body: tableBody,
    foot: [
      [
        '',
        '',
        'TOTAL PERIODE / SALDO AKHIR',
        formatCurrency(ledger.periodDebit),
        formatCurrency(ledger.periodCredit),
        formatCurrency(ledger.closingBalance),
      ],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 28, textColor: [4, 120, 87] }, // Emerald
      4: { halign: 'right', cellWidth: 28, textColor: [185, 28, 28] }, // Rose
      5: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  // Save PDF
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`${filenamePrefix}_${dateStamp}.pdf`);
}
