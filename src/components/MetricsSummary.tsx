import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Calendar, History, RotateCcw } from 'lucide-react';
import { LedgerCalculationResult, DateRangeFilter } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MetricsSummaryProps {
  ledger: LedgerCalculationResult;
  filter: DateRangeFilter;
  onFilterChange: (newFilter: DateRangeFilter) => void;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  ledger,
  filter,
  onFilterChange,
}) => {
  // Preset filter helpers
  const handleSetCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // First day of current month
    const start = `${year}-${month}-01`;
    // Last day of current month
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    onFilterChange({ startDate: start, endDate: end });
  };

  const handleSetLast30Days = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);

    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onFilterChange({
      startDate: formatYMD(past),
      endDate: formatYMD(now),
    });
  };

  const handleClearFilter = () => {
    onFilterChange({ startDate: '', endDate: '' });
  };

  const isFilterActive = Boolean(filter.startDate || filter.endDate);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-zinc-200">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Filter Rentang Tanggal</span>
        </div>

        {/* Inputs & Quick Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              aria-label="Tanggal Mulai"
              value={filter.startDate}
              onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              aria-label="Tanggal Selesai"
              value={filter.endDate}
              onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleSetCurrentMonth}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
            >
              Bulan Ini
            </button>
            <button
              onClick={handleSetLast30Days}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
            >
              30 Hari
            </button>
            {isFilterActive && (
              <button
                onClick={handleClearFilter}
                title="Tampilkan Semua Periode"
                className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Awal (Opening Balance) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Saldo Awal
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 tabular-nums">
              {formatCurrency(ledger.openingBalance)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {isFilterActive ? 'Akumulasi saldo sebelum filter' : 'Saldo dasar awal'}
            </p>
          </div>
        </div>

        {/* Card 2: Total Pemasukan / Debit */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Pemasukan (Debit)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              + {formatCurrency(ledger.periodDebit)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {isFilterActive ? 'Pemasukan periode ini' : 'Semua pemasukan tercatat'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran / Kredit */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-950/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Pengeluaran (Kredit)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              - {formatCurrency(ledger.periodCredit)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {isFilterActive ? 'Pengeluaran periode ini' : 'Semua pengeluaran tercatat'}
            </p>
          </div>
        </div>

        {/* Card 4: Saldo Akhir (Closing Balance) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-blue-100 dark:border-blue-950/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Saldo Akhir
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                ledger.closingBalance < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-zinc-100'
              }`}
            >
              {formatCurrency(ledger.closingBalance)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Net balance periode aktif
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
