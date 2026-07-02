// ---- Canonical file kinds we know how to parse ----
export type FileKind =
  | 'salesSummary' // Party/Item Wise Sales Summary (e.g. 2.xlsx)
  | 'dailyAnalysis' // Daily Analysis print report (e.g. Book1.xlsx)
  | 'ledgerSummary' // Item month-over-month ledger (e.g. ledgersummary.xlsx)
  | 'stockSnapshot' // Stock report, one row per item (e.g. stock_81.xlsx)
  | 'stockBatch' // Stock report with batch/supplier detail (e.g. stock_91.xlsx)
  | 'creditors' // Sundry creditors / trial balance (e.g. trial_1.xlsx)
  | 'unknown';

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  salesSummary: 'Item-Wise Sales Summary',
  dailyAnalysis: 'Daily Analysis Report',
  ledgerSummary: 'Ledger Summary (Monthly)',
  stockSnapshot: 'Stock Report (Snapshot)',
  stockBatch: 'Stock Report (Batch Detail)',
  creditors: 'Supplier Payables (Creditors)',
  unknown: 'Unrecognised File',
};

// A data-quality issue surfaced to the owner (not hidden).
export interface DataFlag {
  kind: 'negativeStock' | 'missingSupplier' | 'zeroPrice' | 'missingRack' | 'parseWarning';
  severity: 'high' | 'medium' | 'low';
  ref: string; // item code / name / supplier
  detail: string;
  value?: number;
}

// ---- Normalised records ----
export interface SalesLine {
  date: string; // ISO yyyy-mm-dd — report range start
  mode: string; // CASH / CARD / UPI / CREDIT ...
  description: string;
  cleanCategory: string;
  gstRate: number | null;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  pct: number;
}

export interface LedgerItem {
  description: string;
  cleanCategory: string;
  gstRate: number | null;
  total: number;
  months: Record<string, number>; // 'yyyy-mm' -> value
  groupType: string;
  groupUid: string;
}

export interface DailyCategoryGP {
  date: string;
  category: string;
  cleanCategory: string;
  gstRate: number | null;
  sale: number;
  gpPct: number | null;
  purchase: number;
  currentStockValue: number;
}

export interface DailyHeadline {
  date: string;
  salesBills: number;
  challans: number;
  creditValue: number;
  cashValue: number;
  purchaseBills: number;
}

export interface StockItem {
  code: string;
  name: string;
  cleanCategory: string;
  gstRate: number | null;
  unit: string;
  currentStock: number;
  costPrice: number;
  value: number;
  mrp: number;
  purchasePrice: number;
  salesPrice: number;
  companyRaw: string;
  rackNo: string;
  barcode: string;
}

export interface StockBatch {
  code: string;
  name: string;
  cleanCategory: string;
  gstRate: number | null;
  currentStock: number;
  costPrice: number;
  value: number;
  mrp: number;
  purchasePrice: number;
  recDate: string | null; // ISO
  supplier: string;
  invNo: string;
  invDate: string | null; // ISO
  ref: string;
}

export interface Creditor {
  serial: number;
  ledger: string;
  group: string;
  opening: number;
  debit: number;
  credit: number;
  balance: number;
}

// ---- Parse output envelope (consistent per patterns.md) ----
export interface ParsedFile {
  id: string; // dedupe key: kind + salient dimension (date / 'latest')
  kind: FileKind;
  sourceName: string;
  reportDate: string | null; // ISO, when derivable from the file
  ingestedAt: number;
  rowCount: number;
  flags: DataFlag[];
  // exactly one of these payloads is populated based on kind
  salesLines?: SalesLine[];
  ledgerItems?: LedgerItem[];
  dailyCategories?: DailyCategoryGP[];
  dailyHeadline?: DailyHeadline;
  stockItems?: StockItem[];
  stockBatches?: StockBatch[];
  creditors?: Creditor[];
}
