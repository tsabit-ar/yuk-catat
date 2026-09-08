import React, { useState } from 'react';
import { FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { LedgerCalculationResult, DateRangeFilter } from '../types';
import { exportToExcel, exportToPDF } from '../services/export';

interface ExportActionsProps {
  ledger: LedgerCalculationResult;
  filter: DateRangeFilter;
  chartCanvas: HTMLCanvasElement | null;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  ledger,
  filter,
  chartCanvas,
}) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportExcel = () => {
    try {
      setIsExportingExcel(true);
      setTimeout(() => {
        exportToExcel(ledger, filter);
        setIsExportingExcel(false);
        showToast('File Excel (.xlsx) berhasil diunduh!');
      }, 200);
    } catch (e) {
      console.error(e);
      setIsExportingExcel(false);
      showToast('Gagal mengekspor file Excel.');
    }
  };

  const handleExportPDF = () => {
    try {
      setIsExportingPDF(true);
      setTimeout(() => {
        exportToPDF(ledger, filter, chartCanvas);
        setIsExportingPDF(false);
        showToast('Laporan PDF resmi berhasil dibuat dan diunduh!');
      }, 300);
    } catch (e) {
      console.error(e);
      setIsExportingPDF(false);
      showToast('Gagal mengekspor dokumen PDF.');
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          disabled={isExportingExcel}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{isExportingExcel ? 'Membuat Excel...' : 'Ekspor Excel (.xlsx)'}</span>
        </button>

        {/* Export PDF Button */}
        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{isExportingPDF ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
        </button>
      </div>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
