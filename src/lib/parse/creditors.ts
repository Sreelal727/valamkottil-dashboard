import type { Creditor, ParsedFile } from '../types';
import { Row, findHeaderRow, toNumber, toText } from './common';

export function parseCreditors(rows: Row[], sourceName: string): ParsedFile {
  const hIdx = findHeaderRow(rows, ['ledger', 'balance'], 12);
  const start = (hIdx >= 0 ? hIdx : 3) + 1;

  const creditors: Creditor[] = [];
  const seen = new Set<string>();
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const ledger = toText(r[1]);
    if (!ledger) continue;
    if (/TOTAL/i.test(ledger)) continue;
    if (seen.has(ledger)) continue;
    seen.add(ledger);

    creditors.push({
      serial: toNumber(r[0]),
      ledger,
      group: toText(r[2]),
      opening: toNumber(r[3]),
      debit: toNumber(r[4]),
      credit: toNumber(r[5]),
      balance: toNumber(r[6]),
    });
  }

  // reportDate: the "UPTO dd/mm/yyyy" line in the banner
  let reportDate: string | null = null;
  for (const r of rows.slice(0, 6)) {
    const m = r.map(toText).join(' ').match(/UPTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (m) { reportDate = m[1].split('/').reverse().join('-'); break; }
  }

  return {
    id: 'creditors:latest',
    kind: 'creditors',
    sourceName,
    reportDate,
    ingestedAt: Date.now(),
    rowCount: creditors.length,
    flags: [],
    creditors,
  };
}
