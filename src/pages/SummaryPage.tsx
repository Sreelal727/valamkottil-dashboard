import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { TrendChart } from '../components/charts/TrendChart';
import { BarList } from '../components/charts/BarList';
import { useDashboard } from '../lib/analytics/useDashboard';
import { inr } from '../lib/format';

export function SummaryPage() {
  const d = useDashboard();

  if (!d.hasAnyData) {
    return (
      <div className="page">
        <PageHeader eyebrow="Business Summary" title="Good morning, Valamkottil" />
        <EmptyState
          icon="🧵"
          title="No data yet"
          message="Upload your Marg exports to light up the dashboard — start with a stock report and a daily analysis."
          cta={{ to: '/upload', label: 'Upload Marg exports' }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Business Summary"
        title="The shop at a glance"
        lede={d.salesTodaySource ? `Latest sales figure from ${d.salesTodaySource}.` : 'Upload a sales file to see today’s takings.'}
      />

      <div className="stat-grid">
        <StatCard label="Sales Today" hue="marigold" accent icon="🧾"
          value={d.salesToday != null ? inr(d.salesToday) : '—'}
          hint={d.salesTodaySource ?? 'No sales file uploaded'} />
        <StatCard label="Avg Sales / Day" hue="teal" icon="📊"
          value={d.avgSalesPerDay != null ? inr(d.avgSalesPerDay, { compact: true }) : '—'}
          hint={d.ledgerPartial ? 'From latest day — upload more for a true average' : 'From ledger monthly history'} />
        <StatCard label="Expected This Month" hue="indigo" icon="📈"
          value={d.expectedThisMonth != null ? inr(d.expectedThisMonth, { compact: true }) : '—'}
          hint={d.ledgerPartial ? 'Projected from today × trading days' : 'Run-rate projection'} />
        <StatCard label="Total Stock Value" hue="grass" icon="📦"
          value={d.totalStockValue != null ? inr(d.totalStockValue, { compact: true }) : '—'}
          hint="Positive stock only" />
        <StatCard label="Dead Stock Value" hue="coral" tone="warn" icon="🐌"
          value={d.deadStockValue != null ? inr(d.deadStockValue, { compact: true }) : '—'}
          hint={d.deadStockCount ? `${d.deadStockCount} non-moving items` : 'No dead stock detected'} />
        <StatCard label="Data Quality Flags" hue={d.flagCount ? 'rose' : 'grass'} tone={d.flagCount ? 'bad' : 'good'} icon="⚠️"
          value={d.flagCount}
          hint={d.stockDiscrepancyCount ? `${d.stockDiscrepancyCount} negative-stock rows` : 'Rows needing correction in Marg'} />
      </div>

      <div className="grid-2">
        <Card eyebrow="Monthly momentum" title="Sales trend" span={2}
          note={
            d.monthlyTrend.length < 2
              ? 'Upload a ledger summary to populate the monthly trend.'
              : d.ledgerPartial
                ? 'Heads up: this ledger export’s monthly totals are well below your observed daily sales — it looks partial. Re-export a full sales ledger for an accurate trend.'
                : undefined
          }>
          <TrendChart data={d.monthlyTrend} />
        </Card>
      </div>

      <div className="grid-2">
        <Card eyebrow={d.salesByCategorySource || 'Sales mix'} title="Top categories today">
          <BarList data={d.salesByCategory.slice(0, 6).map((s) => ({ label: s.label, value: s.value }))} />
        </Card>
        <Card eyebrow="Needs attention" title="Data quality" note="Fix these at source in Marg — the dashboard surfaces them so totals stay honest.">
          <div className="dq-list">
            <DQRow label="Negative / oversold stock" count={d.stockDiscrepancyCount} value={d.stockDiscrepancyValue} tone="bad" />
            <DQRow label="Missing supplier" count={d.flags.filter((f) => f.kind === 'missingSupplier').length} tone="warn" />
            <DQRow label="Missing price" count={d.flags.filter((f) => f.kind === 'zeroPrice').length} tone="warn" />
            <DQRow label="No rack location" count={d.flags.filter((f) => f.kind === 'missingRack').length} tone="info" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function DQRow({ label, count, value, tone }: { label: string; count: number; value?: number; tone: string }) {
  return (
    <div className="dq-row">
      <span className={`dq-dot tone-${tone}`} />
      <span className="dq-label">{label}</span>
      <span className="dq-count num">{count}{value ? <em className="dq-value"> · {inr(value)}</em> : null}</span>
    </div>
  );
}
