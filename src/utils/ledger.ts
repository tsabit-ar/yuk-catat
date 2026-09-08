import { Transaction, ComputedTransaction, LedgerCalculationResult, DateRangeFilter } from '../types';

/**
 * Computes running balance across all historical transactions (ASC)
 * and calculates opening balance, period totals, closing balance,
 * and returns display rows (DESC).
 */
export function calculateLedger(
  transactions: Transaction[],
  filter?: DateRangeFilter
): LedgerCalculationResult {
  // 1. Sort all historical transactions strictly ascending for mathematical continuity
  const sortedAsc = [...transactions].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  // 2. Compute running balance iteratively across the entire chronological chain
  let currentBalance = 0;
  const computedAll: ComputedTransaction[] = sortedAsc.map((t) => {
    const debit = Number(t.debit) || 0;
    const credit = Number(t.credit) || 0;
    currentBalance += debit - credit;
    return {
      ...t,
      debit,
      credit,
      runningBalance: currentBalance,
    };
  });

  const startDate = filter?.startDate?.trim();
  const endDate = filter?.endDate?.trim();

  // 3. Compute openingBalance (Saldo Awal) before startDate
  let openingBalance = 0;
  if (startDate) {
    for (const t of sortedAsc) {
      if (t.date < startDate) {
        openingBalance += (Number(t.debit) || 0) - (Number(t.credit) || 0);
      } else {
        break; // sorted ascending, so once >= startDate we stop
      }
    }
  }

  // 4. Filter rows for the requested period
  const periodRows = computedAll.filter((t) => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  // 5. Calculate period metrics
  const periodDebit = periodRows.reduce((sum, t) => sum + (t.debit || 0), 0);
  const periodCredit = periodRows.reduce((sum, t) => sum + (t.credit || 0), 0);
  const closingBalance = openingBalance + periodDebit - periodCredit;

  // 6. Sort display rows strictly DESC (newest on top) for UX usability
  const displayRows = [...periodRows].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return {
    openingBalance,
    periodDebit,
    periodCredit,
    closingBalance,
    displayRows,
  };
}
