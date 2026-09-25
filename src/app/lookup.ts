import { useMemo } from 'react';
import type { ProjectDoc } from '../domain/project';
import type { PlantLookup } from '../engine/plantings';
import { usePlants } from './plantStore';
import { useEditor } from '../editor/store';

/** Plant lookup: global catalog first, then plants embedded in the project. */
export function makeLookup(catalog: { get(id: string): ReturnType<PlantLookup> }, doc: ProjectDoc | null): PlantLookup {
  return (id) => catalog.get(id) ?? doc?.embeddedPlants[id];
}

export function usePlantLookup(): PlantLookup {
  const catalog = usePlants((s) => s.catalog);
  const version = usePlants((s) => s.version);
  const embedded = useEditor((s) => s.doc?.embeddedPlants);
  return useMemo(
    () => (id: string) => catalog.get(id) ?? embedded?.[id],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, version, embedded],
  );
}
