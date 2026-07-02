import { useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { derive } from './derive';
import type { Dashboard } from './model';

export function useDashboard(): Dashboard {
  const files = useDataStore((s) => s.files);
  return useMemo(() => derive(files), [files]);
}
