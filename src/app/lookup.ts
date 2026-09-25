import { useMemo } from 'react';
import type { ProjectDoc } from '../domain/project';
import type { PlantLookup } from '../engine/plantings';
import { usePlants } from './plantStore';
import { useEditor } from '../editor/store';

/** Own-property lookup, so ids like "toString" never resolve to prototype members. */
function embeddedPlant(embedded: ProjectDoc['embeddedPlants'] | undefined, id: string) {
  return embedded && Object.hasOwn(embedded, id) ? embedded[id] : undefined;
}

/** Plant lookup: global catalog first, then plants embedded in the project. */
export function makeLookup(catalog: { get(id: string): ReturnType<PlantLookup> }, doc: ProjectDoc | null): PlantLookup {
  return (id) => catalog.get(id) ?? embeddedPlant(doc?.embeddedPlants, id);
}

export function usePlantLookup(): PlantLookup {
  const catalog = usePlants((s) => s.catalog);
  const version = usePlants((s) => s.version);
  const embedded = useEditor((s) => s.doc?.embeddedPlants);
  return useMemo(
    () => (id: string) => catalog.get(id) ?? embeddedPlant(embedded, id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, version, embedded],
  );
}
