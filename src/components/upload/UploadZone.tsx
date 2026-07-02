import { useCallback, useRef, useState } from 'react';
import type { IngestOutcome } from '../../lib/store/useDataStore';
import { useDataStore } from '../../lib/store/useDataStore';
import { FILE_KIND_LABEL } from '../../lib/types';

export function UploadZone() {
  const ingest = useDataStore((s) => s.ingest);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<IngestOutcome[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || (files as FileList).length === 0) return;
      setBusy(true);
      try {
        const result = await ingest(files);
        setOutcomes(result);
      } finally {
        setBusy(false);
      }
    },
    [ingest],
  );

  return (
    <div className="uploader">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label="Upload Marg export files"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="dropzone-icon" aria-hidden>{busy ? '⏳' : '⤒'}</div>
        <p className="dropzone-title">{busy ? 'Reading files…' : 'Drop Marg exports here'}</p>
        <p className="dropzone-sub">.xlsx / .csv · sales summary, daily analysis, ledger, stock, creditors — we detect the type automatically</p>
      </div>

      {outcomes.length > 0 && (
        <ul className="ingest-log">
          {outcomes.map((o, i) => (
            <li key={i} className={o.ok ? 'ok' : 'err'}>
              <span className="il-icon" aria-hidden>{o.ok ? '✓' : '✕'}</span>
              <span className="il-name">{o.name}</span>
              {o.ok ? (
                <span className="il-detail">
                  {FILE_KIND_LABEL[o.kind!]} · {o.rows} rows{o.replaced ? ' · replaced existing' : ''}
                </span>
              ) : (
                <span className="il-detail err">{o.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
