import { Transaction, NotificationConfig, UserSession } from '../types';

const TRANSACTIONS_KEY = 'yukcatat_transactions_v1';
const NOTIFICATION_KEY = 'yukcatat_notification_config';
const SESSION_KEY = 'yukcatat_user_session';

/**
 * Simulates real-world network latency (200ms - 400ms).
 */
const simulateLatency = (min = 200, max = 400): Promise<void> => {
  const duration = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, duration));
};

/**
 * Initial seed transactions for first-time users.
 * Note: Running balance is NEVER stored here.
 */
const INITIAL_SEED: Transaction[] = [
  {
    id: 'tx-seed-1',
    date: '2026-09-01',
    description: 'Gaji Pokok & Tunjangan September',
    debit: 8500000,
    credit: 0,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'tx-seed-2',
    date: '2026-09-02',
    description: 'Sewa Apartemen & Biaya IPL',
    debit: 0,
    credit: 2500000,
    createdAt: '2026-09-02T10:15:00.000Z',
    updatedAt: '2026-09-02T10:15:00.000Z',
  },
  {
    id: 'tx-seed-3',
    date: '2026-09-04',
    description: 'Belanja Bulanan Supermarket',
    debit: 0,
    credit: 850000,
    createdAt: '2026-09-04T14:30:00.000Z',
    updatedAt: '2026-09-04T14:30:00.000Z',
  },
  {
    id: 'tx-seed-4',
    date: '2026-09-06',
    description: 'Pendapatan Proyek Freelance Web Design',
    debit: 1750000,
    credit: 0,
    createdAt: '2026-09-06T19:00:00.000Z',
    updatedAt: '2026-09-06T19:00:00.000Z',
  },
  {
    id: 'tx-seed-5',
    date: '2026-09-08',
    description: 'Langganan Listrik & Internet Fiber',
    debit: 0,
    credit: 620000,
    createdAt: '2026-09-08T09:45:00.000Z',
    updatedAt: '2026-09-08T09:45:00.000Z',
  },
];

export const storageService = {
  /**
   * Fetch all raw transactions from localStorage.
   */
  async getTransactions(): Promise<Transaction[]> {
    await simulateLatency();
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_SEED));
      return [...INITIAL_SEED];
    }
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_SEED));
      return [...INITIAL_SEED];
    }
  },

  /**
   * Save or update an individual transaction.
   * Strips any computed fields (such as runningBalance) before storing.
   */
  async saveTransaction(transaction: Transaction): Promise<Transaction> {
    await simulateLatency();
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    let list: Transaction[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    // Clean payload: ensure no runningBalance is stored
    const cleaned: Transaction = {
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      debit: Number(transaction.debit) || 0,
      credit: Number(transaction.credit) || 0,
      createdAt: transaction.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const index = list.findIndex((item) => item.id === cleaned.id);
    if (index >= 0) {
      list[index] = cleaned;
    } else {
      list.push(cleaned);
    }

    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
    return cleaned;
  },

  /**
   * Bulk save all transactions.
   */
  async saveAllTransactions(transactions: Transaction[]): Promise<void> {
    await simulateLatency();
    const cleaned = transactions.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      debit: Number(t.debit) || 0,
      credit: Number(t.credit) || 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(cleaned));
  },

  /**
   * Delete a transaction by ID.
   */
  async deleteTransaction(id: string): Promise<void> {
    await simulateLatency();
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return;
    try {
      const list: Transaction[] = JSON.parse(raw);
      const filtered = list.filter((t) => t.id !== id);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
    } catch {
      // Ignored
    }
  },

  /**
   * Fetch notification reminder configuration.
   */
  async getNotificationConfig(): Promise<NotificationConfig> {
    await simulateLatency(100, 200);
    const raw = localStorage.getItem(NOTIFICATION_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback
      }
    }
    const defaultConfig: NotificationConfig = {
      reminderTime: '20:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      isEnabled: true,
    };
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(defaultConfig));
    return defaultConfig;
  },

  /**
   * Save notification reminder configuration.
   */
  async saveNotificationConfig(config: NotificationConfig): Promise<void> {
    await simulateLatency(100, 200);
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(config));
  },

  /**
   * User session mock.
   */
  getUserSession(): UserSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUserSession(session: UserSession | null): void {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },
};
