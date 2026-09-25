import { newId } from '../lib/ids';
import { DEFAULT_LAYERS, kindInfo } from './objectKinds';
import {
  DOC_VERSION,
  type GardenObject,
  type Layer,
  type LocationSettings,
  type ObjectKind,
  type ProjectDoc,
} from './project';
import type { Shape, Transform } from './geometry';

export function defaultLocation(): LocationSettings {
  return {
    country: null,
    region: null,
    climateSystem: null,
    climateZone: null,
    lastFrost: null,
    firstFrost: null,
    latitude: null,
    longitude: null,
    growingSeasonDays: null,
    frostDateSource: null,
  };
}

export function createProject(
  name: string,
  opts: { now?: Date; location?: Partial<LocationSettings>; id?: string } = {},
): ProjectDoc {
  const now = (opts.now ?? new Date()).toISOString();
  const layers: Layer[] = DEFAULT_LAYERS.map((l) => ({
    id: `layer-${l.key}`,
    name: l.name,
    role: l.role,
    visible: true,
    locked: false,
    objectIds: [],
  }));
  return {
    id: opts.id ?? newId('prj'),
    docVersion: DOC_VERSION,
    meta: { name: name.trim() || 'Untitled garden', description: '', createdAt: now, updatedAt: now },
    location: { ...defaultLocation(), ...opts.location },
    settings: {
      unitSystem: 'metric',
      gridSizeMm: 500,
      showGrid: true,
      snapToGrid: true,
      snapToObjects: true,
      showRulers: true,
      showPlantMarkers: true,
      activeSeason: (opts.now ?? new Date()).getFullYear(),
    },
    backgrounds: [],
    layers,
    objects: {},
    groups: {},
    plantings: {},
    calendarOverrides: {},
    customTasks: [],
    rotationHistory: [],
    notes: [],
    embeddedPlants: {},
  };
}

/** Finds the layer an object of a kind should go to by default. */
export function defaultLayerFor(doc: ProjectDoc, kind: ObjectKind): Layer {
  const key = kindInfo(kind).layer;
  const exact = doc.layers.find((l) => l.id === `layer-${key}`);
  if (exact) return exact;
  const content = doc.layers.filter((l) => l.role === 'content');
  return content[content.length - 1] ?? doc.layers[doc.layers.length - 1];
}

/** Next free plan code for a kind, e.g. "B4". */
export function nextCode(doc: ProjectDoc, kind: ObjectKind): string {
  const prefix = kindInfo(kind).prefix;
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const o of Object.values(doc.objects)) {
    const m = re.exec(o.code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

export function makeObject(
  doc: ProjectDoc,
  kind: ObjectKind,
  transform: Transform,
  shape: Shape,
  overrides: Partial<GardenObject> = {},
): GardenObject {
  const info = kindInfo(kind);
  const code = overrides.code ?? nextCode(doc, kind);
  return {
    id: newId('obj'),
    kind,
    name: overrides.name ?? `${info.label} ${code.replace(info.prefix, '')}`.trim(),
    code,
    layerId: overrides.layerId ?? defaultLayerFor(doc, kind).id,
    groupId: null,
    transform,
    shape,
    style: {},
    locked: false,
    hidden: false,
    props: {},
    ...overrides,
  };
}

/** All objects in paint order (bottom → top). */
export function objectsInPaintOrder(doc: ProjectDoc): GardenObject[] {
  const out: GardenObject[] = [];
  for (const layer of doc.layers) {
    for (const id of layer.objectIds) {
      const o = doc.objects[id];
      if (o) out.push(o);
    }
  }
  return out;
}

export function layerOf(doc: ProjectDoc, obj: GardenObject): Layer | undefined {
  return doc.layers.find((l) => l.id === obj.layerId);
}

/** Whether an object is currently visible (own flag and its layer). */
export function isObjectVisible(doc: ProjectDoc, obj: GardenObject): boolean {
  if (obj.hidden) return false;
  const l = layerOf(doc, obj);
  return !l || l.visible;
}

/** Whether an object can be edited (own lock and its layer lock). */
export function isObjectLocked(doc: ProjectDoc, obj: GardenObject): boolean {
  if (obj.locked) return true;
  const l = layerOf(doc, obj);
  return !!l && l.locked;
}

export function plantingsForObject(doc: ProjectDoc, objectId: string, season?: number) {
  return Object.values(doc.plantings).filter(
    (p) => p.objectId === objectId && (season === undefined || p.season === season),
  );
}
