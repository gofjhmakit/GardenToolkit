/**
 * USER PROJECT DATA model (internal representation).
 *
 * The in-memory/IndexedDB document. The public, stable file format lives in
 * persistence/projectFile.ts and is mapped to/from this model explicitly, so
 * the internals can evolve without breaking exported files.
 *
 * All geometry is in millimetres (see units.ts).
 */
import { z } from 'zod';
import { PlantingMethodSchema, PlantSchema, RotationGroupSchema, SunLevelSchema } from '../plants/schema';

export const DOC_VERSION = 1;

export const VecSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
export const TransformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite().default(0),
});

const positive = z.number().finite().nonnegative();

export const ShapeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rect'), width: positive, height: positive, cornerRadius: positive.optional() }),
  z.object({ type: z.literal('ellipse'), rx: positive, ry: positive }),
  z.object({ type: z.literal('polygon'), points: z.array(VecSchema).min(3) }),
  z.object({ type: z.literal('polyline'), points: z.array(VecSchema).min(2), width: positive }),
  z.object({ type: z.literal('text'), text: z.string().max(2000), fontSize: z.number().positive() }),
  z.object({ type: z.literal('dimension'), a: VecSchema, b: VecSchema, offset: z.number().finite() }),
]);

export const OBJECT_KINDS = [
  'area',
  'bed',
  'raised-bed',
  'planter',
  'vegetable-bed',
  'flower-bed',
  'herb-area',
  'ground-crop-area',
  'orchard',
  'tree',
  'shrub',
  'greenhouse',
  'compost',
  'lawn',
  'gravel',
  'soil',
  'water',
  'path',
  'building',
  'shape',
  'line',
  'label',
  'dimension',
] as const;
export const ObjectKindSchema = z.enum(OBJECT_KINDS);
export type ObjectKind = z.infer<typeof ObjectKindSchema>;

export const SOIL_TYPES = ['loam', 'clay', 'sandy', 'silt', 'peat', 'chalky', 'potting-mix', 'compost-rich', 'unknown'] as const;
export const IRRIGATION_TYPES = ['none', 'manual', 'drip', 'soaker', 'sprinkler', 'self-watering'] as const;

export const ObjectPropsSchema = z
  .object({
    notes: z.string().max(20000).optional(),
    soil: z.enum(SOIL_TYPES).nullable().optional(),
    soilPh: z.number().min(0).max(14).nullable().optional(),
    sunLevel: SunLevelSchema.nullable().optional(),
    sunHours: z.number().min(0).max(24).nullable().optional(),
    irrigation: z.enum(IRRIGATION_TYPES).nullable().optional(),
    material: z.string().max(200).nullable().optional(),
    heightMm: positive.nullable().optional(),
    /** Direction in which plantings are laid out: rows run along this local axis. */
    rowAxis: z.enum(['auto', 'x', 'y']).optional(),
    tree: z
      .object({
        plantingDate: z.string().nullable().optional(),
        currentHeightMm: positive.nullable().optional(),
        currentWidthMm: positive.nullable().optional(),
        rootZoneRadiusMm: positive.nullable().optional(),
        showRootZone: z.boolean().optional(),
      })
      .optional(),
  })
  .default({});
export type ObjectProps = z.infer<typeof ObjectPropsSchema>;

export const StyleSchema = z
  .object({
    fill: z.string().max(64).nullable().optional(),
    stroke: z.string().max(64).nullable().optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .default({});

export const GardenObjectSchema = z.object({
  id: z.string().min(1),
  kind: ObjectKindSchema,
  name: z.string().max(200),
  /** Short reference printed on plans, e.g. "B3". */
  code: z.string().max(20).default(''),
  layerId: z.string(),
  groupId: z.string().nullable().default(null),
  transform: TransformSchema,
  shape: ShapeSchema,
  style: StyleSchema,
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  props: ObjectPropsSchema,
});
export type GardenObject = z.infer<typeof GardenObjectSchema>;

export const LayerSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  role: z.enum(['background', 'content']).default('content'),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  /** Z-order within the layer, bottom first. */
  objectIds: z.array(z.string()).default([]),
});
export type Layer = z.infer<typeof LayerSchema>;

export const GroupSchema = z.object({ id: z.string(), name: z.string().max(100) });
export type Group = z.infer<typeof GroupSchema>;

export const BackgroundImageSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  name: z.string().max(200),
  /** World position (mm) of the full image centre and rotation in degrees. */
  transform: TransformSchema,
  /** Real-world millimetres represented by one image pixel. */
  mmPerPx: z.number().positive().finite(),
  naturalWidth: z.number().positive(),
  naturalHeight: z.number().positive(),
  /** Visible crop rectangle in image pixels; null = uncropped. */
  crop: z
    .object({ x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive() })
    .nullable()
    .default(null),
  opacity: z.number().min(0).max(1).default(0.8),
  visible: z.boolean().default(true),
  locked: z.boolean().default(true),
  calibration: z
    .object({
      a: VecSchema,
      b: VecSchema,
      distanceMm: z.number().positive(),
      calibratedAt: z.string(),
    })
    .nullable()
    .default(null),
});
export type BackgroundImage = z.infer<typeof BackgroundImageSchema>;

export const PlantingSchema = z.object({
  id: z.string(),
  plantId: z.string(),
  objectId: z.string(),
  season: z.number().int(),
  variety: z.string().max(200).default(''),
  method: PlantingMethodSchema.nullable().default(null),
  /** Share of the host area (0–1). null = split evenly with other auto plantings. */
  areaShare: z.number().min(0).max(1).nullable().default(null),
  spacing: z
    .object({
      inRowMm: positive.nullable().optional(),
      rowMm: positive.nullable().optional(),
      seedMm: positive.nullable().optional(),
      edgeMarginMm: positive.nullable().optional(),
      pattern: z.enum(['square', 'triangular']).optional(),
    })
    .default({}),
  quantityOverride: z.number().int().nonnegative().nullable().default(null),
  seedQuantityOverride: z.number().nonnegative().nullable().default(null),
  yieldOverride: z
    .object({
      basis: z.enum(['total', 'per-plant', 'per-m2']),
      minKg: z.number().nonnegative(),
      maxKg: z.number().nonnegative(),
    })
    .nullable()
    .default(null),
  dates: z
    .object({
      sowIndoors: z.string().nullable().optional(),
      directSow: z.string().nullable().optional(),
      transplant: z.string().nullable().optional(),
      harvestStart: z.string().nullable().optional(),
      harvestEnd: z.string().nullable().optional(),
    })
    .default({}),
  status: z.enum(['planned', 'sown', 'planted', 'growing', 'harvested', 'removed']).default('planned'),
  notes: z.string().max(20000).default(''),
  createdAt: z.string(),
});
export type Planting = z.infer<typeof PlantingSchema>;

export const CalendarOverrideSchema = z.object({
  start: z.string().nullable().optional(),
  end: z.string().nullable().optional(),
  done: z.boolean().optional(),
  hidden: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});
export type CalendarOverride = z.infer<typeof CalendarOverrideSchema>;

export const CustomTaskSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  start: z.string(),
  end: z.string().nullable().default(null),
  objectId: z.string().nullable().default(null),
  notes: z.string().max(5000).default(''),
  done: z.boolean().default(false),
});
export type CustomTask = z.infer<typeof CustomTaskSchema>;

export const RotationRecordSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  season: z.number().int(),
  group: RotationGroupSchema,
  crop: z.string().max(200).default(''),
});
export type RotationRecord = z.infer<typeof RotationRecordSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  body: z.string().max(50000),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const LocationSchema = z.object({
  country: z.string().max(80).nullable().default(null),
  region: z.string().max(120).nullable().default(null),
  climateSystem: z.enum(['finnish-zone', 'usda', 'other']).nullable().default(null),
  climateZone: z.string().max(20).nullable().default(null),
  /** Average last spring frost, MM-DD. */
  lastFrost: z.string().regex(/^\d{2}-\d{2}$/).nullable().default(null),
  /** Average first autumn frost, MM-DD. */
  firstFrost: z.string().regex(/^\d{2}-\d{2}$/).nullable().default(null),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  growingSeasonDays: z.number().int().positive().nullable().default(null),
  frostDateSource: z.string().max(300).nullable().default(null),
});
export type LocationSettings = z.infer<typeof LocationSchema>;

export const ProjectSettingsSchema = z.object({
  unitSystem: z.enum(['metric', 'imperial']).default('metric'),
  gridSizeMm: z.number().positive().default(500),
  showGrid: z.boolean().default(true),
  snapToGrid: z.boolean().default(true),
  snapToObjects: z.boolean().default(true),
  showRulers: z.boolean().default(true),
  showPlantMarkers: z.boolean().default(true),
  activeSeason: z.number().int(),
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export const ProjectDocSchema = z.object({
  id: z.string(),
  docVersion: z.number().int(),
  meta: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(5000).default(''),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  location: LocationSchema,
  settings: ProjectSettingsSchema,
  backgrounds: z.array(BackgroundImageSchema).default([]),
  layers: z.array(LayerSchema),
  objects: z.record(z.string(), GardenObjectSchema),
  groups: z.record(z.string(), GroupSchema).default({}),
  plantings: z.record(z.string(), PlantingSchema).default({}),
  calendarOverrides: z.record(z.string(), CalendarOverrideSchema).default({}),
  customTasks: z.array(CustomTaskSchema).default([]),
  rotationHistory: z.array(RotationRecordSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  /**
   * Plant records carried inside the project (from imports or user-defined
   * plants) so a project stays meaningful on a device whose reference
   * database lacks them. Never written back into the global database.
   */
  embeddedPlants: z.record(z.string(), PlantSchema).default({}),
});
export type ProjectDoc = z.infer<typeof ProjectDocSchema>;
