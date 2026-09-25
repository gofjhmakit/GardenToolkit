import { useMemo } from 'react';
import { useEditor } from '../../editor/store';
import { usePlants } from '../../app/plantStore';
import { usePlantLookup } from '../../app/lookup';
import type { ReportContext } from '../../reports/builders';

export function useReportContext(): ReportContext | null {
  const doc = useEditor((s) => s.doc);
  const lookup = usePlantLookup();
  const catalog = usePlants((s) => s.catalog);
  const version = usePlants((s) => s.version);
  return useMemo(
    () => (doc ? { doc, lookup, companions: catalog.companions, rotationRules: catalog.rotationRules, sources: catalog.sources, now: new Date() } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, lookup, catalog, version],
  );
}
