import type { ParsedFile, SalesLine } from '../types';
import { Row, splitGst, toISODate, toNumber, toText, extractUnit } from './common';

const JUNK = [
  'VALAMKOTTIL', 'GSTIN', 'REPORT FOR', 'CATEGRY', 'PARTY / ITEM', 'PAGE', 'PHONE',
  'E-MAIL', 'P.P.ROAD', 'IMPORT PURCHASE', 'MARG ERP', 'CONTINUED',
];

function isDescriptionHeader(c0: string): boolean {
  return c0.replace(/\s+/g, '').toUpperCase() === 'DESCRIPTION';
}
function isTotalRow(c0: string): boolean {
  return /TOTAL\s*:/.test(c0.toUpperCase());
}
function isJunk(c0: string, joined: string): boolean {
  const u = joined.toUpperCase();
  return JUNK.some((k) => u.includes(k)) || isDescriptionHeader(c0);
}

function findReportDate(rows: Row[]): string | null {
  for (const r of rows.slice(0, 12)) {
    const joined = r.map(toText).join(' ');
    const m = joined.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (m && /FROM|SUMMARY/i.test(joined)) return toISODate(m[1]);
  }
  return null;
}

export function parseSalesSummary(rows: Row[], sourceName: string): ParsedFile {
  const reportDate = findReportDate(rows) ?? new Date().toISOString().slice(0, 10);
  const lines: SalesLine[] = [];
  const seen = new Set<string>();
  let mode = 'UNSPECIFIED';
  let warnings = 0;

  for (const r of rows) {
    const c0 = toText(r[0]);
    if (!c0) continue;
    const joined = r.map(toText).join(' ');
    if (isJunk(c0, joined) || isTotalRow(c0)) continue;

    const qtyCell = r[1];
    const rateCell = r[2];
    const amountCell = r[3];
    const pctCell = r[4];

    const restBlank = [qtyCell, rateCell, amountCell, pctCell].every((c) => !toText(c));
    // A lone label with empty numeric columns is a payment-mode subheader (CASH/CARD/UPI…)
    if (restBlank) {
      mode = c0.toUpperCase();
      continue;
    }

    const qty = toNumber(qtyCell);
    const amount = toNumber(amountCell);
    if (!Number.isFinite(amount) || (qty === 0 && amount === 0)) {
      warnings++;
      continue;
    }

    const { gstRate, cleanCategory } = splitGst(c0);
    const key = `${mode}|${c0}|${amount.toFixed(2)}`;
    if (seen.has(key)) continue; // dedupe repeated export lines
    seen.add(key);

    lines.push({
      date: reportDate,
      mode,
      description: c0,
      cleanCategory,
      gstRate,
      qty,
      unit: extractUnit(qtyCell) || 'PCS',
      rate: toNumber(rateCell),
      amount,
      pct: toNumber(pctCell),
    });
  }

  return {
    // Stable per report-date: re-uploading a corrected file for the same day replaces it.
    id: `salesSummary:${reportDate}`,
    kind: 'salesSummary',
    sourceName,
    reportDate,
    ingestedAt: Date.now(),
    rowCount: lines.length,
    flags: warnings
      ? [{ kind: 'parseWarning', severity: 'low', ref: sourceName, detail: `${warnings} unreadable line(s) skipped` }]
      : [],
    salesLines: lines,
  };
}
