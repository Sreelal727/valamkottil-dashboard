import type { DailyCategoryGP, DailyHeadline, ParsedFile } from '../types';
import { Row, splitGst, toISODate, toText } from './common';

// The Daily Analysis export is a print-formatted report in a single column.
// We flatten it to text lines and parse with regexes tuned to its fixed layout.

const HEADLINE_RE = {
  date: /As on Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  salesBill: /Sales Bill\s*:\s*([\d.]+)\s+Challan\s*:\s*([\d.]+)/i,
  billValue: /Bill Value Credit\s*:\s*([\d.]+)\s+Cash\s*:\s*([\d.]+)/i,
  purchase: /Purchase Bills\s*:\s*([\d.]+)/i,
};

// "10% BAGGY                  681.42   26.81 %           0.00       269669.67"
// name … Sale … GP%(optional) % … Purchase … CurrentStock.
// Lines are trimmed upstream, so leading space is optional; the 2+ space gaps
// between columns are the real discriminator.
const CATEGORY_RE = /^\s*(\S.*?)\s{2,}(-?[\d,]+\.\d{2})\s+([\d,]*\.?\d*)\s*%\s+(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s*$/;

const num = (s: string) => Number(s.replace(/,/g, '')) || 0;

export function parseDailyAnalysis(rows: Row[], sourceName: string): ParsedFile {
  const text = rows.map((r) => toText(r[0])).filter((l) => l.length > 0);
  const whole = text.join('\n');

  const dateMatch = whole.match(HEADLINE_RE.date);
  const reportDate = dateMatch ? toISODate(dateMatch[1]) : new Date().toISOString().slice(0, 10);

  const sb = whole.match(HEADLINE_RE.salesBill);
  const bv = whole.match(HEADLINE_RE.billValue);
  const pb = whole.match(HEADLINE_RE.purchase);
  const headline: DailyHeadline = {
    date: reportDate!,
    salesBills: sb ? num(sb[1]) : 0,
    challans: sb ? num(sb[2]) : 0,
    creditValue: bv ? num(bv[1]) : 0,
    cashValue: bv ? num(bv[2]) : 0,
    purchaseBills: pb ? num(pb[1]) : 0,
  };

  const categories: DailyCategoryGP[] = [];
  const seen = new Set<string>();
  for (const line of text) {
    if (/CATEGRY\s+Sale|Page No|DAILY ANALYSIS|Continued/i.test(line)) continue;
    const m = line.match(CATEGORY_RE);
    if (!m) continue;
    const category = m[1].trim();
    if (!category || /^CATEGRY/i.test(category)) continue;
    if (/^(GRAND\s+)?TOTAL$/i.test(category)) continue; // roll-up row, not a category
    if (seen.has(category)) continue;
    seen.add(category);
    const { gstRate, cleanCategory } = splitGst(category);
    const gpStr = m[3].trim();
    categories.push({
      date: reportDate!,
      category,
      cleanCategory,
      gstRate,
      sale: num(m[2]),
      gpPct: gpStr ? num(gpStr) : null,
      purchase: num(m[4]),
      currentStockValue: num(m[5]),
    });
  }

  return {
    id: `dailyAnalysis:${reportDate}`,
    kind: 'dailyAnalysis',
    sourceName,
    reportDate,
    ingestedAt: Date.now(),
    rowCount: categories.length,
    flags: [],
    dailyCategories: categories,
    dailyHeadline: headline,
  };
}
