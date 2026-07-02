// Shared, defensive helpers for turning messy Marg exports into clean values.
// Every field crossing this boundary is treated as untrusted (see coding-style.md).

export type Cell = string | number | boolean | Date | null | undefined;
export type Row = Cell[];

/** Trim padded strings, strip embedded units/commas, cast to a finite number. */
export function toNumber(cell: Cell): number {
  if (cell == null) return 0;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : 0;
  if (cell instanceof Date) return cell.getTime();
  const cleaned = String(cell)
    .replace(/,/g, '')
    .replace(/[^0-9.\-]/g, ' ') // keep digits, dot, minus
    .trim()
    .split(/\s+/)[0]; // first numeric token (handles "4 PCS")
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Extract the trailing unit token from a qty string like "  4 PCS" -> "PCS". */
export function extractUnit(cell: Cell): string {
  if (cell == null) return '';
  const m = String(cell).match(/[A-Za-z]+/);
  return m ? m[0].toUpperCase() : '';
}

export function toText(cell: Cell): string {
  if (cell == null) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).replace(/\r/g, '').trim();
}

const GST_PREFIX = /^(\d{1,2})\s*%\s*/;

/** Split "10% BAGGY" -> { gstRate: 10, cleanCategory: "BAGGY" }. */
export function splitGst(raw: string): { gstRate: number | null; cleanCategory: string } {
  const text = raw.trim();
  const m = text.match(GST_PREFIX);
  if (!m) return { gstRate: null, cleanCategory: text };
  return { gstRate: Number(m[1]), cleanCategory: text.slice(m[0].length).trim() || text };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse Marg dates: Date objects, "17-Mar-24", "30/06/2026", "yyyy-mm-dd". */
export function toISODate(cell: Cell): string | null {
  if (cell == null) return null;
  if (cell instanceof Date) {
    if (isNaN(cell.getTime())) return null;
    return cell.toISOString().slice(0, 10);
  }
  const s = String(cell).trim();
  if (!s || /^-\s*-$/.test(s.replace(/\s/g, ''))) return null;

  // dd-Mon-yy / dd-Mon-yyyy
  let m = s.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[A-Za-z]*[-/\s](\d{2,4})$/);
  if (m) {
    const day = +m[1];
    const mon = MONTHS[m[2].toLowerCase()];
    let year = +m[3];
    if (year < 100) year += 2000;
    if (mon) return iso(year, mon, day);
  }
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return iso(year, +m[2], +m[1]);
  }
  // yyyy-mm-dd
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (!y || !mo || !d || mo > 12 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Locate the real header row by scanning for the first row whose cells contain
 * an expected set of keywords — junk banner rows above it vary in count.
 */
export function findHeaderRow(rows: Row[], keywords: string[], maxScan = 40): number {
  const needles = keywords.map((k) => k.toLowerCase());
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const joined = rows[i].map((c) => toText(c).toLowerCase()).join(' ');
    if (needles.every((n) => joined.includes(n))) return i;
  }
  return -1;
}

/** FNV-1a hash of a string — stable dedupe key without pulling in a crypto dep. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

export function ymFromISO(isoDate: string): string {
  return isoDate.slice(0, 7);
}
