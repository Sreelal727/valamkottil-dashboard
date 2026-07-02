import { get, set, del } from 'idb-keyval';
import type { ParsedFile } from '../types';

// Treat every ingest as a snapshot upsert keyed by ParsedFile.id, so re-uploading
// a corrected file for a date (or a fresh stock snapshot) replaces, never doubles.
const KEY = 'valamkottil:files:v1';

export async function loadFiles(): Promise<ParsedFile[]> {
  try {
    return (await get<ParsedFile[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveFiles(files: ParsedFile[]): Promise<void> {
  await set(KEY, files);
}

export async function clearFiles(): Promise<void> {
  await del(KEY);
}

/** Immutable upsert by id — newest ingest of a given id wins. */
export function upsertFile(files: ParsedFile[], incoming: ParsedFile): ParsedFile[] {
  const without = files.filter((f) => f.id !== incoming.id);
  return [...without, incoming].sort((a, b) => b.ingestedAt - a.ingestedAt);
}
