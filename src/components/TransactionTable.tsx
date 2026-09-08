import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { Transaction, ComputedTransaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { createDebounced } from '../utils/debounce';

interface TransactionTableProps {
  transactions: ComputedTransaction[];
  onAddTransaction: () => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

/**
 * Isolated Table Row with local state & flush-on-blur debounced auto-save (Fix 3).
 */
const TransactionTableRow: React.FC<{
  row: ComputedTransaction;
  onUpdate: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}> = ({ row, onUpdate, onDelete }) => {
  const [description, setDescription] = useState(row.description);
  const [date, setDate] = useState(row.date);
  const [debitStr, setDebitStr] = useState(row.debit > 0 ? String(row.debit) : '');
  const [creditStr, setCreditStr] = useState(row.credit > 0 ? String(row.credit) : '');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Maintain debounced update for description
  const debouncedSaveDescRef = useRef<ReturnType<typeof createDebounced> | null>(null);

  useEffect(() => {
    debouncedSaveDescRef.current = createDebounced((newDesc: unknown) => {
      onUpdate({
        ...row,
        description: String(newDesc),
      });
    }, 600);

    return () => {
      debouncedSaveDescRef.current?.cancel();
    };
  }, [row, onUpdate]);

  // Sync external row changes if not dirty
  useEffect(() => {
    setDescription(row.description);
    setDate(row.date);
    setDebitStr(row.debit > 0 ? String(row.debit) : '');
    setCreditStr(row.credit > 0 ? String(row.credit) : '');
  }, [row.id, row.description, row.date, row.debit, row.credit]);

  // Description Change Handler (Debounced)
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);
    debouncedSaveDescRef.current?.(val);
  };

  // Description Blur Handler (Fix 3: Immediate Flush)
  const handleDescriptionBlur = () => {
    // Flush any pending debounce immediately to localStorage
    if (debouncedSaveDescRef.current?.isPending()) {
      debouncedSaveDescRef.current.flush();
    } else if (description !== row.description) {
      onUpdate({
        ...row,
        description,
      });
    }
  };

  // Date Change Handler
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDate(val);
    onUpdate({
      ...row,
      date: val,
    });
  };

  // Debit Blur Handler (Sanitize non-negative & save)
  const handleDebitBlur = () => {
    const parsed = Math.max(0, Math.round(Number(debitStr) || 0));
    if (parsed !== row.debit) {
      onUpdate({
        ...row,
        debit: parsed,
      });
    }
    setDebitStr(parsed > 0 ? String(parsed) : '');
  };

  // Credit Blur Handler (Sanitize non-negative & save)
  const handleCreditBlur = () => {
    const parsed = Math.max(0, Math.round(Number(creditStr) || 0));
    if (parsed !== row.credit) {
      onUpdate({
        ...row,
        credit: parsed,
      });
    }
    setCreditStr(parsed > 0 ? String(parsed) : '');
  };

  return (
    <tr className="border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors group">
      {/* 1. Tanggal */}
      <td className="py-2.5 px-3 whitespace-nowrap">
        <input
          type="date"
          aria-label="Tanggal Transaksi"
          value={date}
          onChange={handleDateChange}
          className="w-full text-xs font-medium px-2 py-1.5 rounded border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-zinc-800 text-slate-700 dark:text-zinc-300 outline-none transition"
        />
      </td>

      {/* 2. Keterangan (600ms Debounce + onBlur Flush) */}
      <td className="py-2.5 px-3 min-w-[220px]">
        <input
          type="text"
          aria-label="Keterangan Transaksi"
          placeholder="Tulis keterangan transaksi..."
          value={description}
          onChange={handleDescriptionChange}
          onBlur={handleDescriptionBlur}
          className="w-full text-xs font-medium px-2.5 py-1.5 rounded border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none transition"
        />
      </td>

      {/* 3. Debit (Pemasukan) */}
      <td className="py-2.5 px-3 whitespace-nowrap text-right">
        <div className="relative flex items-center justify-end">
          <input
            type="number"
            min="0"
            step="1000"
            aria-label="Debit / Pemasukan"
            placeholder="0"
            value={debitStr}
            onChange={(e) => setDebitStr(e.target.value)}
            onBlur={handleDebitBlur}
            className="w-32 text-xs font-semibold px-2 py-1.5 rounded border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/60 focus:border-emerald-500 bg-transparent focus:bg-white dark:focus:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-right tabular-nums outline-none transition"
          />
        </div>
      </td>

      {/* 4. Kredit (Pengeluaran) */}
      <td className="py-2.5 px-3 whitespace-nowrap text-right">
        <div className="relative flex items-center justify-end">
          <input
            type="number"
            min="0"
            step="1000"
            aria-label="Kredit / Pengeluaran"
            placeholder="0"
            value={creditStr}
            onChange={(e) => setCreditStr(e.target.value)}
            onBlur={handleCreditBlur}
            className="w-32 text-xs font-semibold px-2 py-1.5 rounded border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 focus:border-rose-500 bg-transparent focus:bg-white dark:focus:bg-zinc-800 text-rose-600 dark:text-rose-400 text-right tabular-nums outline-none transition"
          />
        </div>
      </td>

      {/* 5. Total Saldo (Computed - STRICTLY READ ONLY with distinctive styling) */}
      <td className="py-2.5 px-4 whitespace-nowrap text-right bg-slate-100/70 dark:bg-zinc-800/60 font-bold text-xs tabular-nums text-slate-900 dark:text-zinc-100 border-l border-r border-slate-200 dark:border-zinc-800 select-none">
        <span
          className={
            row.runningBalance < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-zinc-100'
          }
        >
          {formatCurrency(row.runningBalance)}
        </span>
      </td>

      {/* 6. Aksi (Delete Row with confirmation) */}
      <td className="py-2.5 px-3 whitespace-nowrap text-center">
        {isConfirmingDelete ? (
          <div className="flex items-center justify-center space-x-1 animate-scale-in">
            <button
              onClick={() => onDelete(row.id)}
              title="Konfirmasi Hapus"
              className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              title="Batal"
              className="p-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            title="Hapus baris transaksi ini"
            className="opacity-40 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Buku Kas Transaksi (Ledger)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 font-semibold">
              {transactions.length} baris
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Semua perubahan tersimpan otomatis. Total Saldo dihitung secara real-time pada setiap baris.
          </p>
        </div>

        {/* Action Button: Tambah Transaksi */}
        <button
          onClick={onAddTransaction}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <th className="py-3 px-3 w-36">Tanggal</th>
              <th className="py-3 px-3 min-w-[200px]">Keterangan</th>
              <th className="py-3 px-3 w-36 text-right text-emerald-700 dark:text-emerald-400">
                Debit / Masuk (+)
              </th>
              <th className="py-3 px-3 w-36 text-right text-rose-700 dark:text-rose-400">
                Kredit / Keluar (-)
              </th>
              <th className="py-3 px-4 w-40 text-right bg-slate-100/90 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-l border-r border-slate-200 dark:border-zinc-800">
                Total Saldo (Auto)
              </th>
              <th className="py-3 px-3 w-20 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-sm">
            {transactions.length > 0 ? (
              transactions.map((row) => (
                <TransactionTableRow
                  key={row.id}
                  row={row}
                  onUpdate={onUpdateTransaction}
                  onDelete={onDeleteTransaction}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium">Belum ada data transaksi pada periode ini.</p>
                    <button
                      onClick={onAddTransaction}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Klik di sini untuk menambah transaksi pertama
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
        <span>* Kolom Total Saldo bersifat read-only dan dihitung secara akumulatif.</span>
        <span>Urutan tampilan: Terkini ke Terlama (DESC)</span>
      </div>
    </div>
  );
};
