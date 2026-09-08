/**
 * Formats a number to Indonesian Rupiah currency string.
 * Example: 150000 -> "Rp 150.000"
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absVal);

  return `${isNegative ? '- Rp ' : 'Rp '}${formatted}`;
}

/**
 * Returns today's date in local YYYY-MM-DD string format.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date into localized Indonesian readable format.
 * Example: "2026-09-08" -> "08 Sep 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
