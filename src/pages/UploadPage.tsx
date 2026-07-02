import { PageHeader } from '../components/layout/PageHeader';
import { UploadZone } from '../components/upload/UploadZone';
import { useDataStore } from '../lib/store/useDataStore';
import { FILE_KIND_LABEL, type FileKind } from '../lib/types';
import { dateLabel } from '../lib/format';

const EXPECTED: { kind: FileKind; hint: string }[] = [
  { kind: 'salesSummary', hint: 'Party/Item Wise Sales Summary — one per day' },
  { kind: 'dailyAnalysis', hint: 'Daily Analysis — cash/credit split + category GP%' },
  { kind: 'ledgerSummary', hint: 'Ledger Summary — month-over-month per item' },
  { kind: 'stockSnapshot', hint: 'Stock Report (snapshot) — current levels & value' },
  { kind: 'stockBatch', hint: 'Stock Report (batch) — supplier & purchase detail' },
  { kind: 'creditors', hint: 'Sundry Creditors — supplier payables' },
];

export function UploadPage() {
  const files = useDataStore((s) => s.files);
  const removeFile = useDataStore((s) => s.removeFile);
  const reset = useDataStore((s) => s.reset);

  const byKind = new Map(files.map((f) => [f.kind, f]));

  return (
    <div className="page">
      <PageHeader
        eyebrow="Data intake"
        title="Upload Marg Exports"
        lede="Marg has no API, so this dashboard runs on your manual exports. Drop files below — re-uploading a corrected file for the same day replaces it, never doubles your totals."
        actions={files.length > 0 ? <button className="btn btn-ghost" onClick={() => reset()}>Clear all</button> : undefined}
      />

      <UploadZone />

      <div className="upload-grid">
        {EXPECTED.map((e) => {
          const f = byKind.get(e.kind);
          return (
            <div key={e.kind} className={`upload-slot ${f ? 'filled' : 'empty'}`}>
              <div className="us-head">
                <span className={`us-status ${f ? 'on' : ''}`} aria-hidden>{f ? '✓' : '—'}</span>
                <span className="us-title">{FILE_KIND_LABEL[e.kind]}</span>
              </div>
              <p className="us-hint">{e.hint}</p>
              {f ? (
                <div className="us-meta">
                  <span>{f.rowCount} rows · {dateLabel(f.reportDate)}</span>
                  <button className="us-remove" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.sourceName}`}>Remove</button>
                </div>
              ) : (
                <div className="us-meta muted">Not uploaded yet</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
