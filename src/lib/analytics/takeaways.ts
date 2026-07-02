import type { DailyHeadline, StockItem } from '../types';
import { inr, pct } from '../format';
import type { Dashboard, Takeaway, TakeawayGroup } from './model';

// Auto-generated plain-English intelligence — PentaSky's standout feature, retold
// for a single outlet. Every line is grounded in the derived numbers above.
export function buildTakeaways(
  d: Dashboard,
  ctx: { headline?: DailyHeadline; deadStock: StockItem[] },
): TakeawayGroup[] {
  const today: Takeaway[] = [];
  const month: Takeaway[] = [];
  const watch: Takeaway[] = [];
  const quality: Takeaway[] = [];

  // ---- Today ----
  if (d.salesToday != null) {
    const vs = d.avgSalesPerDay
      ? ` — ${d.salesToday >= d.avgSalesPerDay ? 'above' : 'below'} the ${inr(d.avgSalesPerDay, { compact: true })}/day average`
      : '';
    today.push({
      icon: '🧾', tone: d.avgSalesPerDay && d.salesToday >= d.avgSalesPerDay ? 'good' : 'info',
      headline: `${inr(d.salesToday)} taken today`,
      detail: `Across ${ctx.headline?.salesBills ?? '—'} bills${vs}.`,
    });
  }
  const hero = d.categoryGP[0] ?? (d.salesByCategory[0] && { label: d.salesByCategory[0].label, sale: d.salesByCategory[0].value, gp: 0, stockValue: 0 });
  if (hero) {
    today.push({
      icon: '🏆', tone: 'good',
      headline: `Hero of the day: ${hero.label}`,
      detail: `${inr(hero.sale)} in sales${hero.gp ? ` at ${pct(hero.gp)} gross margin` : ''}.`,
    });
  }
  const bestMargin = [...d.categoryGP].filter((c) => c.sale > 200).sort((a, b) => b.gp - a.gp)[0];
  if (bestMargin && bestMargin.label !== hero?.label) {
    today.push({
      icon: '💹', tone: 'good',
      headline: `Fattest margin today: ${bestMargin.label}`,
      detail: `${pct(bestMargin.gp)} GP on ${inr(bestMargin.sale)} of sales — push this line.`,
    });
  }
  if (d.cashVsCredit) {
    const { cash, credit } = d.cashVsCredit;
    const total = cash + credit || 1;
    today.push({
      icon: '💵', tone: credit > cash ? 'watch' : 'info',
      headline: `${Math.round((cash / total) * 100)}% of takings were cash`,
      detail: credit > 0 ? `${inr(credit)} went on credit — chase settlement.` : 'No credit sales booked today.',
    });
  }

  // ---- This month ----
  if (d.expectedThisMonth != null) {
    month.push({
      icon: '📈', tone: 'info',
      headline: `On track for ${inr(d.expectedThisMonth, { compact: true })} this month`,
      detail: 'Run-rate projection from recent daily pace and monthly history.',
    });
  }
  if (d.monthlyTrend.length >= 2) {
    const last = d.monthlyTrend[d.monthlyTrend.length - 1];
    const prev = d.monthlyTrend[d.monthlyTrend.length - 2];
    if (prev.value > 0) {
      const delta = ((last.value - prev.value) / prev.value) * 100;
      month.push({
        icon: delta >= 0 ? '⬆️' : '⬇️', tone: delta >= 0 ? 'good' : 'watch',
        headline: `${last.label} sales ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(0)}% vs ${prev.label}`,
        detail: `${inr(last.value, { compact: true })} vs ${inr(prev.value, { compact: true })}.`,
      });
    }
  }
  if (d.payables) {
    month.push({
      icon: '🏭', tone: 'watch',
      headline: `${inr(d.payables.totalOwed, { compact: true })} owed to suppliers`,
      detail: `Across ${d.payables.supplierCount} suppliers${d.payables.top[0] ? `; most to ${d.payables.top[0].ledger} (${inr(-d.payables.top[0].balance, { compact: true })})` : ''}.`,
    });
  }

  // ---- Watchlist ----
  if (d.reorder.length) {
    const r = d.reorder[0];
    watch.push({
      icon: '📦', tone: 'watch',
      headline: `${d.reorder.length} lines under a month of cover`,
      detail: `Tightest: ${r.name} — ${r.currentStock} left, ~${r.monthsCover.toFixed(1)} months of stock. Reorder soon.`,
    });
  }
  if (d.deadStockValue && d.deadStockCount) {
    const big = ctx.deadStock[0];
    watch.push({
      icon: '🐌', tone: 'bad',
      headline: `${inr(d.deadStockValue, { compact: true })} tied up in ${d.deadStockCount} non-movers`,
      detail: big ? `Biggest: ${big.name} (${inr(big.value, { compact: true })} on the shelf, no recent sales).` : 'Consider clearance or return.',
    });
  }

  // ---- Data quality ----
  if (d.stockDiscrepancyCount) {
    quality.push({
      icon: '⚠️', tone: 'bad',
      headline: `${d.stockDiscrepancyCount} items show negative stock`,
      detail: `Worth ${inr(d.stockDiscrepancyValue)} of discrepancy — fix these entries in Marg so totals stay honest.`,
    });
  }
  const missingSupplier = d.flags.filter((f) => f.kind === 'missingSupplier').length;
  if (missingSupplier) {
    quality.push({
      icon: '🔍', tone: 'watch',
      headline: `${missingSupplier} in-stock items have no supplier`,
      detail: 'Tag the supplier at purchase entry to unlock payables aging and reorder sourcing.',
    });
  }
  const zeroPrice = d.flags.filter((f) => f.kind === 'zeroPrice').length;
  if (zeroPrice) {
    quality.push({
      icon: '🏷️', tone: 'watch',
      headline: `${zeroPrice} in-stock items are missing a price`,
      detail: 'These distort margin and stock value until priced in Marg.',
    });
  }
  quality.push({
    icon: '🧵', tone: 'info',
    headline: 'Brand data not yet trustworthy',
    detail: 'Marg’s “Company” field just echoes the category. Start tagging real brands at purchase entry to unlock brand analysis later.',
  });

  return [
    { title: 'Today’s Highlights', subtitle: d.asOfDate ? `As on ${d.asOfDate}` : 'Latest upload', items: today },
    { title: 'This Month', subtitle: 'Trend & obligations', items: month },
    { title: 'Watchlist', subtitle: 'Stock that needs a decision', items: watch },
    { title: 'Data Quality', subtitle: 'Fix at source in Marg', items: quality },
  ].filter((g) => g.items.length > 0);
}
