import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, type Column } from '../components/ui/DataTable';
import { useDashboard } from '../lib/analytics/useDashboard';
import type { StockItem } from '../lib/types';
import type { BestSeller, ReorderRow, VariantGroup } from '../lib/analytics/model';
import { inr, num, pct } from '../lib/format';

type Tab = 'best' | 'dead' | 'reorder' | 'variants';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'best', label: 'Best Sellers', icon: '🏆' },
  { id: 'reorder', label: 'Reorder Soon', icon: '📦' },
  { id: 'dead', label: 'Not Selling', icon: '🐌' },
  { id: 'variants', label: 'Size / Variant', icon: '📐' },
];

export function ProductsPage() {
  const d = useDashboard();
  const [tab, setTab] = useState<Tab>('best');

  if (!d.hasAnyData) {
    return (
      <div className="page">
        <PageHeader eyebrow="Product & Stock" title="Product & Stock Lists" />
        <EmptyState icon="▦" title="No stock data yet"
          message="Upload a stock report (and ledger summary for velocity) to see best sellers, dead stock and reorder alerts."
          cta={{ to: '/upload', label: 'Upload exports' }} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Product & Stock" title="Every SKU, sorted by what to do next"
        lede="Best sellers to reorder, capital stuck in non-movers, and a textile-specific size view derived from item names." />

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'best' && <BestTab rows={d.bestSellers} />}
      {tab === 'reorder' && <ReorderTab rows={d.reorder} />}
      {tab === 'dead' && <DeadTab rows={d.deadStock} note={d.deadStockCoverageNote} total={d.deadStockValue} count={d.deadStockCount} />}
      {tab === 'variants' && <VariantsTab groups={d.variants} />}
    </div>
  );
}

function BestTab({ rows }: { rows: BestSeller[] }) {
  const columns: Column<BestSeller>[] = [
    { key: 'r', header: '#', width: '40px', render: (_r) => '' },
    { key: 'label', header: 'Product / Category', render: (b) => <span className="cell-strong">{b.label}</span> },
    { key: 'qty', header: 'Units', align: 'right', render: (b) => (b.qty ? `${num(b.qty)} ${b.unit.toLowerCase()}` : '—') },
    { key: 'gp', header: 'GP%', align: 'right', render: (b) => (b.gp != null ? <span className={b.gp >= 25 ? 'pos' : ''}>{pct(b.gp)}</span> : '—') },
    { key: 'value', header: 'Sales Value', align: 'right', render: (b) => <strong>{inr(b.value)}</strong> },
  ];
  const ranked = rows.map((r, i) => ({ ...r, _rank: i + 1 }));
  columns[0].render = (b) => <span className="rank num">{(b as BestSeller & { _rank: number })._rank}</span>;
  return (
    <Card eyebrow="Top by sales value" title="Best Sellers">
      <DataTable columns={columns} rows={ranked} rowKey={(b) => b.label} empty="Upload a sales summary to rank best sellers." />
    </Card>
  );
}

function ReorderTab({ rows }: { rows: ReorderRow[] }) {
  const columns: Column<ReorderRow>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="cell-strong">{r.name}</span> },
    { key: 'cat', header: 'Category', render: (r) => <span className="muted">{r.category}</span> },
    { key: 'stock', header: 'In Stock', align: 'right', render: (r) => <span className={r.currentStock <= 2 ? 'neg' : ''}>{num(r.currentStock)}</span> },
    { key: 'cover', header: 'Cover', align: 'right', render: (r) => <strong>{r.monthsCover.toFixed(1)} mo</strong> },
    { key: 'vel', header: 'Sells / mo', align: 'right', render: (r) => inr(r.avgMonthlyValue, { compact: true }) },
  ];
  return (
    <Card eyebrow="Under one month of cover" title="Reorder Soon"
      note="Cover = current stock value ÷ average monthly sales value (from the ledger). Under 1 month means you may run out before the next fill.">
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.code + r.name} maxHeight={560}
        empty="Upload both a stock report and a ledger summary to compute reorder cover." />
    </Card>
  );
}

function DeadTab({ rows, note, total, count }: { rows: StockItem[]; note: string; total: number | null; count: number }) {
  const columns: Column<StockItem>[] = [
    { key: 'name', header: 'Product', render: (s) => <span className="cell-strong">{s.name}</span> },
    { key: 'cat', header: 'Category', render: (s) => <span className="muted">{s.cleanCategory}</span> },
    { key: 'stock', header: 'In Stock', align: 'right', render: (s) => num(s.currentStock) },
    { key: 'rack', header: 'Rack', align: 'right', render: (s) => s.rackNo || <span className="muted">—</span> },
    { key: 'value', header: 'Locked Value', align: 'right', render: (s) => <strong>{inr(s.value)}</strong> },
  ];
  return (
    <Card eyebrow={`${count} items · ${total != null ? inr(total, { compact: true }) : '—'} tied up`} title="Stock Not Selling" note={note}>
      <DataTable columns={columns} rows={rows} rowKey={(s) => s.code + s.name} maxHeight={560}
        empty="No non-movers detected (or no ledger uploaded to judge movement)." />
    </Card>
  );
}

function VariantsTab({ groups }: { groups: VariantGroup[] }) {
  if (!groups.length) {
    return (
      <Card eyebrow="Textile-specific" title="Size / Variant view">
        <p className="muted">
          No size runs detected in item names yet. This view groups items like “…SHIRT M / L / XL” when Marg names embed a size suffix —
          it’s heuristic, so treat it as a starting point rather than a definitive size matrix.
        </p>
      </Card>
    );
  }
  return (
    <Card eyebrow="Heuristic — parsed from item names" title="Size / Variant view"
      note="Detected by reading trailing size tokens (S/M/L/XL, numeric sizes) in product names. Verify against Marg before acting on gaps.">
      <div className="variant-grid">
        {groups.map((g) => {
          const max = Math.max(...g.sizes.map((s) => Math.max(s.stock, 0)), 1);
          return (
            <div key={g.base} className="variant-card">
              <div className="vc-head">
                <span className="vc-base">{g.base}</span>
                <span className="vc-total num">{g.totalStock} pcs</span>
              </div>
              <div className="vc-sizes">
                {g.sizes.map((s) => (
                  <div key={s.size} className="vc-size">
                    <span className="vcs-label">{s.size}</span>
                    <div className="vcs-track">
                      <div className={`vcs-fill ${s.stock <= 0 ? 'out' : ''}`} style={{ height: `${(Math.max(s.stock, 0) / max) * 100}%` }} />
                    </div>
                    <span className={`vcs-num num ${s.stock <= 0 ? 'neg' : ''}`}>{s.stock}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
