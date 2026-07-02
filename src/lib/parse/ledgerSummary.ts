import type { LedgerItem, ParsedFile } from '../types';
import { Row, findHeaderRow, splitGst, toNumber, toText } from './common';

// Map a header cell (Date object, "Aug 2025+Older", "2026-07-01") to a 'yyyy-mm' key.
function monthKey(cell: unknown): string | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}`;
  }
  const s = toText(cell as never);
  const iso = s.match(/^(\d{4})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;
  const older = s.match(/([A-Za-z]{3})\s*(\d{4})/); // "Aug 2025+Older"
  if (older) {
    const m: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const mm = m[older[1].toLowerCase()];
    if (mm) return `${older[2]}-${mm}`;
  }
  return null;
}

export function parseLedgerSummary(rows: Row[], sourceName: string): ParsedFile {
  const headerIdx = findHeaderRow(rows, ['description', 'total'], 15);
  const header = rows[headerIdx >= 0 ? headerIdx : 0];

  // Column index map
  let totalCol = 1;
  let groupTypeCol = -1;
  let groupUidCol = -1;
  const monthCols: { col: number; ym: string }[] = [];
  header.forEach((cell, i) => {
    const t = toText(cell).toLowerCase();
    if (i === 0) return; // description
    if (t === 'total') { totalCol = i; return; }
    if (t === 'grouptype') { groupTypeCol = i; return; }
    if (t === 'groupuid') { groupUidCol = i; return; }
    const ym = monthKey(cell);
    if (ym) monthCols.push({ col: i, ym });
  });

  const items: LedgerItem[] = [];
  const start = (headerIdx >= 0 ? headerIdx : 0) + 1;
  const seen = new Set<string>();
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const desc = toText(r[0]);
    if (!desc || desc.toUpperCase() === 'TOTAL') continue; // TOTAL row excluded from item analysis
    if (seen.has(desc)) continue;
    seen.add(desc);

    const months: Record<string, number> = {};
    for (const mc of monthCols) months[mc.ym] = toNumber(r[mc.col]);
    const { gstRate, cleanCategory } = splitGst(desc);
    items.push({
      description: desc,
      cleanCategory,
      gstRate,
      total: toNumber(r[totalCol]),
      months,
      groupType: groupTypeCol >= 0 ? toText(r[groupTypeCol]) : '',
      groupUid: groupUidCol >= 0 ? toText(r[groupUidCol]) : '',
    });
  }

  return {
    id: 'ledgerSummary:latest', // snapshot — newest upload supersedes
    kind: 'ledgerSummary',
    sourceName,
    reportDate: monthCols[0]?.ym ? `${monthCols[0].ym}-01` : null,
    ingestedAt: Date.now(),
    rowCount: items.length,
    flags: [],
    ledgerItems: items,
  };
}
