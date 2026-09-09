import React, { useState, useEffect, useCallback } from 'react';
import { DateRangeFilter, SaveStatus, UserSession, NotificationConfig, LedgerCalculationResult, Transaction } from './types';
import { storageService } from './services/storage';
import { getTodayDateString } from './utils/formatters';
import { pwaService } from './services/pwa';
import { Navbar } from './components/Navbar';
import { MetricsSummary } from './components/MetricsSummary';
import { TrendChart } from './components/TrendChart';
import { TransactionTable } from './components/TransactionTable';
import { ExportActions } from './components/ExportActions';
import { AuthModal } from './components/AuthModal';
import { NotificationModal } from './components/NotificationModal';
import { IOSInstallBanner } from './components/IOSInstallBanner';
import { Lock, LogIn } from 'lucide-react';

export const App: React.FC = () => {
  const [ledger, setLedger] = useState<LedgerCalculationResult>({
    openingBalance: 0,
    periodDebit: 0,
    periodCredit: 0,
    closingBalance: 0,
    displayRows: [],
  });
  const [filter, setFilter] = useState<DateRangeFilter>({ startDate: '', endDate: '' });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    reminderTime: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    isEnabled: true,
  });
  const [chartCanvas, setChartCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load ledger data from backend API
  const fetchLedger = useCallback(async (activeFilter: DateRangeFilter) => {
    try {
      const data = await storageService.getTransactions(activeFilter);
      setLedger(data);
    } catch (err) {
      console.error('[App] Gagal memuat data transaksi dari API backend:', err);
    }
  }, []);

  // Initial load: check session & register SW
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      pwaService.registerServiceWorker();

      const session = storageService.getUserSession();
      if (session) {
        setUser(session);
        // Load initial ledger from backend
        await fetchLedger(filter);
        // Load notification config
        const notif = await storageService.getNotificationConfig();
        setNotificationConfig(notif);
      } else {
        // Automatically prompt login if not authenticated
        setIsAuthOpen(true);
      }
      setIsLoading(false);
    }
    init();
  }, [fetchLedger, filter]);

  // Handle date filter change
  const handleFilterChange = useCallback((newFilter: DateRangeFilter) => {
    setFilter(newFilter);
    if (user) {
      fetchLedger(newFilter);
    }
  }, [user, fetchLedger]);

  // Add new transaction
  const handleAddTransaction = useCallback(async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setSaveStatus('saving');
    try {
      await storageService.saveTransaction({
        date: getTodayDateString(),
        description: '',
        debit: 0,
        credit: 0,
      });
      // Refresh ledger to let PostgreSQL recompute running balance via window function
      await fetchLedger(filter);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, [user, filter, fetchLedger]);

  // Update transaction (debounced auto-save target)
  const handleUpdateTransaction = useCallback(async (updated: Transaction) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setSaveStatus('saving');

    // Optimistic row update
    setLedger((prev) => ({
      ...prev,
      displayRows: prev.displayRows.map((r) =>
        r.id === updated.id
          ? {
              ...r,
              date: updated.date,
              description: updated.description,
              debit: updated.debit,
              credit: updated.credit,
              updatedAt: new Date().toISOString(),
            }
          : r
      ),
    }));

    try {
      await storageService.saveTransaction(updated);
      // Re-fetch ledger in background to ensure dynamic balance precision
      const freshData = await storageService.getTransactions(filter);
      setLedger(freshData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, [user, filter]);

  // Delete transaction
  const handleDeleteTransaction = useCallback(async (id: string) => {
    if (!user) return;

    setSaveStatus('saving');
    // Optimistic removal
    setLedger((prev) => ({
      ...prev,
      displayRows: prev.displayRows.filter((r) => r.id !== id),
    }));

    try {
      await storageService.deleteTransaction(id);
      const freshData = await storageService.getTransactions(filter);
      setLedger(freshData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, [user, filter]);

  // Auth success
  const handleLoginSuccess = async (session: UserSession) => {
    setUser(session);
    setIsLoading(true);
    try {
      await fetchLedger(filter);
      const notif = await storageService.getNotificationConfig();
      setNotificationConfig(notif);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout: clear session and reset to login shell
  const handleLogout = () => {
    setUser(null);
    storageService.setUserSession(null);
    setLedger({
      openingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      closingBalance: 0,
      displayRows: [],
    });
    setIsAuthOpen(true);
  };

  // Notification save
  const handleSaveNotificationConfig = async (newConfig: NotificationConfig) => {
    setNotificationConfig(newConfig);
    await storageService.saveNotificationConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col text-slate-900 dark:text-zinc-100">
      {/* iOS Safari PWA guidance banner */}
      <IOSInstallBanner />

      {/* Top Navbar */}
      <Navbar
        saveStatus={saveStatus}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              Menghubungkan ke database Neon PostgreSQL...
            </p>
          </div>
        ) : !user ? (
          /* Login Shell for Unauthenticated Users */
          <div className="py-16 text-center max-w-lg mx-auto bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xl space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Akses Buku Kas Terkunci
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Silakan masuk atau buat akun terlebih dahulu untuk mengakses data buku kas dan pencatatan keuangan Anda yang tersimpan di database Neon PostgreSQL.
              </p>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk atau Daftar Akun</span>
            </button>
          </div>
        ) : (
          <>
            {/* Top Row: Welcome & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
                  Dashboard Buku Kas
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                  Selamat datang kembali, <span className="font-semibold text-slate-800 dark:text-zinc-200">{user.name}</span> ({user.email})
                </p>
              </div>

              {/* Export Buttons */}
              <ExportActions
                ledger={ledger}
                filter={filter}
                chartCanvas={chartCanvas}
              />
            </div>

            {/* Metrics & Filter Module */}
            <MetricsSummary
              ledger={ledger}
              filter={filter}
              onFilterChange={handleFilterChange}
            />

            {/* Visual Trend Chart */}
            <TrendChart
              ledger={ledger}
              onCanvasReady={setChartCanvas}
            />

            {/* Ledger Table with inline editing, debouncing, and computed running balance */}
            <TransactionTable
              transactions={ledger.displayRows}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-600">
        <p>YukCatat PWA © {new Date().getFullYear()} — Didukung oleh Express & Neon PostgreSQL</p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        config={notificationConfig}
        onSaveConfig={handleSaveNotificationConfig}
      />
    </div>
  );
};
