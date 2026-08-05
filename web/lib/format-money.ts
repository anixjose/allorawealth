/**
 * The backend already returns fixed 2dp decimal strings (e.g. "7600.00").
 * Format with thousands separators via string manipulation only — never
 * `parseFloat`/`Number()`, which would reintroduce the float-precision
 * problem the whole ledger was built to avoid.
 */
export function formatMoney(value: string, currency = 'INR'): string {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = fraction ? `${withSeparators}.${fraction}` : withSeparators;
  return `${negative ? '-' : ''}${currency} ${formatted}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
