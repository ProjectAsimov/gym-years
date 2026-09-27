export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

/** Local-time ISO day, YYYY-MM-DD. */
export function iso(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function todayIso(): string {
  return iso(new Date());
}

export function parseDay(k: string): Date {
  return new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function yearOf(k: string): number {
  return +k.slice(0, 4);
}

export function monthPrefix(y: number, m: number): string {
  return y + '-' + pad(m + 1) + '-';
}

export function monthName(m: number): string {
  return MONTHS[m] ?? '';
}

export function shortMonth(m: number): string {
  return monthName(m).slice(0, 3);
}
