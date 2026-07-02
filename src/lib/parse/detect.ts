import type { FileKind } from '../types';
import { toText, type Row } from './common';

/**
 * Classify an uploaded sheet by fingerprinting its content, not its filename.
 * We look at the whole top slab because banner/junk rows shift real headers down.
 */
export function detectKind(rows: Row[]): FileKind {
  const head = rows
    .slice(0, 30)
    .map((r) => r.map(toText).join(' | '))
    .join('\n')
    .toUpperCase();
  const firstCol = rows.slice(0, 40).map((r) => toText(r[0]).toUpperCase());

  // Creditors / trial balance — has SERIAL|LEDGER|GROUP|OPENING|DEBIT|CREDIT|BALANCE
  if (head.includes('SERIAL') && head.includes('LEDGER') && head.includes('BALANCE') && head.includes('OPENING')) {
    return 'creditors';
  }

  // Daily Analysis — single-column print report with the tell-tale section title
  if (head.includes('DAILY ANALYSIS') || head.includes('CATEGRY WISE SALES')) {
    return 'dailyAnalysis';
  }

  // Sales summary — party/item wise, description header with QTY/RATE/AMOUNT
  if (head.includes('PARTY / ITEM WISE SALES') || (head.includes('D E S C R I P T I O N') && head.includes('AMOUNT'))) {
    return 'salesSummary';
  }

  // Stock reports — both start with STOCK REPORT AS ON DATE and Code/Product Name
  if (head.includes('STOCK REPORT') || (head.includes('PRODUCT NAME') && head.includes('CURRENT STOCK'))) {
    // Batch variant carries Supplier / Inv.No / Rec.Date columns
    return head.includes('SUPPLIER') || head.includes('INV.NO') || head.includes('REC.DATE')
      ? 'stockBatch'
      : 'stockSnapshot';
  }

  // Ledger summary — clean table led by Description + Total + grouptype
  if (firstCol[0] === 'DESCRIPTION' && head.includes('TOTAL') && head.includes('GROUPTYPE')) {
    return 'ledgerSummary';
  }
  if (head.includes('GROUPTYPE') && head.includes('GROUPUID')) return 'ledgerSummary';

  return 'unknown';
}
