import type { ParsedFile } from '../types';
import { Row } from './common';
import { detectKind } from './detect';
import { parseSalesSummary } from './salesSummary';
import { parseDailyAnalysis } from './dailyAnalysis';
import { parseLedgerSummary } from './ledgerSummary';
import { parseStockSnapshot, parseStockBatch } from './stock';
import { parseCreditors } from './creditors';

export interface ParseResult {
  ok: boolean;
  file?: ParsedFile;
  error?: string;
}

/** Read an uploaded .xlsx/.csv, detect its Marg export type, and normalise it. */
export async function parseUpload(file: File): Promise<ParseResult> {
  try {
    // Load SheetJS lazily — it is only needed while parsing an upload, so it
    // stays out of the initial dashboard bundle (see performance budget).
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, error: 'No worksheet found in file.' };

    const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });

    const kind = detectKind(rows);
    if (kind === 'unknown') {
      return {
        ok: false,
        error:
          'Could not recognise this as a Marg export (sales summary, daily analysis, ledger, stock, or creditors). Check the file and re-export.',
      };
    }

    const parsed = dispatch(kind, rows, file.name);
    if (!parsed.rowCount) {
      return { ok: false, error: `Recognised as "${kind}" but no data rows were extracted.` };
    }
    return { ok: true, file: parsed };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to read file.' };
  }
}

function dispatch(kind: ReturnType<typeof detectKind>, rows: Row[], name: string): ParsedFile {
  switch (kind) {
    case 'salesSummary': return parseSalesSummary(rows, name);
    case 'dailyAnalysis': return parseDailyAnalysis(rows, name);
    case 'ledgerSummary': return parseLedgerSummary(rows, name);
    case 'stockSnapshot': return parseStockSnapshot(rows, name);
    case 'stockBatch': return parseStockBatch(rows, name);
    case 'creditors': return parseCreditors(rows, name);
    default:
      // Unreachable — 'unknown' handled by caller; keeps the switch exhaustive.
      throw new Error(`Unhandled file kind: ${kind}`);
  }
}
