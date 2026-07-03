import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { GanttChart, type GanttRow } from '../components/charts/GanttChart';
import { SeasonHeatmap } from '../components/charts/SeasonHeatmap';
import { useDashboard } from '../lib/analytics/useDashboard';
import type { AgingBar } from '../lib/analytics/model';
import { inr, num, dateLabel } from '../lib/format';

type View = 'aging' | 'lots' | 'season';

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: 'aging', label: 'Stock Aging', icon: '📊' },
  { id: 'lots', label: 'Purchase Lots', icon: '🧱' },
  { id: 'season', label: 'Sales Seasonality', icon: '🗓️' },
];

const ageMonths = (days: number) => (days / 30).toFixed(days < 60 ? 1 : 0);

function agingRow(a: AgingBar, todayIso: string): GanttRow {
  return {
    key: a.code + a.name,
    label: a.name,
    sub: `${num(a.currentStock)} pcs · ${inr(a.value, { compact: true })}`,
    right: `${ageMonths(a.ageDays)} mo`,
    bars: [{
      startIso: a.startIso,
      endIso: todayIso,
      bucket: a.bucket,
      tooltip: `${a.name}\nIn since ${dateLabel(a.startIso)} — ${ageMonths(a.ageDays)} months on shelf\n${num(a.currentStock)} pcs · ${inr(a.value)}`,
    }],
  };
}

// One thin bar per purchase lot, grouped under a product header row.
function lotRows(a: AgingBar, todayIso: string): GanttRow[] {
  const header: GanttRow = {
    key: `h-${a.code}`,
    label: a.name,
    sub: `${a.lots.length} lots`,
    bars: [],
  };
  const lots: GanttRow[] = a.lots.map((l, i) => ({
    key: `${a.code}-${i}`,
    label: l.supplier || '—',
    sub: dateLabel(l.startIso),
    indent: true,
    right: `${num(l.stock)}`,
    bars: [{
      startIso: l.startIso,
      endIso: todayIso,
      bucket: l.ageDays > 365 ? 'dead' : l.ageDays > 90 ? 'aging' : 'fresh',
      tooltip: `${l.supplier || 'Unknown supplier'}\nInward ${dateLabel(l.startIso)} — ${(l.ageDays / 30).toFixed(0)} months ago\n${num(l.stock)} pcs · ${inr(l.value)}`,
    }],
  }));
  return [header, ...lots];
}

export function TimelinePage() {
  const d = useDashboard();
  const t = d.timeline;
  const [view, setView] = useState<View>('aging');

  if (!d.hasAnyData) {
    return (
      <div className="page">
        <PageHeader eyebrow="Timeline" title="Stock & Sales Timeline" />
        <EmptyState icon="📊" title="No data yet"
          message="Upload a batch stock report (stock_91-style) to see how long each product has been sitting, and a ledger for the sales-by-month view."
          cta={{ to: '/upload', label: 'Upload exports' }} />
      </div>
    );
  }

  const b = t.bucketCounts;
  const bv = t.bucketValue;

  return (
    <div className="page">
      <PageHeader eyebrow="Timeline · Gantt" title="How long has it been sitting?"
        lede="A time-axis view of the shop: each bar spans from when stock arrived to today. Long bars are capital that hasn’t moved — the same signal as “Not Selling”, but you can see it." />

      <div className="tabs" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id}
            className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => setView(v.id)}>
            <span aria-hidden>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {(view === 'aging' || view === 'lots') && (
        <>
          <div className="age-legend">
            <LegendChip tone="fresh" label="Fresh · < 3 mo" count={b.fresh} value={bv.fresh} />
            <LegendChip tone="aging" label="Aging · 3–12 mo" count={b.aging} value={bv.aging} />
            <LegendChip tone="dead" label="Dead · > 12 mo" count={b.dead} value={bv.dead} />
          </div>

          {!t.hasBatch ? (
            <EmptyState compact icon="🧱" title="No batch stock report"
              message="The Stock Aging & Purchase Lots views need the batch stock export (stock_91-style) with inward dates."
              cta={{ to: '/upload', label: 'Upload batch stock' }} />
          ) : !t.aging.length || !t.axisStartIso ? (
            <Card><p className="muted">No stock currently on the shelf with a recorded inward date.</p></Card>
          ) : view === 'aging' ? (
            <Card eyebrow={`Oldest ${t.aging.length} of ${num(t.agingTotal)} products on shelf`} title="Stock Aging Gantt"
              note="Bars end at today; they start when the oldest still-held lot arrived. Colour = age bucket. Hover a bar for detail.">
              <GanttChart rows={t.aging.map((a) => agingRow(a, t.todayIso))} axisStartIso={t.axisStartIso} axisEndIso={t.todayIso} />
            </Card>
          ) : (
            <Card eyebrow="Purchase consignments (FIFO)" title="Purchase Lots Gantt"
              note="Each thin bar is one inward consignment still in stock, under its product. Reveals how many old lots are still sitting behind newer ones.">
              <GanttChart
                rows={t.aging.slice(0, 20).flatMap((a) => lotRows(a, t.todayIso))}
                axisStartIso={t.axisStartIso}
                axisEndIso={t.todayIso}
              />
            </Card>
          )}
        </>
      )}

      {view === 'season' && (
        <Card eyebrow="Item × month sales" title="Sales Seasonality"
          note={t.ledgerPartial
            ? 'Heads up: the uploaded ledger looks partial (monthly totals well below observed daily sales), so this grid is sparse. Re-export a full sales ledger to populate it.'
            : 'Darker cells = stronger sales that month. Use it to spot seasonal categories and plan buying.'}>
          {t.seasonality ? (
            <SeasonHeatmap data={t.seasonality} />
          ) : (
            <p className="muted">Upload a ledger summary to build the month-by-month sales grid.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function LegendChip({ tone, label, count, value }: { tone: string; label: string; count: number; value: number }) {
  return (
    <div className="age-chip">
      <span className={`age-swatch bucket-${tone}`} />
      <span className="age-chip-label">{label}</span>
      <span className="age-chip-count num">{num(count)}</span>
      <span className="age-chip-val num">{inr(value, { compact: true })}</span>
    </div>
  );
}
