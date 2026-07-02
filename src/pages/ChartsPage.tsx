import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Donut } from '../components/charts/Donut';
import { BarList } from '../components/charts/BarList';
import { TrendChart } from '../components/charts/TrendChart';
import { useDashboard } from '../lib/analytics/useDashboard';
import { inr, pct } from '../lib/format';

export function ChartsPage() {
  const d = useDashboard();

  if (!d.hasAnyData) {
    return (
      <div className="page">
        <PageHeader eyebrow="Charts" title="Charts" />
        <EmptyState title="Nothing to chart yet" message="Upload sales, ledger and daily-analysis exports to populate the charts."
          cta={{ to: '/upload', label: 'Upload exports' }} />
      </div>
    );
  }

  const cashTotal = d.cashVsCredit ? d.cashVsCredit.cash + d.cashVsCredit.credit : 0;

  return (
    <div className="page">
      <PageHeader eyebrow="Charts" title="What sold, and how well"
        lede="Category-first — the way your Power BI works today, but cleaned of the GST-rate prefix and with margin added." />

      <div className="grid-2">
        <Card eyebrow={d.salesByCategorySource || 'Sales mix'} title="Sales by Category"
          note="Grouped by real cloth-type category (GST-rate prefix stripped). We deliberately don’t chart “brand” — Marg’s Company field only echoes the category.">
          <Donut data={d.salesByCategory} />
        </Card>

        <Card eyebrow="Margin" title="Category-wise Gross Profit %"
          note="From the Daily Analysis report — the margin view your current dashboard is missing.">
          {d.categoryGP.length ? (
            <BarList
              accent="--teal"
              data={d.categoryGP.slice(0, 10).map((c) => ({
                label: c.label,
                value: c.gp,
                sub: `${inr(c.sale)} sold`,
                badge: { text: pct(c.gp), tone: c.gp >= 25 ? 'good' : c.gp >= 15 ? 'warn' : 'bad' },
              }))}
              format={(v) => pct(v)}
            />
          ) : (
            <p className="muted">Upload a Daily Analysis report to see gross-profit by category.</p>
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card eyebrow="Leaderboard" title="Best-Selling Products">
          <BarList
            data={d.bestSellers.slice(0, 10).map((b) => ({
              label: b.label,
              value: b.value,
              sub: b.qty ? `${b.qty} ${b.unit.toLowerCase()}` : undefined,
              badge: b.gp != null ? { text: `${pct(b.gp)} GP`, tone: b.gp >= 25 ? 'good' : 'warn' } : undefined,
            }))}
          />
        </Card>

        <Card eyebrow="Payment mix" title="Cash vs Credit"
          note="From the Daily Analysis header — credit sales are money still to collect.">
          {d.cashVsCredit && cashTotal > 0 ? (
            <div className="split">
              <div className="split-bar">
                <div className="split-cash" style={{ width: `${(d.cashVsCredit.cash / cashTotal) * 100}%` }}>
                  <span>Cash</span>
                </div>
                <div className="split-credit" style={{ width: `${(d.cashVsCredit.credit / cashTotal) * 100}%` }}>
                  {d.cashVsCredit.credit > 0 && <span>Credit</span>}
                </div>
              </div>
              <div className="split-legend">
                <div><span className="dot cash" /> Cash <strong className="num">{inr(d.cashVsCredit.cash)}</strong></div>
                <div><span className="dot credit" /> Credit <strong className="num">{inr(d.cashVsCredit.credit)}</strong></div>
              </div>
            </div>
          ) : (
            <p className="muted">Upload a Daily Analysis report to see the cash/credit split.</p>
          )}
        </Card>
      </div>

      <Card eyebrow="Monthly" title="Sales Trend" span={2}>
        <TrendChart data={d.monthlyTrend} height={240} />
      </Card>
    </div>
  );
}
