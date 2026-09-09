import {
  Transaction,
  LedgerCalculationResult,
  DateRangeFilter,
  NotificationConfig,
  UserSession,
} from '../types';

const envApiUrl = import.meta.env.VITE_API_BASE_URL;
// In production or when VITE_API_BASE_URL is empty, fallback to '/api' for same-origin deployment
const API_BASE_URL = (import.meta.env.PROD || !envApiUrl || envApiUrl.trim() === '')
  ? '/api'
  : envApiUrl;
const SESSION_KEY = 'yukcatat_user_session';

/**
 * Injects Authorization: Bearer <token> from the stored session.
 */
export function getAuthHeaders(): Record<string, string> {
  const session = storageService.getUserSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

export const storageService = {
  /**
   * User session storage helpers.
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

  /**
   * Login user via POST /api/auth/login
   */
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: UserSession }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal login. Periksa email dan kata sandi Anda.');
    }

    const session: UserSession = {
      name: data.user.name,
      email: data.user.email,
      token: data.token,
    };
    this.setUserSession(session);
    return { token: data.token, user: session };
  },

  /**
   * Register user via POST /api/auth/register
   */
  async register(payload: { name: string; email: string; password: string }): Promise<{ token: string; user: UserSession }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal mendaftar akun baru.');
    }

    const session: UserSession = {
      name: data.user.name,
      email: data.user.email,
      token: data.token,
    };
    this.setUserSession(session);
    return { token: data.token, user: session };
  },

  /**
   * Fetch current authenticated profile via GET /api/auth/me
   */
  async getMe(): Promise<UserSession | null> {
    const session = this.getUserSession();
    if (!session?.token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.setUserSession(null);
        }
        return null;
      }
      const data = await res.json();
      return {
        name: data.user.name,
        email: data.user.email,
        token: session.token,
      };
    } catch {
      return session;
    }
  },

  /**
   * Fetch transactions & computed ledger from backend SQL window function.
   * Calls GET /api/transactions with optional ?startDate=...&endDate=...
   */
  async getTransactions(filter?: DateRangeFilter): Promise<LedgerCalculationResult> {
    const session = this.getUserSession();
    if (!session?.token) {
      return {
        openingBalance: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingBalance: 0,
        displayRows: [],
      };
    }

    const params = new URLSearchParams();
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/transactions${queryString}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.setUserSession(null);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal mengambil data transaksi dari server.');
    }

    const data: LedgerCalculationResult = await res.json();
    return data;
  },

  /**
   * Save or update transaction.
   * Calls POST /api/transactions if new, or PUT /api/transactions/:id if exists.
   */
  async saveTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const session = this.getUserSession();
    if (!session?.token) {
      throw new Error('Sesi login tidak ditemukan. Harap login terlebih dahulu.');
    }

    // Determine if it's a persisted transaction or a temporary/new one
    const isNew = !transaction.id || transaction.id.startsWith('tx-temp-');

    const url = isNew
      ? `${API_BASE_URL}/transactions`
      : `${API_BASE_URL}/transactions/${transaction.id}`;

    const method = isNew ? 'POST' : 'PUT';

    const payload = {
      date: transaction.date || new Date().toISOString().slice(0, 10),
      description: transaction.description || '',
      debit: Number(transaction.debit) || 0,
      credit: Number(transaction.credit) || 0,
    };

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan transaksi ke database.');
    }

    return data;
  },

  /**
   * Delete transaction via DELETE /api/transactions/:id
   */
  async deleteTransaction(id: string): Promise<void> {
    const session = this.getUserSession();
    if (!session?.token) {
      throw new Error('Sesi login tidak ditemukan. Harap login terlebih dahulu.');
    }

    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal menghapus transaksi dari server.');
    }
  },

  /**
   * Fetch notification reminder settings via GET /api/notifications/schedule
   */
  async getNotificationConfig(): Promise<NotificationConfig> {
    const session = this.getUserSession();
    if (!session?.token) {
      return {
        reminderTime: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/schedule`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        return {
          reminderTime: '20:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          isEnabled: true,
        };
      }
      const data = await res.json();
      return {
        reminderTime: data.reminderTime || data.reminder_time || '20:00',
        daysOfWeek: data.daysOfWeek || data.days_of_week || [1, 2, 3, 4, 5, 6, 7],
        isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : true,
      };
    } catch {
      return {
        reminderTime: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
      };
    }
  },

  /**
   * Save notification reminder schedule via PUT /api/notifications/schedule
   */
  async saveNotificationConfig(config: NotificationConfig): Promise<void> {
    const session = this.getUserSession();
    if (!session?.token) return;

    await fetch(`${API_BASE_URL}/notifications/schedule`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        reminder_time: config.reminderTime,
        days_of_week: config.daysOfWeek,
        is_enabled: config.isEnabled,
      }),
    });
  },

  /**
   * Fetch VAPID public key from backend
   */
  async getVapidPublicKey(): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`);
      if (res.ok) {
        const data = await res.json();
        return data.publicKey || '';
      }
    } catch {
      // Ignored
    }
    return '';
  },

  /**
   * Register Web Push subscription via POST /api/notifications/subscribe
   */
  async subscribePush(subscription: PushSubscription): Promise<void> {
    const session = this.getUserSession();
    if (!session?.token) return;

    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

    const p256dh = rawKey
      ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey))))
      : '';
    const auth = rawAuth
      ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth))))
      : '';

    await fetch(`${API_BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
        },
      }),
    });
  },

  /**
   * Dispatch test push notification via POST /api/notifications/test-push
   */
  async testPush(): Promise<{ message: string; sentCount: number }> {
    const res = await fetch(`${API_BASE_URL}/notifications/test-push`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal mengirimkan notifikasi uji coba.');
    }
    return data;
  },
};
