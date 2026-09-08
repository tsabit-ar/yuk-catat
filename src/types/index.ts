export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  debit: number;
  credit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComputedTransaction extends Transaction {
  runningBalance: number;
}

export interface NotificationConfig {
  reminderTime: string; // "HH:mm"
  daysOfWeek: number[]; // 1 = Mon, 7 = Sun
  isEnabled: boolean;
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface LedgerCalculationResult {
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  displayRows: ComputedTransaction[]; // Sorted DESC for display
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UserSession {
  email: string;
  name: string;
  token: string;
}
