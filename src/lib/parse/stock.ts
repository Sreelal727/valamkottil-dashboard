import type { DataFlag, ParsedFile, StockBatch, StockItem } from '../types';
import { Row, findHeaderRow, splitGst, toISODate, toNumber, toText } from './common';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Build header-name -> column-index map so column reordering can't break parsing. */
function headerMap(header: Row): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((cell, i) => {
    const key = norm(toText(cell));
    if (key && !(key in map)) map[key] = i;
  });
  return map;
}

function col(map: Record<string, number>, ...aliases: string[]): number {
  for (const a of aliases) if (a in map) return map[a];
  return -1;
}

function findStockHeader(rows: Row[]): number {
  const idx = findHeaderRow(rows, ['code', 'product name'], 12);
  return idx >= 0 ? idx : 2;
}

export function parseStockSnapshot(rows: Row[], sourceName: string): ParsedFile {
  const hIdx = findStockHeader(rows);
  const m = headerMap(rows[hIdx]);
  const gi = (...a: string[]) => col(m, ...a);
  const iCode = gi('code'), iName = gi('productname', 'product'), iUnit = gi('unit');
  const iStock = gi('currentstock'), iCost = gi('costprice'), iValue = gi('value');
  const iMrp = gi('mrp'), iPP = gi('purchaseprice'), iSP = gi('salesprice');
  const iCompany = gi('company'), iRack = gi('rackno', 'rack'), iBarcode = gi('barcode');

  const items: StockItem[] = [];
  const flags: DataFlag[] = [];
  const seen = new Set<string>();

  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = toText(r[iName]);
    const code = toText(r[iCode]);
    if (!name && !code) continue;
    if (norm(name) === 'deal' || norm(toText(r[0])) === 'deal') continue; // sub-header remnant

    const key = code || name;
    if (seen.has(key)) continue;
    seen.add(key);

    const currentStock = toNumber(r[iStock]);
    const value = toNumber(r[iValue]);
    const salesPrice = toNumber(r[iSP]);
    const companyRaw = toText(r[iCompany]);
    const rackNo = iRack >= 0 ? toText(r[iRack]) : '';
    const { gstRate, cleanCategory } = splitGst(name);

    items.push({
      code, name, cleanCategory, gstRate,
      unit: toText(r[iUnit]) || 'PCS',
      currentStock, costPrice: toNumber(r[iCost]), value,
      mrp: toNumber(r[iMrp]), purchasePrice: toNumber(r[iPP]), salesPrice,
      companyRaw, rackNo, barcode: iBarcode >= 0 ? toText(r[iBarcode]) : '',
    });

    // Surface (never hide) data-quality issues the owner must fix in Marg.
    if (currentStock < 0 || value < 0) {
      flags.push({ kind: 'negativeStock', severity: 'high', ref: `${code} ${name}`.trim(),
        detail: `Negative stock (${currentStock}) — oversold without correction`, value });
    }
    const priced = toNumber(r[iCost]) || toNumber(r[iPP]) || salesPrice || toNumber(r[iMrp]);
    if (currentStock > 0 && priced === 0) {
      flags.push({ kind: 'zeroPrice', severity: 'medium', ref: `${code} ${name}`.trim(),
        detail: 'In stock but no cost/sale price set' });
    }
    if (!rackNo && currentStock > 0) {
      flags.push({ kind: 'missingRack', severity: 'low', ref: `${code} ${name}`.trim(),
        detail: 'No rack location assigned' });
    }
  }

  return {
    id: 'stockSnapshot:latest',
    kind: 'stockSnapshot',
    sourceName,
    reportDate: extractStockDate(rows),
    ingestedAt: Date.now(),
    rowCount: items.length,
    flags,
    stockItems: items,
  };
}

export function parseStockBatch(rows: Row[], sourceName: string): ParsedFile {
  const hIdx = findStockHeader(rows);
  const m = headerMap(rows[hIdx]);
  const gi = (...a: string[]) => col(m, ...a);
  const iCode = gi('code'), iName = gi('productname', 'product');
  const iStock = gi('currentstock'), iCost = gi('costprice'), iValue = gi('value');
  const iMrp = gi('mrp'), iPP = gi('purchaseprice');
  const iRec = gi('recdate'), iRef = gi('ref'), iSupplier = gi('supplier');
  const iInvNo = gi('invno'), iInvDate = gi('invdate');

  const batches: StockBatch[] = [];
  const flags: DataFlag[] = [];
  const missingSupplierCodes = new Set<string>();

  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = toText(r[iName]);
    const code = toText(r[iCode]);
    if (!name && !code) continue;
    if (norm(name) === 'deal') continue;

    const supplier = iSupplier >= 0 ? toText(r[iSupplier]) : '';
    const currentStock = toNumber(r[iStock]);
    const { gstRate, cleanCategory } = splitGst(name);

    batches.push({
      code, name, cleanCategory, gstRate, currentStock,
      costPrice: toNumber(r[iCost]), value: toNumber(r[iValue]),
      mrp: toNumber(r[iMrp]), purchasePrice: toNumber(r[iPP]),
      recDate: iRec >= 0 ? toISODate(r[iRec]) : null,
      supplier,
      invNo: iInvNo >= 0 ? toText(r[iInvNo]) : '',
      invDate: iInvDate >= 0 ? toISODate(r[iInvDate]) : null,
      ref: iRef >= 0 ? toText(r[iRef]) : '',
    });

    if (!supplier && currentStock > 0 && !missingSupplierCodes.has(code)) {
      missingSupplierCodes.add(code);
      flags.push({ kind: 'missingSupplier', severity: 'medium', ref: `${code} ${name}`.trim(),
        detail: 'In-stock batch with no supplier attribution' });
    }
  }

  return {
    id: 'stockBatch:latest',
    kind: 'stockBatch',
    sourceName,
    reportDate: extractStockDate(rows),
    ingestedAt: Date.now(),
    rowCount: batches.length,
    flags,
    stockBatches: batches,
  };
}

function extractStockDate(rows: Row[]): string | null {
  for (const r of rows.slice(0, 6)) {
    const m = r.map(toText).join(' ').match(/AS ON DATE\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (m) return toISODate(m[1]);
  }
  return null;
}
