import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, DateRangeFilter, SaveStatus, UserSession, NotificationConfig } from './types';
import { storageService } from './services/storage';
import { calculateLedger } from './utils/ledger';
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

export const App: React.FC = () => {
  // Raw transactions state (NO running balance stored in state)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  // Initial load
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      // Register service worker
      pwaService.registerServiceWorker();

      // Load session
      const session = storageService.getUserSession();
      if (session) setUser(session);

      // Load notification config
      const notifConfig = await storageService.getNotificationConfig();
      setNotificationConfig(notifConfig);

      // Load initial transactions
      const txs = await storageService.getTransactions();
      setTransactions(txs);
      setIsLoading(false);
    }
    init();
  }, []);

  // Compute ledger metrics dynamically (Fix 1: Opening balance & Fix 2: DESC display)
  const ledger = useMemo(() => {
    return calculateLedger(transactions, filter);
  }, [transactions, filter]);

  // Add new transaction with today's date prepopulated
  const handleAddTransaction = useCallback(async () => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: getTodayDateString(),
      description: '',
      debit: 0,
      credit: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic state update
    setTransactions((prev) => [newTx, ...prev]);
    setSaveStatus('saving');

    try {
      await storageService.saveTransaction(newTx);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, []);

  // Update existing transaction
  const handleUpdateTransaction = useCallback(async (updated: Transaction) => {
    setSaveStatus('saving');
    // Optimistic UI update
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t))
    );

    try {
      await storageService.saveTransaction(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, []);

  // Delete transaction
  const handleDeleteTransaction = useCallback(async (id: string) => {
    setSaveStatus('saving');
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      await storageService.deleteTransaction(id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }, []);

  // Auth handlers
  const handleLoginSuccess = (session: UserSession) => {
    setUser(session);
    storageService.setUserSession(session);
  };

  const handleLogout = () => {
    setUser(null);
    storageService.setUserSession(null);
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
              Memuat data buku kas...
            </p>
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
                  {user ? `Selamat datang kembali, ${user.name}` : 'Kelola arus kas & pengeluaran Anda dengan mudah'}
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
              onFilterChange={setFilter}
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
        <p>YukCatat PWA © {new Date().getFullYear()} — Buku Kas Digital Tanpa Ketergantungan Server Backend</p>
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
