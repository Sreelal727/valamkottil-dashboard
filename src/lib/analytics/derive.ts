import type { LedgerItem, ParsedFile, StockItem } from '../types';
import { latestOfKind } from '../store/useDataStore';
import { monthLabel } from '../format';
import type { BestSeller, CategoryGPRow, Dashboard, ReorderRow, Slice, VariantGroup } from './model';
import { buildPayables } from './payables';
import { buildTakeaways } from './takeaways';
import { buildTimeline } from './timeline';

const REORDER_MONTHS_COVER = 1.0; // < 1 month of cover => reorder soon
const norm = (s: string) => s.trim().toUpperCase();

export function derive(files: ParsedFile[]): Dashboard {
  const sales = latestOfKind(files, 'salesSummary');
  const daily = latestOfKind(files, 'dailyAnalysis');
  const ledger = latestOfKind(files, 'ledgerSummary');
  const stock = latestOfKind(files, 'stockSnapshot');
  const batch = latestOfKind(files, 'stockBatch');
  const creditors = latestOfKind(files, 'creditors');

  const present = {
    salesSummary: !!sales, dailyAnalysis: !!daily, ledgerSummary: !!ledger,
    stockSnapshot: !!stock, stockBatch: !!batch, creditors: !!creditors, unknown: false,
  };
  const hasAnyData = files.length > 0;

  const asOfDate =
    stock?.reportDate ?? daily?.reportDate ?? sales?.reportDate ?? batch?.reportDate ?? ledger?.reportDate ?? null;

  const ledgerItems = ledger?.ledgerItems ?? [];
  const ledgerByName = new Map<string, LedgerItem>();
  for (const it of ledgerItems) ledgerByName.set(norm(it.description), it);

  // ---- Sales Today + cash/credit ----
  const headline = daily?.dailyHeadline;
  let salesToday: number | null = null;
  let salesTodaySource: string | null = null;
  if (headline && headline.cashValue + headline.creditValue > 0) {
    salesToday = headline.cashValue + headline.creditValue;
    salesTodaySource = `Daily Analysis · ${daily?.reportDate ?? ''}`;
  } else if (sales?.salesLines?.length) {
    salesToday = sales.salesLines.reduce((s, l) => s + l.amount, 0);
    salesTodaySource = `Sales Summary · ${sales.reportDate ?? ''}`;
  }
  const cashVsCredit = headline ? { cash: headline.cashValue, credit: headline.creditValue } : null;

  // ---- Monthly trend + avg/day + run-rate (from ledger) ----
  const monthlyTrend = buildMonthlyTrend(ledgerItems);
  const activeMonths = monthlyTrend.filter((t) => t.value > 0);
  const avgMonthly = activeMonths.length ? activeMonths.reduce((s, t) => s + t.value, 0) / activeMonths.length : 0;
  // If the ledger's implied daily rate is a fraction of an observed day's takings,
  // it isn't a full sales ledger — don't let it drive averages or dead-stock calls.
  const ledgerPartial = !!salesToday && activeMonths.length > 0 && avgMonthly / 30 < salesToday * 0.5;
  const { avgSalesPerDay, expectedThisMonth } = buildRunRate(avgMonthly, salesToday, ledgerPartial);

  // ---- Stock value + discrepancies ----
  const stockItems = stock?.stockItems ?? [];
  let totalStockValue: number | null = null;
  let stockDiscrepancyValue = 0;
  let stockDiscrepancyCount = 0;
  if (stockItems.length) {
    totalStockValue = 0;
    for (const it of stockItems) {
      if (it.currentStock < 0 || it.value < 0) {
        stockDiscrepancyValue += it.value;
        stockDiscrepancyCount++;
      } else {
        totalStockValue += it.value;
      }
    }
  }

  // ---- Sales by category (prefer today's item-wise summary, fallback to daily analysis) ----
  const { salesByCategory, salesByCategorySource } = buildSalesByCategory(sales, daily);

  // ---- Category GP% (from daily analysis) ----
  const categoryGP: CategoryGPRow[] = (daily?.dailyCategories ?? [])
    .filter((c) => c.sale > 0)
    .map((c) => ({ label: c.cleanCategory, gp: c.gpPct ?? 0, sale: c.sale, stockValue: c.currentStockValue }))
    .sort((a, b) => b.sale - a.sale)
    .slice(0, 14);

  // ---- Best sellers ----
  const bestSellers = buildBestSellers(sales, daily, ledgerItems);

  // ---- Movement set for dead-stock detection ----
  const moving = buildMovingSet(sales, daily, ledgerItems);
  const { deadStock, deadStockValue, deadStockCount, deadStockCoverageNote } =
    buildDeadStock(stockItems, ledgerByName, moving, batch?.stockBatches ?? [], asOfDate, ledgerPartial);

  // ---- Reorder (months-of-cover from stock value / avg monthly sales value) ----
  const reorder = buildReorder(stockItems, ledgerByName);

  // ---- Size / variant view (heuristic) ----
  const variants = buildVariants(stockItems);

  // ---- Payables ----
  const payables = creditors?.creditors ? buildPayables(creditors.creditors, batch?.stockBatches ?? []) : null;

  // ---- Timeline / Gantt ----
  const timeline = buildTimeline(batch?.stockBatches ?? [], ledgerItems, asOfDate, ledgerPartial);

  // ---- Flags ----
  // Headline count is actionable issues only (negative stock, missing supplier,
  // missing price). Low-severity noise like "no rack" — which every item trips
  // in a shop that doesn't use racks — is kept in the list but not the count.
  const flags = files.flatMap((f) => f.flags);
  const flagCount = flags.filter((f) => f.severity !== 'low').length;

  const dashboard: Dashboard = {
    hasAnyData, present, asOfDate,
    salesToday, salesTodaySource, avgSalesPerDay, expectedThisMonth,
    totalStockValue, stockDiscrepancyValue, stockDiscrepancyCount,
    deadStockValue, deadStockCount, flagCount,
    ledgerPartial, monthlyTrend, salesByCategory, salesByCategorySource, categoryGP, bestSellers, cashVsCredit,
    deadStock, deadStockCoverageNote, reorder, variants, payables,
    timeline,
    takeaways: [], flags,
  };
  dashboard.takeaways = buildTakeaways(dashboard, { headline, deadStock });
  return dashboard;
}

// ---------------------------------------------------------------------------

function buildMonthlyTrend(items: LedgerItem[]): Slice[] {
  const totals = new Map<string, number>();
  for (const it of items) {
    for (const [ym, v] of Object.entries(it.months)) {
      totals.set(ym, (totals.get(ym) ?? 0) + v);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, value]) => ({ label: monthLabel(ym), value }));
}

const WORKING_DAYS = 26; // textile shops trade ~6 days/week

function buildRunRate(
  avgMonthly: number,
  salesToday: number | null,
  ledgerPartial: boolean,
): { avgSalesPerDay: number | null; expectedThisMonth: number | null } {
  // Trust the ledger for averages only when it's a full, consistent sales ledger.
  if (avgMonthly > 0 && !ledgerPartial) {
    return { avgSalesPerDay: avgMonthly / 30, expectedThisMonth: avgMonthly };
  }
  // Otherwise estimate from the latest observed day (limited history — hinted in UI).
  if (salesToday) return { avgSalesPerDay: salesToday, expectedThisMonth: salesToday * WORKING_DAYS };
  return { avgSalesPerDay: null, expectedThisMonth: null };
}

function buildSalesByCategory(
  sales?: ParsedFile,
  daily?: ParsedFile,
): { salesByCategory: Slice[]; salesByCategorySource: string } {
  const agg = new Map<string, number>();
  let source = '';
  if (sales?.salesLines?.length) {
    for (const l of sales.salesLines) agg.set(l.cleanCategory, (agg.get(l.cleanCategory) ?? 0) + l.amount);
    source = `Item-wise sales · ${sales.reportDate ?? ''}`;
  } else if (daily?.dailyCategories?.length) {
    for (const c of daily.dailyCategories) if (c.sale > 0) agg.set(c.cleanCategory, (agg.get(c.cleanCategory) ?? 0) + c.sale);
    source = `Daily analysis · ${daily.reportDate ?? ''}`;
  }
  return { salesByCategory: topNWithOther(agg, 8), salesByCategorySource: source };
}

function buildBestSellers(sales?: ParsedFile, daily?: ParsedFile, ledger: LedgerItem[] = []): BestSeller[] {
  const gpByCat = new Map<string, number>();
  for (const c of daily?.dailyCategories ?? []) if (c.gpPct != null) gpByCat.set(norm(c.category), c.gpPct);

  if (sales?.salesLines?.length) {
    return [...sales.salesLines]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12)
      .map((l) => ({
        label: l.cleanCategory, category: l.cleanCategory, value: l.amount,
        qty: l.qty, unit: l.unit, gp: gpByCat.get(norm(l.description)) ?? null,
      }));
  }
  // Fallback: ledger totals
  return [...ledger]
    .filter((i) => i.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((i) => ({ label: i.cleanCategory, category: i.cleanCategory, value: i.total, qty: 0, unit: '', gp: null }));
}

function buildMovingSet(sales?: ParsedFile, daily?: ParsedFile, ledger: LedgerItem[] = []): Set<string> {
  const moving = new Set<string>();
  for (const l of sales?.salesLines ?? []) moving.add(norm(l.description));
  for (const c of daily?.dailyCategories ?? []) if (c.sale > 0) moving.add(norm(c.category));
  for (const i of ledger) if (i.total > 0) moving.add(norm(i.description));
  return moving;
}

const AGING_MONTHS = 12; // stock whose newest inward is older than this is "aged"

function buildDeadStock(
  stockItems: StockItem[],
  ledgerByName: Map<string, LedgerItem>,
  moving: Set<string>,
  batches: import('../types').StockBatch[],
  asOfDate: string | null,
  ledgerPartial: boolean,
): { deadStock: StockItem[]; deadStockValue: number | null; deadStockCount: number; deadStockCoverageNote: string } {
  if (!stockItems.length) {
    return { deadStock: [], deadStockValue: null, deadStockCount: 0, deadStockCoverageNote: '' };
  }

  // Newest inward date per item code — the trustworthy aging signal from batch data.
  const newestInward = new Map<string, string>();
  for (const b of batches) {
    if (!b.recDate) continue;
    const prev = newestInward.get(b.code);
    if (!prev || b.recDate > prev) newestInward.set(b.code, b.recDate);
  }
  const cutoff = cutoffISO(asOfDate, AGING_MONTHS);
  const useAging = newestInward.size > 0;
  const useLedger = ledgerByName.size > 0 && !ledgerPartial;

  const dead: StockItem[] = [];
  for (const it of stockItems) {
    if (it.value <= 0) continue;
    if (moving.has(norm(it.name))) continue; // sold recently — not dead

    if (useAging) {
      const newest = newestInward.get(it.code);
      if (newest && newest < cutoff) dead.push(it); // no fresh inward in a year
    } else if (useLedger) {
      const led = ledgerByName.get(norm(it.name));
      if (led && led.total === 0) dead.push(it);
    }
    // else: no reliable movement signal — don't over-flag.
  }
  dead.sort((a, b) => b.value - a.value);
  const deadStockValue = dead.reduce((s, it) => s + it.value, 0);

  let note: string;
  if (useAging) note = `Aged inventory: in stock, not sold recently, and no fresh purchase in over ${AGING_MONTHS} months (from batch inward dates).`;
  else if (useLedger) note = `Judged against ledger movement history; items absent from the ledger are excluded.`;
  else note = ledgerPartial
    ? `The uploaded ledger looks partial, so dead stock is inferred only from today's sales. Upload a batch stock report for reliable aging.`
    : `No ledger or batch history uploaded — dead stock inferred only from today's sales.`;

  return { deadStock: dead.slice(0, 300), deadStockValue, deadStockCount: dead.length, deadStockCoverageNote: note };
}

function cutoffISO(asOfDate: string | null, months: number): string {
  const base = asOfDate ? new Date(asOfDate) : new Date();
  base.setMonth(base.getMonth() - months);
  return base.toISOString().slice(0, 10);
}

function buildReorder(stockItems: StockItem[], ledgerByName: Map<string, LedgerItem>): ReorderRow[] {
  if (!stockItems.length || !ledgerByName.size) return [];
  const rows: ReorderRow[] = [];
  for (const it of stockItems) {
    if (it.currentStock <= 0 || it.value <= 0) continue;
    const led = ledgerByName.get(norm(it.name));
    if (!led) continue;
    const months = Object.values(led.months).filter((v) => v > 0);
    if (!months.length) continue;
    const avgMonthlyValue = months.reduce((s, v) => s + v, 0) / months.length;
    if (avgMonthlyValue <= 0) continue;
    const monthsCover = it.value / avgMonthlyValue;
    if (monthsCover < REORDER_MONTHS_COVER) {
      rows.push({
        code: it.code, name: it.name, category: it.cleanCategory,
        currentStock: it.currentStock, stockValue: it.value, avgMonthlyValue, monthsCover,
      });
    }
  }
  return rows.sort((a, b) => a.monthsCover - b.monthsCover).slice(0, 100);
}

// Detect trailing size tokens in item names: XS/S/M/L/XL.., or numeric sizes.
const SIZE_TOKEN = /\s+(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|FREE|\d{1,3})$/i;

function buildVariants(stockItems: StockItem[]): VariantGroup[] {
  // base -> (size -> {stock, value}); merge duplicate size tokens under one base.
  const groups = new Map<string, Map<string, { stock: number; value: number }>>();
  for (const it of stockItems) {
    const m = it.name.match(SIZE_TOKEN);
    if (!m) continue;
    const size = m[1].toUpperCase();
    const base = it.name.slice(0, it.name.length - m[0].length).trim();
    if (!base) continue;
    const sizes = groups.get(base) ?? new Map();
    const prev = sizes.get(size) ?? { stock: 0, value: 0 };
    sizes.set(size, { stock: prev.stock + it.currentStock, value: prev.value + it.value });
    groups.set(base, sizes);
  }
  return [...groups.entries()]
    .map(([base, sizeMap]) => {
      const sizes = [...sizeMap.entries()].map(([size, v]) => ({ size, ...v }));
      return { base, sizes, totalStock: sizes.reduce((s, x) => s + Math.max(x.stock, 0), 0) };
    })
    .filter((g) => g.sizes.length >= 2) // only genuine size runs
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 60);
}

function topNWithOther(agg: Map<string, number>, n: number): Slice[] {
  const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, n).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push({ label: 'Other', value: rest });
  return top;
}
