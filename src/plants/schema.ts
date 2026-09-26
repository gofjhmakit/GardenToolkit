/**
 * GLOBAL PLANT DATABASE schema.
 *
 * This is reference data, independent of any user project. Projects only
 * reference plants by id (and embed snapshots on export for portability).
 *
 * Design rules (see docs/PLANT_DATA.md):
 *  - every horticultural field is optional/nullable — unknown is a valid value;
 *  - quantities are ranges, not fake-precise single values;
 *  - provenance (sources + confidence) is retained per record and optionally
 *    per field;
 *  - text meant for people is localisable (Record<languageCode, string>).
 */
import { z } from 'zod';

export const RangeSchema = z
  .object({ min: z.number().finite(), max: z.number().finite() })
  .refine((r) => r.min <= r.max, { message: 'range.min must be <= range.max' });

/** Localised text keyed by BCP-47 language code, e.g. { en: '…', fi: '…' }. */
export const LocalizedTextSchema = z.record(z.string(), z.string());

export const PLANT_CATEGORIES = [
  'vegetable',
  'herb',
  'fruit',
  'berry',
  'fruit-tree',
  'nut',
  'tree',
  'shrub',
  'flower',
  'perennial',
  'bulb',
  'vine',
  'grass',
  'groundcover',
  'green-manure',
  'aquatic',
] as const;
export const PlantCategorySchema = z.enum(PLANT_CATEGORIES);
export type PlantCategory = z.infer<typeof PlantCategorySchema>;

export const LIFECYCLES = ['annual', 'biennial', 'perennial'] as const;
export const LifecycleSchema = z.enum(LIFECYCLES);

export const SUN_LEVELS = ['full-sun', 'partial-shade', 'shade', 'deep-shade'] as const;
export const SunLevelSchema = z.enum(SUN_LEVELS);
export type SunLevel = z.infer<typeof SunLevelSchema>;

export const WATER_LEVELS = ['low', 'medium', 'high'] as const;
export const WaterLevelSchema = z.enum(WATER_LEVELS);

export const PLANTING_METHODS = ['individual', 'spaced', 'rows', 'grid', 'broadcast'] as const;
export const PlantingMethodSchema = z.enum(PLANTING_METHODS);
export type PlantingMethod = z.infer<typeof PlantingMethodSchema>;

export const CONFIDENCE = ['high', 'medium', 'low', 'unknown'] as const;
export const ConfidenceSchema = z.enum(CONFIDENCE);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ROTATION_GROUPS = [
  'legumes',
  'brassicas',
  'alliums',
  'solanaceae',
  'roots',
  'cucurbits',
  'leafy',
  'perennial',
  'other',
] as const;
export const RotationGroupSchema = z.enum(ROTATION_GROUPS);
export type RotationGroup = z.infer<typeof RotationGroupSchema>;

/**
 * A timing window. Relative windows are anchored to the location's frost
 * dates so the same record works in Helsinki and in Lyon. Fixed windows use
 * northern-hemisphere month-day and are shifted for southern latitudes.
 */
export const TimingWindowSchema = z.discriminatedUnion('relativeTo', [
  z.object({
    relativeTo: z.enum(['lastFrost', 'firstFrost']),
    startWeeks: z.number(),
    endWeeks: z.number(),
  }),
  z.object({
    relativeTo: z.literal('fixed'),
    start: z.string().regex(/^\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{2}-\d{2}$/),
  }),
]);
export type TimingWindow = z.infer<typeof TimingWindowSchema>;

/** Plant parts that are used (eaten, brewed, dried…). */
export const PLANT_PARTS = [
  'leaves',
  'shoots',
  'flowers',
  'buds',
  'fruit',
  'seeds',
  'roots',
  'rhizome',
  'bulbs',
  'bark',
  'needles',
  'sap',
  'resin',
  'whole-plant',
] as const;
export const PlantPartSchema = z.enum(PLANT_PARTS);
export type PlantPart = z.infer<typeof PlantPartSchema>;

export const SourceRefSchema = z.object({
  id: z.string(),
  note: z.string().optional(),
});

export const FieldProvenanceSchema = z.object({
  sources: z.array(z.string()).default([]),
  confidence: ConfidenceSchema.default('unknown'),
  note: z.string().optional(),
});

const nullableRange = RangeSchema.nullable().optional();

export const PlantSchema = z.object({
  id: z.string().min(1),
  dataset: z.string().min(1),
  names: z.object({
    scientific: z.string().min(1),
    common: z.record(z.string(), z.array(z.string())).default({}),
    synonyms: z.array(z.string()).default([]),
  }),
  taxonomy: z
    .object({
      family: z.string().nullable().optional(),
      genus: z.string().nullable().optional(),
      species: z.string().nullable().optional(),
      infraspecific: z.string().nullable().optional(),
      cultivar: z.string().nullable().optional(),
    })
    .default({}),
  category: PlantCategorySchema,
  tags: z.array(z.string()).default([]),
  lifecycle: LifecycleSchema.nullable().optional(),
  edible: z.boolean().nullable().optional(),
  growing: z
    .object({
      sun: z.array(SunLevelSchema).nullable().optional(),
      sunHoursMin: z.number().nullable().optional(),
      water: WaterLevelSchema.nullable().optional(),
      soil: z.array(z.string()).nullable().optional(),
      ph: nullableRange,
      drainage: z.string().nullable().optional(),
      frostTolerance: z.enum(['tender', 'half-hardy', 'hardy']).nullable().optional(),
      minTempC: z.number().nullable().optional(),
      usdaZones: nullableRange,
      finnishZones: nullableRange,
      windTolerance: z.enum(['low', 'medium', 'high']).nullable().optional(),
      humidity: z.string().nullable().optional(),
    })
    .default({}),
  planting: z
    .object({
      methods: z.array(PlantingMethodSchema).default([]),
      inRowSpacingCm: nullableRange,
      rowSpacingCm: nullableRange,
      seedSpacingCm: nullableRange,
      gridSpacingCm: nullableRange,
      seedDepthCm: nullableRange,
      plantingDepthCm: nullableRange,
      seedsPerStation: nullableRange,
      germinationRate: nullableRange,
      germinationDays: nullableRange,
      germinationTempC: nullableRange,
      seedRateGPerM2: nullableRange,
      seedsPerGram: nullableRange,
      containerSuitable: z.boolean().nullable().optional(),
      containerVolumeL: nullableRange,
      matureHeightCm: nullableRange,
      matureWidthCm: nullableRange,
      rootDepth: z.enum(['shallow', 'medium', 'deep']).nullable().optional(),
      transplanting: LocalizedTextSchema.nullable().optional(),
      directSowing: LocalizedTextSchema.nullable().optional(),
    })
    .default({ methods: [] }),
  timing: z
    .object({
      sowIndoors: TimingWindowSchema.nullable().optional(),
      directSow: TimingWindowSchema.nullable().optional(),
      transplant: TimingWindowSchema.nullable().optional(),
      plantOut: TimingWindowSchema.nullable().optional(),
      harvest: TimingWindowSchema.nullable().optional(),
      flowering: TimingWindowSchema.nullable().optional(),
      daysToMaturity: nullableRange,
      maturityFrom: z.enum(['sowing', 'transplant']).nullable().optional(),
      harvestDurationWeeks: nullableRange,
      yearsToFirstHarvest: nullableRange,
      successionIntervalDays: nullableRange,
    })
    .default({}),
  care: z
    .object({
      watering: LocalizedTextSchema.nullable().optional(),
      fertilizing: LocalizedTextSchema.nullable().optional(),
      pruning: LocalizedTextSchema.nullable().optional(),
      support: LocalizedTextSchema.nullable().optional(),
      thinning: LocalizedTextSchema.nullable().optional(),
      mulching: LocalizedTextSchema.nullable().optional(),
      pests: LocalizedTextSchema.nullable().optional(),
      diseases: LocalizedTextSchema.nullable().optional(),
      winter: LocalizedTextSchema.nullable().optional(),
      harvesting: LocalizedTextSchema.nullable().optional(),
      storage: LocalizedTextSchema.nullable().optional(),
      feeding: z.enum(['heavy', 'medium', 'light']).nullable().optional(),
    })
    .default({}),
  yield: z
    .object({
      perPlantKg: nullableRange,
      perM2Kg: nullableRange,
      harvestEvents: nullableRange,
      assumptions: LocalizedTextSchema.nullable().optional(),
      confidence: ConfidenceSchema.default('unknown'),
    })
    .nullable()
    .optional(),
  /**
   * How the plant is used. Medicinal text describes traditional/herbal use only,
   * never dosing or medical advice; `safety` holds cautions and toxicity notes.
   */
  uses: z
    .object({
      parts: z.array(PlantPartSchema).default([]),
      culinary: LocalizedTextSchema.nullable().optional(),
      medicinal: LocalizedTextSchema.nullable().optional(),
      other: LocalizedTextSchema.nullable().optional(),
      preserving: LocalizedTextSchema.nullable().optional(),
      safety: LocalizedTextSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  rotation: z
    .object({
      group: RotationGroupSchema.nullable().optional(),
      nitrogenFixer: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  provenance: z.object({
    sources: z.array(SourceRefSchema).default([]),
    confidence: ConfidenceSchema.default('unknown'),
    fields: z.record(z.string(), FieldProvenanceSchema).optional(),
    updated: z.string().optional(),
    note: z.string().optional(),
  }),
});

export type Plant = z.infer<typeof PlantSchema>;
export type PlantInput = z.input<typeof PlantSchema>;

export const DataSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable().optional(),
  license: z.string(),
  attribution: z.string().nullable().optional(),
  retrieved: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type DataSource = z.infer<typeof DataSourceSchema>;

export const CompanionEvidenceSchema = z.enum(['documented', 'common-claim', 'traditional']);
export type CompanionEvidence = z.infer<typeof CompanionEvidenceSchema>;

/** A relationship between two plants (or genera, via `*` matching of ids). */
export const CompanionRelationSchema = z.object({
  a: z.string(),
  b: z.string(),
  kind: z.enum(['beneficial', 'antagonistic']),
  evidence: CompanionEvidenceSchema,
  mechanism: LocalizedTextSchema.nullable().optional(),
  sources: z.array(z.string()).default([]),
});
export type CompanionRelation = z.infer<typeof CompanionRelationSchema>;

export const RotationRuleSchema = z.object({
  group: RotationGroupSchema,
  label: LocalizedTextSchema,
  minYearsBetween: RangeSchema.nullable(),
  reason: LocalizedTextSchema,
  confidence: ConfidenceSchema,
  sources: z.array(z.string()).default([]),
});
export type RotationRule = z.infer<typeof RotationRuleSchema>;

/** A distributable plant dataset file (public/data/plants/*.json). */
export const PlantDatasetSchema = z.object({
  format: z.literal('garden-toolkit-plants'),
  schemaVersion: z.literal(1),
  dataset: z.object({
    id: z.string(),
    title: z.string(),
    version: z.string(),
    license: z.string(),
    description: z.string().optional(),
    generated: z.string().optional(),
  }),
  sources: z.array(DataSourceSchema).default([]),
  plants: z.array(z.unknown()),
  companions: z.array(CompanionRelationSchema).default([]),
  rotation: z.array(RotationRuleSchema).default([]),
});
export type PlantDataset = z.infer<typeof PlantDatasetSchema>;
