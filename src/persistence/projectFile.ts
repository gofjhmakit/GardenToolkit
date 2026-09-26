/**
 * PUBLIC PROJECT FILE FORMAT — "garden-toolkit-project", schemaVersion 1.
 *
 * This is the stable, documented exchange format (see docs/PROJECT_FORMAT.md).
 * It is intentionally decoupled from the internal ProjectDoc: explicit
 * mapping functions translate between the two, so internal refactors do not
 * break files users have saved.
 *
 * Containers:
 *  - Project package (.gtkproject): a ZIP containing `project.json` and
 *    `assets/<id>.<ext>` binary files. Preferred — images stay binary.
 *  - Plain JSON (.json): the same document; assets may be embedded as
 *    base64 `data` fields (larger, but a single text file).
 */
import { z } from 'zod';
import {
  CalendarOverrideSchema,
  CustomTaskSchema,
  DOC_VERSION,
  GroupSchema,
  LocationSchema,
  NoteSchema,
  ObjectKindSchema,
  ObjectPropsSchema,
  PlantingSchema,
  ProjectSettingsSchema,
  RotationRecordSchema,
  ShapeSchema,
  StyleSchema,
  VecSchema,
  type ProjectDoc,
} from '../domain/project';
import { PlantSchema, type Plant } from '../plants/schema';
import { repairReferences } from './migrations';

export const PROJECT_FILE_FORMAT = 'garden-toolkit-project';
export const PROJECT_FILE_VERSION = 1;
export const APP_VERSION = __APP_VERSION__;

const AssetEntrySchema = z.object({
  id: z.string().min(1).max(100),
  path: z.string().max(300).nullable().default(null),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  byteSize: z.number().int().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  name: z.string().max(200).default(''),
  /** Base64 payload for single-file JSON exports. */
  data: z.string().optional(),
});

const FileBackgroundSchema = z.object({
  id: z.string(),
  asset: z.string(),
  name: z.string().max(200),
  position: VecSchema,
  rotation: z.number().finite(),
  mmPerPixel: z.number().positive().finite(),
  pixelSize: z.object({ width: z.number().positive(), height: z.number().positive() }),
  crop: z.object({ x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive() }).nullable(),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  calibration: z
    .object({ a: VecSchema, b: VecSchema, distanceMm: z.number().positive(), calibratedAt: z.string() })
    .nullable(),
});

const FileObjectSchema = z.object({
  id: z.string().min(1).max(100),
  kind: ObjectKindSchema,
  name: z.string().max(200),
  code: z.string().max(20).default(''),
  layer: z.string(),
  group: z.string().nullable().default(null),
  position: VecSchema,
  rotation: z.number().finite().default(0),
  geometry: ShapeSchema,
  style: StyleSchema,
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  properties: ObjectPropsSchema,
});

export const ProjectFileSchema = z.object({
  format: z.literal(PROJECT_FILE_FORMAT),
  schemaVersion: z.number().int(),
  exportedAt: z.string().optional(),
  generator: z.object({ name: z.string(), version: z.string() }).optional(),
  units: z
    .object({ length: z.literal('mm'), angle: z.literal('deg'), coordinates: z.string() })
    .optional(),
  project: z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(200),
    description: z.string().max(5000).default(''),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  location: LocationSchema,
  settings: ProjectSettingsSchema,
  backgrounds: z.array(FileBackgroundSchema).max(20).default([]),
  layers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(100),
        role: z.enum(['background', 'content']).default('content'),
        visible: z.boolean().default(true),
        locked: z.boolean().default(false),
        objects: z.array(z.string()).default([]),
      }),
    )
    .max(200),
  groups: z.array(GroupSchema).default([]),
  objects: z.array(FileObjectSchema).max(20000),
  plantings: z.array(PlantingSchema).max(50000).default([]),
  calendar: z
    .object({
      overrides: z.record(z.string(), CalendarOverrideSchema).default({}),
      tasks: z.array(CustomTaskSchema).default([]),
    })
    .default({ overrides: {}, tasks: [] }),
  rotationHistory: z.array(RotationRecordSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  /** Snapshots of the plant records referenced by plantings. */
  plants: z.array(z.unknown()).default([]),
  assets: z.array(AssetEntrySchema).max(50).default([]),
});
export type ProjectFile = z.infer<typeof ProjectFileSchema>;
export type ProjectFileAsset = z.infer<typeof AssetEntrySchema>;

export interface AssetInfo {
  id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  byteSize: number;
  width: number;
  height: number;
  name: string;
}

/** ZIP entry name for an asset; ids are reduced to a safe character set. */
export function assetPath(id: string, mime: string): string {
  return `assets/${id.replace(/[^A-Za-z0-9_.-]/g, '_')}.${extensionFor(mime)}`;
}

export function extensionFor(mime: string): string {
  return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
}

/** Internal document → public file document. */
export function toProjectFile(
  doc: ProjectDoc,
  assets: AssetInfo[],
  lookupPlant: (id: string) => Plant | undefined,
  opts: { now?: Date } = {},
): ProjectFile {
  const plantIds = new Set(Object.values(doc.plantings).map((p) => p.plantId));
  const plants: Plant[] = [];
  for (const id of plantIds) {
    const p = lookupPlant(id) ?? (Object.hasOwn(doc.embeddedPlants, id) ? doc.embeddedPlants[id] : undefined);
    if (p) plants.push(p);
  }
  const usedAssets = new Set(doc.backgrounds.map((b) => b.assetId));
  return {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: PROJECT_FILE_VERSION,
    exportedAt: (opts.now ?? new Date()).toISOString(),
    generator: { name: 'Garden Toolkit', version: APP_VERSION },
    units: { length: 'mm', angle: 'deg', coordinates: 'plan millimetres; +x east (right), +y south (down); rotation clockwise' },
    project: {
      id: doc.id,
      name: doc.meta.name,
      description: doc.meta.description,
      createdAt: doc.meta.createdAt,
      updatedAt: doc.meta.updatedAt,
    },
    location: doc.location,
    settings: doc.settings,
    backgrounds: doc.backgrounds.map((b) => ({
      id: b.id,
      asset: b.assetId,
      name: b.name,
      position: { x: b.transform.x, y: b.transform.y },
      rotation: b.transform.rotation,
      mmPerPixel: b.mmPerPx,
      pixelSize: { width: b.naturalWidth, height: b.naturalHeight },
      crop: b.crop,
      opacity: b.opacity,
      visible: b.visible,
      locked: b.locked,
      calibration: b.calibration,
    })),
    layers: doc.layers.map((l) => ({ id: l.id, name: l.name, role: l.role, visible: l.visible, locked: l.locked, objects: [...l.objectIds] })),
    groups: Object.values(doc.groups),
    objects: doc.layers.flatMap((l) =>
      l.objectIds
        .map((id) => doc.objects[id])
        .filter(Boolean)
        .map((o) => ({
          id: o.id,
          kind: o.kind,
          name: o.name,
          code: o.code,
          layer: o.layerId,
          group: o.groupId,
          position: { x: o.transform.x, y: o.transform.y },
          rotation: o.transform.rotation,
          geometry: o.shape,
          style: o.style,
          locked: o.locked,
          hidden: o.hidden,
          properties: o.props,
        })),
    ),
    plantings: Object.values(doc.plantings),
    calendar: { overrides: doc.calendarOverrides, tasks: doc.customTasks },
    rotationHistory: doc.rotationHistory,
    notes: doc.notes,
    plants,
    assets: assets
      .filter((a) => usedAssets.has(a.id))
      .map((a) => ({ ...a, path: assetPath(a.id, a.mimeType) })),
  };
}

/** Upgrades older public file versions to the current one. */
const FILE_MIGRATIONS: Record<number, (f: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateProjectFile(raw: Record<string, unknown>): Record<string, unknown> {
  let f = raw;
  let v = typeof f.schemaVersion === 'number' ? f.schemaVersion : NaN;
  if (!Number.isInteger(v)) throw new Error('The file has no valid schemaVersion.');
  if (v > PROJECT_FILE_VERSION) {
    throw new Error(`This file uses project format version ${v}, which is newer than this app supports (${PROJECT_FILE_VERSION}).`);
  }
  while (v < PROJECT_FILE_VERSION) {
    const m = FILE_MIGRATIONS[v];
    if (!m) throw new Error(`Cannot upgrade project format version ${v}.`);
    f = m(f);
    v++;
  }
  return f;
}

export interface FromFileResult {
  doc: ProjectDoc;
  warnings: string[];
}

/**
 * Public file document → internal document. A new project id is assigned
 * by the caller-provided `newProjectId` so imports never overwrite existing
 * projects. `assetIdMap` renames assets to fresh local ids.
 */
export function fromProjectFile(
  file: ProjectFile,
  opts: { newProjectId: string; assetIdMap: Map<string, string>; knownPlant: (id: string) => boolean },
): FromFileResult {
  const warnings: string[] = [];
  const objects: ProjectDoc['objects'] = {};
  for (const o of file.objects) {
    if (o.id === '__proto__') {
      warnings.push('An object with the reserved id "__proto__" was skipped.');
      continue;
    }
    if (Object.hasOwn(objects, o.id)) {
      warnings.push(`Duplicate object id ${o.id} skipped.`);
      continue;
    }
    objects[o.id] = {
      id: o.id,
      kind: o.kind,
      name: o.name,
      code: o.code,
      layerId: o.layer,
      groupId: o.group,
      transform: { x: o.position.x, y: o.position.y, rotation: o.rotation },
      shape: o.geometry,
      style: o.style,
      locked: o.locked,
      hidden: o.hidden,
      props: o.properties,
    };
  }
  const embeddedPlants: ProjectDoc['embeddedPlants'] = {};
  let invalidPlants = 0;
  for (const raw of file.plants) {
    const p = PlantSchema.safeParse(raw);
    if (!p.success) {
      invalidPlants++;
      continue;
    }
    if (p.data.id === '__proto__') {
      invalidPlants++;
      continue;
    }
    // Only embed plants the local database does not already know.
    if (!opts.knownPlant(p.data.id)) embeddedPlants[p.data.id] = p.data;
  }
  if (invalidPlants) warnings.push(`${invalidPlants} embedded plant record(s) were invalid and ignored.`);

  const backgrounds: ProjectDoc['backgrounds'] = [];
  for (const b of file.backgrounds) {
    const assetId = opts.assetIdMap.get(b.asset);
    if (!assetId) {
      warnings.push(`Background image "${b.name}" is missing its image data and was skipped.`);
      continue;
    }
    backgrounds.push({
      id: b.id,
      assetId,
      name: b.name,
      transform: { x: b.position.x, y: b.position.y, rotation: b.rotation },
      mmPerPx: b.mmPerPixel,
      naturalWidth: b.pixelSize.width,
      naturalHeight: b.pixelSize.height,
      crop: b.crop,
      opacity: b.opacity,
      visible: b.visible,
      locked: b.locked,
      calibration: b.calibration,
    });
  }

  const plantings: ProjectDoc['plantings'] = {};
  for (const p of file.plantings) if (p.id !== '__proto__') plantings[p.id] = p;
  const unknownPlants = new Set(
    Object.values(plantings)
      .map((p) => p.plantId)
      .filter((id) => !opts.knownPlant(id) && !Object.hasOwn(embeddedPlants, id)),
  );
  if (unknownPlants.size) {
    warnings.push(`${unknownPlants.size} plant(s) used in this project are not in your plant database and had no embedded data.`);
  }

  const doc: ProjectDoc = {
    id: opts.newProjectId,
    docVersion: DOC_VERSION,
    meta: {
      name: file.project.name,
      description: file.project.description,
      createdAt: file.project.createdAt,
      updatedAt: file.project.updatedAt,
    },
    location: file.location,
    settings: file.settings,
    backgrounds,
    layers: file.layers.map((l) => ({ id: l.id, name: l.name, role: l.role, visible: l.visible, locked: l.locked, objectIds: l.objects })),
    objects,
    groups: Object.fromEntries(file.groups.map((g) => [g.id, g])),
    plantings,
    calendarOverrides: file.calendar.overrides,
    customTasks: file.calendar.tasks,
    rotationHistory: file.rotationHistory,
    notes: file.notes,
    embeddedPlants,
  };
  return { doc: repairReferences(doc), warnings };
}
