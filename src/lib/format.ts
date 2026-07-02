// India-friendly formatting (lakh/crore aware).

export function inr(value: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (opts.compact) {
    if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}k`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: digits });
}

export function pct(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-06' -> 'Jun ’26' */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_LABEL[m - 1]} ’${String(y).slice(2)}`;
}

/** '2026-06-30' -> '30 Jun 2026' */
export function dateLabel(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTH_LABEL[m - 1]} ${y}`;
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}
