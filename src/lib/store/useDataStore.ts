import { create } from 'zustand';
import type { FileKind, ParsedFile } from '../types';
import { parseUpload } from '../parse';
import { clearFiles, loadFiles, saveFiles, upsertFile } from './db';

export interface IngestOutcome {
  name: string;
  ok: boolean;
  kind?: FileKind;
  rows?: number;
  replaced?: boolean;
  error?: string;
}

interface DataState {
  files: ParsedFile[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  ingest: (fileList: FileList | File[]) => Promise<IngestOutcome[]>;
  removeFile: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  files: [],
  hydrated: false,

  hydrate: async () => {
    const files = await loadFiles();
    set({ files, hydrated: true });
  },

  ingest: async (fileList) => {
    const incoming = Array.from(fileList);
    const outcomes: IngestOutcome[] = [];
    let files = get().files;

    for (const file of incoming) {
      const result = await parseUpload(file);
      if (!result.ok || !result.file) {
        outcomes.push({ name: file.name, ok: false, error: result.error });
        continue;
      }
      const replaced = files.some((f) => f.id === result.file!.id);
      files = upsertFile(files, result.file);
      outcomes.push({
        name: file.name,
        ok: true,
        kind: result.file.kind,
        rows: result.file.rowCount,
        replaced,
      });
    }

    set({ files });
    await saveFiles(files);
    return outcomes;
  },

  removeFile: async (id) => {
    const files = get().files.filter((f) => f.id !== id);
    set({ files });
    await saveFiles(files);
  },

  reset: async () => {
    await clearFiles();
    set({ files: [] });
  },
}));

// ---- Selectors: pick the freshest file of each kind ----
export function latestOfKind(files: ParsedFile[], kind: FileKind): ParsedFile | undefined {
  return files.filter((f) => f.kind === kind).sort((a, b) => b.ingestedAt - a.ingestedAt)[0];
}

export function allOfKind(files: ParsedFile[], kind: FileKind): ParsedFile[] {
  return files.filter((f) => f.kind === kind);
}
