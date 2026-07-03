import type { LedgerItem, StockBatch } from '../types';
import { daysBetween } from '../format';
import type { AgeBucket, AgingBar, BatchLot, Seasonality, SeasonRow, TimelineData } from './model';

// Age thresholds (days) for the colour buckets on the Gantt.
const FRESH_MAX = 90;
const AGING_MAX = 365;
const AGING_DISPLAY_CAP = 60; // worst offenders shown on the chart
const SEASON_ROW_CAP = 24;

function bucketFor(days: number): AgeBucket {
  if (days <= FRESH_MAX) return 'fresh';
  if (days <= AGING_MAX) return 'aging';
  return 'dead';
}

/**
 * Build the timeline/Gantt view models:
 *  - `aging`: per-product bars spanning oldest-held inward date -> today (true durations)
 *  - `seasonality`: item × month sales grid from the ledger
 */
export function buildTimeline(
  batches: StockBatch[],
  ledger: LedgerItem[],
  asOfDate: string | null,
  ledgerPartial: boolean,
): TimelineData {
  const todayIso = asOfDate ?? new Date().toISOString().slice(0, 10);

  // ---- Inventory aging from batch data (only stock still on the shelf) ----
  const byCode = new Map<string, { name: string; category: string; lots: BatchLot[] }>();
  for (const b of batches) {
    if (b.currentStock <= 0 || !b.recDate) continue;
    const g = byCode.get(b.code) ?? { name: b.name, category: b.cleanCategory, lots: [] };
    g.lots.push({
      startIso: b.recDate,
      ageDays: daysBetween(b.recDate, todayIso),
      stock: b.currentStock,
      value: b.value,
      supplier: b.supplier,
    });
    byCode.set(b.code, g);
  }

  const aging: AgingBar[] = [];
  for (const [code, g] of byCode) {
    if (!g.lots.length) continue;
    const oldest = g.lots.reduce((m, l) => (l.startIso < m ? l.startIso : m), g.lots[0].startIso);
    const ageDays = daysBetween(oldest, todayIso);
    aging.push({
      code,
      name: g.name,
      category: g.category,
      startIso: oldest,
      ageDays,
      currentStock: g.lots.reduce((s, l) => s + l.stock, 0),
      value: g.lots.reduce((s, l) => s + Math.max(l.value, 0), 0),
      bucket: bucketFor(ageDays),
      lots: g.lots.slice().sort((a, b) => a.startIso.localeCompare(b.startIso)),
    });
  }
  aging.sort((a, b) => b.ageDays - a.ageDays);

  const bucketCounts = { fresh: 0, aging: 0, dead: 0 };
  const bucketValue = { fresh: 0, aging: 0, dead: 0 };
  for (const a of aging) {
    bucketCounts[a.bucket]++;
    bucketValue[a.bucket] += a.value;
  }

  const shown = aging.slice(0, AGING_DISPLAY_CAP);
  const axisStartIso = shown.length
    ? shown.reduce((m, a) => (a.startIso < m ? a.startIso : m), shown[0].startIso)
    : null;

  // ---- Sales seasonality from the ledger ----
  let seasonality: Seasonality | null = null;
  if (ledger.length) {
    const monthSet = new Set<string>();
    for (const it of ledger) for (const ym of Object.keys(it.months)) monthSet.add(ym);
    const months = [...monthSet].sort();
    const rows: SeasonRow[] = ledger
      .filter((it) => it.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, SEASON_ROW_CAP)
      .map((it) => ({ label: it.cleanCategory, total: it.total, cells: months.map((ym) => it.months[ym] ?? 0) }));
    const max = rows.reduce((m, r) => Math.max(m, ...r.cells), 0);
    if (months.length && rows.length) seasonality = { months, rows, max };
  }

  return {
    hasBatch: batches.length > 0,
    hasLedger: ledger.length > 0,
    ledgerPartial,
    todayIso,
    axisStartIso,
    aging: shown,
    agingTotal: aging.length,
    bucketCounts,
    bucketValue,
    seasonality,
  };
}
