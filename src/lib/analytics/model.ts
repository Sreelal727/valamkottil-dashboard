import type { Creditor, DataFlag, FileKind, StockItem } from '../types';

export interface Slice {
  label: string;
  value: number;
}

export interface CategoryGPRow {
  label: string;
  gp: number;
  sale: number;
  stockValue: number;
}

export interface BestSeller {
  label: string;
  category: string;
  value: number;
  qty: number;
  unit: string;
  gp: number | null;
}

export interface ReorderRow {
  code: string;
  name: string;
  category: string;
  currentStock: number;
  stockValue: number;
  avgMonthlyValue: number;
  monthsCover: number;
}

export interface VariantGroup {
  base: string;
  sizes: { size: string; stock: number; value: number }[];
  totalStock: number;
}

export interface SupplierAge {
  supplier: string;
  oldestInwardIso: string | null;
  ageDays: number | null;
}

export interface Payables {
  totalOwed: number;
  supplierCount: number;
  netBalance: number;
  advances: number; // suppliers who owe the shop (positive balance)
  top: Creditor[];
  all: Creditor[];
  aging: SupplierAge[];
}

export type TakeawayTone = 'good' | 'watch' | 'bad' | 'info';
export interface Takeaway {
  icon: string;
  tone: TakeawayTone;
  headline: string;
  detail: string;
}
export interface TakeawayGroup {
  title: string;
  subtitle: string;
  items: Takeaway[];
}

export interface Dashboard {
  hasAnyData: boolean;
  present: Record<FileKind, boolean>;
  asOfDate: string | null;

  // Summary KPIs
  salesToday: number | null;
  salesTodaySource: string | null;
  avgSalesPerDay: number | null;
  expectedThisMonth: number | null;
  totalStockValue: number | null;
  stockDiscrepancyValue: number;
  stockDiscrepancyCount: number;
  deadStockValue: number | null;
  deadStockCount: number;
  flagCount: number;

  // Charts
  ledgerPartial: boolean; // uploaded ledger under-reports vs observed sales
  monthlyTrend: Slice[]; // {label: 'Jun ’26', value}
  salesByCategory: Slice[];
  salesByCategorySource: string;
  categoryGP: CategoryGPRow[];
  bestSellers: BestSeller[];
  cashVsCredit: { cash: number; credit: number } | null;

  // Products
  deadStock: StockItem[];
  deadStockCoverageNote: string;
  reorder: ReorderRow[];
  variants: VariantGroup[];

  // Payables
  payables: Payables | null;

  // Takeaways + flags
  takeaways: TakeawayGroup[];
  flags: DataFlag[];
}
