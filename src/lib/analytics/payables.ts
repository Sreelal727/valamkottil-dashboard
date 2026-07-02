import type { Creditor, StockBatch } from '../types';
import { daysBetween } from '../format';
import type { Payables, SupplierAge } from './model';

// In Marg's trial balance, a NEGATIVE balance means the shop still owes the supplier.
// A positive balance means the shop has paid ahead / the supplier owes it (advance).
export function buildPayables(creditors: Creditor[], batches: StockBatch[]): Payables {
  const suppliers = creditors.filter((c) => /SUPPLIER/i.test(c.group) || c.balance !== 0);

  let totalOwed = 0;
  let advances = 0;
  let netBalance = 0;
  for (const c of creditors) {
    netBalance += c.balance;
    if (c.balance < 0) totalOwed += -c.balance;
    else if (c.balance > 0) advances += c.balance;
  }

  const owed = suppliers.filter((c) => c.balance < 0).sort((a, b) => a.balance - b.balance);
  const top = owed.slice(0, 12);

  // Aging (indicative): oldest inward invoice date per top supplier we owe, from batch data.
  const oldestBySupplier = new Map<string, string>();
  for (const b of batches) {
    if (!b.supplier || !b.invDate) continue;
    const key = b.supplier.trim().toUpperCase();
    const prev = oldestBySupplier.get(key);
    if (!prev || b.invDate < prev) oldestBySupplier.set(key, b.invDate);
  }
  const today = new Date().toISOString().slice(0, 10);
  const aging: SupplierAge[] = top.map((c) => {
    const oldest = oldestBySupplier.get(c.ledger.trim().toUpperCase()) ?? null;
    return {
      supplier: c.ledger,
      oldestInwardIso: oldest,
      ageDays: oldest ? daysBetween(oldest, today) : null,
    };
  });

  return {
    totalOwed,
    supplierCount: owed.length,
    netBalance,
    advances,
    top,
    all: owed,
    aging,
  };
}
