import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { BarList } from '../components/charts/BarList';
import { DataTable, type Column } from '../components/ui/DataTable';
import { useDashboard } from '../lib/analytics/useDashboard';
import type { Creditor } from '../lib/types';
import { inr, dateLabel } from '../lib/format';

export function PayablesPage() {
  const d = useDashboard();
  const p = d.payables;

  if (!p) {
    return (
      <div className="page">
        <PageHeader eyebrow="Supplier Payables" title="Supplier Payables" />
        <EmptyState icon="🏭" title="No creditors file uploaded"
          message="Upload the Sundry Creditors / Trial Balance export to see who the shop owes and how much."
          cta={{ to: '/upload', label: 'Upload creditors file' }} />
      </div>
    );
  }

  const ageBySupplier = new Map(p.aging.map((a) => [a.supplier, a]));

  const columns: Column<Creditor>[] = [
    { key: 'ledger', header: 'Supplier', render: (c) => <span className="cell-strong">{c.ledger}</span> },
    { key: 'opening', header: 'Opening', align: 'right', render: (c) => inr(c.opening) },
    { key: 'debit', header: 'Paid (Debit)', align: 'right', render: (c) => inr(c.debit) },
    { key: 'credit', header: 'Billed (Credit)', align: 'right', render: (c) => inr(c.credit) },
    { key: 'balance', header: 'Owed', align: 'right', render: (c) => <strong className={c.balance < 0 ? 'neg' : 'pos'}>{inr(-c.balance)}</strong> },
    {
      key: 'age', header: 'Oldest inward', align: 'right',
      render: (c) => {
        const a = ageBySupplier.get(c.ledger);
        return a?.oldestInwardIso ? <span title={`${a.ageDays} days`}>{dateLabel(a.oldestInwardIso)}</span> : <span className="muted">—</span>;
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader eyebrow="Supplier Payables" title="Who the shop owes"
        lede="Accounts payable from your Sundry Creditors export — the opposite direction from a distributor’s “money owed by shops”. Negative balances mean settlement is still due." />

      <div className="stat-grid stat-grid-3">
        <StatCard label="Total Payable" hue="rose" accent icon="🏭" value={inr(p.totalOwed, { compact: true })} hint={`${p.supplierCount} suppliers awaiting payment`} />
        <StatCard label="Advances / Credits" hue="teal" icon="↩︎" value={inr(p.advances, { compact: true })} hint="Suppliers who owe the shop" />
        <StatCard label="Net Position" hue={p.netBalance < 0 ? 'coral' : 'grass'} tone={p.netBalance < 0 ? 'warn' : 'good'} icon="⚖︎"
          value={inr(Math.abs(p.netBalance), { compact: true })} hint={p.netBalance < 0 ? 'Net payable' : 'Net receivable'} />
      </div>

      <div className="grid-2">
        <Card eyebrow="Concentration" title="Top suppliers owed"
          note="Aging is indicative — derived from the oldest unpaid inward invoice per supplier in the batch stock export.">
          <BarList
            accent="--negative"
            data={p.top.map((c) => {
              const a = ageBySupplier.get(c.ledger);
              return {
                label: c.ledger,
                value: -c.balance,
                sub: a?.ageDays != null ? `oldest inward ${a.ageDays}d ago` : undefined,
              };
            })}
          />
        </Card>
        <Card eyebrow="Reading this" title="What these columns mean">
          <ul className="explainer">
            <li><strong>Opening</strong> — balance carried in at the period start (negative = owed).</li>
            <li><strong>Paid (Debit)</strong> — payments the shop made to the supplier.</li>
            <li><strong>Billed (Credit)</strong> — fresh purchases billed by the supplier.</li>
            <li><strong>Owed</strong> — what’s still due now. This is your payables number.</li>
            <li><strong>Oldest inward</strong> — earliest un-cleared purchase invoice from the batch stock file, a proxy for how stale the debt is.</li>
          </ul>
        </Card>
      </div>

      <Card eyebrow={`${p.all.length} suppliers`} title="Full payables ledger" span={2}>
        <DataTable columns={columns} rows={p.all} rowKey={(c) => c.ledger} maxHeight={520} empty="No outstanding supplier balances." />
      </Card>
    </div>
  );
}
