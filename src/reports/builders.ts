/**
 * Report builders: project data → ReportDoc. Pure and deterministic
 * (the generation date is passed in), so they are unit-tested.
 */
import type { GardenObject, ProjectDoc } from '../domain/project';
import { kindInfo } from '../domain/objectKinds';
import { isClosedShape, shapeArea, shapeDimensions, shapePerimeter } from '../domain/geometry';
import { formatArea, formatLength, formatNumber } from '../domain/units';
import { formatRange, type Range } from '../domain/range';
import { computeObjectPlantings, type PlantingComputation, type PlantLookup } from '../engine/plantings';
import { calculateExpectedHarvest, sumHarvest, type HarvestEstimate } from '../engine/harvest';
import { generatePlantingCalendar, groupEventsByMonth, type CalendarEvent, type CalendarResult } from '../engine/calendar';
import { analyzeRotation } from '../engine/rotation';
import { checkSuitability, SUN_LABEL } from '../engine/suitability';
import { findCompanionRelations, EVIDENCE_LABEL } from '../engine/companions';
import { frostFreeDays } from '../engine/climate';
import { localizedText, plantDisplayName } from '../plants/names';
import type { CompanionRelation, Plant, PlantCategory, RotationRule, DataSource } from '../plants/schema';
import { formatDate, formatDateRange, MONTH_NAMES } from '../lib/dates';
import type { Block, ReportDoc, ReportKind } from './model';
import { REPORT_INFO } from './model';
// Imported as `tr`: `t()` in this file picks a plant's localised text.
import { locale, t as tr, tn } from '../i18n';

export interface ReportContext {
  doc: ProjectDoc;
  lookup: PlantLookup;
  companions: CompanionRelation[];
  rotationRules: RotationRule[];
  sources: Map<string, DataSource>;
  now: Date;
  language?: string;
}

export interface Row extends PlantingComputation {
  harvest: HarvestEstimate;
  areaM2: number;
}

const CATEGORY_ORDER: PlantCategory[] = ['vegetable', 'herb', 'fruit', 'berry', 'fruit-tree', 'nut', 'tree', 'shrub', 'perennial', 'flower', 'bulb', 'vine', 'grass', 'groundcover', 'green-manure', 'aquatic'];
const CATEGORY_TITLES: Record<PlantCategory, string> = {
  vegetable: tr('Vegetables'),
  herb: tr('Herbs'),
  fruit: tr('Fruit'),
  berry: tr('Berries'),
  'fruit-tree': tr('Fruit trees'),
  nut: tr('Nuts'),
  tree: tr('Trees'),
  shrub: tr('Shrubs'),
  flower: tr('Flowers'),
  perennial: tr('Perennials'),
  bulb: tr('Bulbs'),
  vine: tr('Climbers'),
  grass: tr('Grasses'),
  groundcover: tr('Groundcover'),
  'green-manure': tr('Green manures'),
  aquatic: tr('Aquatic plants'),
};

function orderedObjects(doc: ProjectDoc): GardenObject[] {
  const out: GardenObject[] = [];
  for (const l of doc.layers) for (const id of l.objectIds) if (doc.objects[id]) out.push(doc.objects[id]);
  return out;
}

export function collectRows(doc: ProjectDoc, lookup: PlantLookup, language = 'en'): Row[] {
  const rows: Row[] = [];
  for (const o of orderedObjects(doc)) {
    if (!kindInfo(o.kind).plantable) continue;
    for (const c of computeObjectPlantings(doc, o, lookup)) {
      const areaM2 = c.capacity.areaMm2 / 1e6;
      rows.push({ ...c, areaM2, harvest: calculateExpectedHarvest({ plant: c.plant, quantity: c.quantity, areaM2, override: c.planting.yieldOverride, language }) });
    }
  }
  return rows.sort((a, b) => a.host.code.localeCompare(b.host.code, undefined, { numeric: true }));
}

const nameOf = (r: Row, lang?: string) => {
  const n = r.plant ? plantDisplayName(r.plant, lang) : r.planting.plantId;
  return r.planting.variety ? `${n} ‘${r.planting.variety}’` : n;
};
const cm = (x: Range | null | undefined) => (x ? `${formatRange(x, 1)} cm` : '—');
const kg = (x: Range | null) => (x ? `${formatRange(x, x.max < 10 ? 1 : 0)} kg` : '—');

function objectSize(o: GardenObject, units: ProjectDoc['settings']['unitSystem']): string {
  const s = o.shape;
  if (s.type === 'rect') return `${formatLength(s.width, units)} × ${formatLength(s.height, units)}`;
  if (s.type === 'ellipse') return s.rx === s.ry ? `⌀ ${formatLength(s.rx * 2, units)}` : `${formatLength(s.rx * 2, units)} × ${formatLength(s.ry * 2, units)}`;
  if (s.type === 'polyline') return s.width ? tr('{{length}} long, {{width}} wide', { length: formatLength(shapePerimeter(s), units), width: formatLength(s.width, units) }) : tr('{{length}} long', { length: formatLength(shapePerimeter(s), units) });
  if (s.type === 'polygon') {
    const d = shapeDimensions(s);
    return tr('approx. {{width}} × {{height}}', { width: formatLength(d.width, units), height: formatLength(d.height, units) });
  }
  return '';
}

export interface GardenStats {
  totalObjects: number;
  plantingAreaM2: number;
  vegetableAreaM2: number;
  plantCount: number;
  plantCountComplete: boolean;
  varieties: number;
  harvest: { total: Range | null; included: number; excluded: number };
  byKind: { label: string; count: number; areaM2: number }[];
}

export function gardenStats(doc: ProjectDoc, rows: Row[]): GardenStats {
  const objs = Object.values(doc.objects);
  const plantAreas = objs.filter((o) => kindInfo(o.kind).plantable && o.kind !== 'tree' && o.kind !== 'shrub');
  const vegAreas = new Set(rows.filter((r) => r.plant?.category === 'vegetable' || r.plant?.category === 'herb').map((r) => r.host.id));
  const byKind = new Map<string, { label: string; count: number; areaM2: number }>();
  for (const o of objs) {
    const info = kindInfo(o.kind);
    if (!info.surface && o.kind !== 'tree' && o.kind !== 'shrub') continue;
    const e = byKind.get(info.label) ?? { label: info.label, count: 0, areaM2: 0 };
    e.count++;
    e.areaM2 += shapeArea(o.shape) / 1e6;
    byKind.set(info.label, e);
  }
  return {
    totalObjects: objs.length,
    plantingAreaM2: plantAreas.reduce((s, o) => s + shapeArea(o.shape), 0) / 1e6,
    vegetableAreaM2: [...vegAreas].reduce((s, id) => s + shapeArea(doc.objects[id].shape), 0) / 1e6,
    plantCount: rows.reduce((s, r) => s + (r.quantity ?? 0), 0),
    plantCountComplete: rows.every((r) => r.quantity != null),
    varieties: new Set(rows.map((r) => `${r.planting.plantId}|${r.planting.variety}`)).size,
    harvest: sumHarvest(rows.map((r) => r.harvest)),
    byKind: [...byKind.values()].sort((a, b) => b.areaM2 - a.areaM2),
  };
}

function header(ctx: ReportContext, kind: ReportKind, orientation: ReportDoc['orientation'] = 'portrait'): Omit<ReportDoc, 'blocks'> {
  const d = ctx.doc;
  const loc = [d.location.region, d.location.country].filter(Boolean).join(', ');
  return {
    id: kind,
    title: REPORT_INFO[kind].title,
    subtitle: `${d.meta.name} · ${tr('season {{year}}', { year: d.settings.activeSeason })}${loc ? ` · ${loc}` : ''}`,
    generatedAt: ctx.now.toISOString(),
    projectName: d.meta.name,
    orientation,
  };
}

function locationBlock(doc: ProjectDoc): Block {
  const l = doc.location;
  const rows: [string, string][] = [];
  if (l.country || l.region) rows.push([tr('Location'), [l.region, l.country].filter(Boolean).join(', ')]);
  if (l.climateZone) rows.push([tr('Climate zone'), `${l.climateSystem === 'finnish-zone' ? tr('Finnish growing zone') : l.climateSystem === 'usda' ? tr('USDA zone') : tr('Zone')} ${l.climateZone}`]);
  rows.push([tr('Average last spring frost'), l.lastFrost ? formatMonthDay(l.lastFrost) : tr('not set')]);
  rows.push([tr('Average first autumn frost'), l.firstFrost ? formatMonthDay(l.firstFrost) : tr('not set')]);
  const ffd = frostFreeDays(l);
  if (ffd) rows.push([tr('Frost-free period'), tr('≈ {{days}} days', { days: ffd })]);
  if (l.frostDateSource) rows.push([tr('Frost date source'), l.frostDateSource]);
  return { type: 'kv', rows };
}

function formatMonthDay(md: string): string {
  const [m, d] = md.split('-').map(Number);
  // "15 May" / "15. toukokuuta"
  return new Date(Date.UTC(2001, m - 1, d)).toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function eventsFor(cal: CalendarResult, plantingId: string, types: CalendarEvent['type'][]): string {
  const e = cal.events.filter((x) => x.plantingId === plantingId && types.includes(x.type));
  const label: Partial<Record<CalendarEvent['type'], string>> = { 'sow-indoors': tr('Sow indoors'), 'direct-sow': tr('Sow'), transplant: tr('Plant out'), 'plant-out': tr('Plant') };
  return e.length ? e.map((x) => `${types.length > 1 && label[x.type] ? `${label[x.type]} ` : ''}${formatDateRange(x.start, x.end)}`).join('; ') : '—';
}

// ---------------------------------------------------------------------------

export function buildPlantingPlan(ctx: ReportContext): ReportDoc {
  const { doc, lookup } = ctx;
  const rows = collectRows(doc, lookup, ctx.language);
  const cal = generatePlantingCalendar(doc, lookup, { language: ctx.language });
  const stats = gardenStats(doc, rows);
  const units = doc.settings.unitSystem;
  const blocks: Block[] = [
    { type: 'stats', items: statItems(stats, units) },
    locationBlock(doc),
    { type: 'plan', caption: tr('Scaled plan — area codes refer to the tables below.') },
  ];
  if (cal.placeholderFrostDates) blocks.push({ type: 'paragraph', style: 'warning', text: cal.warnings[0] });
  blocks.push({ type: 'pagebreak' }, { type: 'heading', level: 2, text: tr('What to plant where') });
  const byHost = new Map<string, Row[]>();
  for (const r of rows) byHost.set(r.host.id, [...(byHost.get(r.host.id) ?? []), r]);
  if (!rows.length) blocks.push({ type: 'paragraph', style: 'muted', text: tr('No plants have been assigned to any area for this season yet.') });
  for (const [, list] of byHost) {
    const h = list[0].host;
    blocks.push({ type: 'heading', level: 3, text: `${h.code} — ${h.name} (${kindInfo(h.kind).label}, ${objectSize(h, units)}, ${formatArea(shapeArea(h.shape), units)})` });
    const conditions = [
      h.props.sunLevel && `${tr('sun')}: ${SUN_LABEL[h.props.sunLevel].toLowerCase()}${h.props.sunHours != null ? ` (${h.props.sunHours} h)` : ''}`,
      h.props.soil && `${tr('soil')}: ${tr(h.props.soil)}`,
      h.props.irrigation && `${tr('irrigation')}: ${tr(h.props.irrigation)}`,
    ].filter(Boolean);
    if (conditions.length) blocks.push({ type: 'paragraph', style: 'muted', text: conditions.join(' · ') });
    blocks.push({
      type: 'table',
      columns: [tr('Plant'), tr('Qty'), tr('Spacing (in row × rows)'), tr('Depth'), tr('Sow / plant'), tr('Harvest'), tr('Expected yield')],
      widths: [22, 7, 17, 9, 17, 15, 13],
      rows: list.map((r) => {
        const p = r.plant?.planting;
        const spacing = r.capacity.inRowMm ? `${Math.round(r.capacity.inRowMm / 10)} cm${r.capacity.rowMm && r.rules.method !== 'grid' && r.rules.method !== 'individual' ? ` × ${Math.round(r.capacity.rowMm / 10)} cm` : ''}` : '—';
        const depth = p?.seedDepthCm ? cm(p.seedDepthCm) : p?.plantingDepthCm ? cm(p.plantingDepthCm) : '—';
        return [
          nameOf(r, ctx.language) + (r.share < 0.999 ? ` (${tr('{{pct}}% of area', { pct: Math.round(r.share * 100) })})` : ''),
          r.quantity != null ? `${r.quantity}${r.quantitySource === 'override' ? '*' : ''}` : '—',
          spacing,
          depth,
          eventsFor(cal, r.planting.id, ['sow-indoors', 'direct-sow', 'transplant', 'plant-out']),
          eventsFor(cal, r.planting.id, ['harvest']),
          r.harvest.total ? kg(r.harvest.total) : 'n/a',
        ];
      }),
    });
    const notes = [h.props.notes, ...list.map((r) => r.planting.notes && `${nameOf(r)}: ${r.planting.notes}`)].filter(Boolean) as string[];
    if (notes.length) blocks.push({ type: 'bullets', items: notes });
    const relations = findCompanionRelations(list.map((r) => r.plant).filter((p): p is Plant => !!p), ctx.companions);
    for (const f of relations) {
      blocks.push({ type: 'paragraph', style: f.relation.kind === 'antagonistic' ? 'warning' : 'note', text: `${plantDisplayName(f.a)} ${f.relation.kind === 'antagonistic' ? tr('and') : '+'} ${plantDisplayName(f.b)} (${EVIDENCE_LABEL[f.relation.evidence]}): ${localizedText(f.relation.mechanism) ?? ''}` });
    }
  }
  if (rows.some((r) => r.quantitySource === 'override')) blocks.push({ type: 'paragraph', style: 'muted', text: tr('* Quantity set manually by you.') });
  blocks.push({ type: 'paragraph', style: 'muted', text: tr('Yields are estimated ranges, not guarantees. Dates are derived from average frost dates — adjust to the actual weather and soil temperature.') });
  return { ...header(ctx, 'planting-plan'), blocks };
}

export function buildGardenDesign(ctx: ReportContext): ReportDoc {
  const { doc } = ctx;
  const units = doc.settings.unitSystem;
  const objs = orderedObjects(doc).filter((o) => !o.hidden && o.kind !== 'label' && o.kind !== 'dimension' && o.kind !== 'line');
  const rows = collectRows(doc, ctx.lookup, ctx.language);
  const stats = gardenStats(doc, rows);
  const blocks: Block[] = [
    { type: 'plan', caption: tr('Garden design drawn to scale.'), fullPage: true },
    { type: 'pagebreak' },
    { type: 'heading', level: 2, text: tr('Legend') },
    {
      type: 'table',
      columns: [tr('Code'), tr('Name'), tr('Type'), tr('Size'), tr('Area'), tr('Details')],
      widths: [8, 24, 17, 22, 11, 18],
      rows: objs
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
        .map((o) => [
          o.code,
          o.name,
          kindInfo(o.kind).label,
          objectSize(o, units),
          isClosedShape(o.shape) || o.kind === 'path' ? formatArea(shapeArea(o.shape), units) : '—',
          [o.props.material, o.props.heightMm ? tr('height {{height}}', { height: formatLength(o.props.heightMm, units) }) : null].filter(Boolean).join(', '),
        ]),
    },
    { type: 'heading', level: 2, text: tr('Surfaces and areas') },
    { type: 'table', columns: [tr('Type'), tr('Count'), tr('Total area')], rows: stats.byKind.map((k) => [k.label, k.count, `${formatNumber(k.areaM2, k.areaM2 < 10 ? 2 : 1)} m²`]) },
  ];
  const uncal = doc.backgrounds.filter((b) => !b.calibration);
  if (uncal.length) blocks.push({ type: 'paragraph', style: 'warning', text: tr('The blueprint image has not been calibrated; dimensions measured against it may be inaccurate.') });
  return { ...header(ctx, 'garden-design', 'landscape'), blocks };
}

export function buildCareGuide(ctx: ReportContext): ReportDoc {
  const { doc, lookup } = ctx;
  const rows = collectRows(doc, lookup, ctx.language);
  const byPlant = new Map<string, Row[]>();
  for (const r of rows) byPlant.set(r.planting.plantId, [...(byPlant.get(r.planting.plantId) ?? []), r]);
  const blocks: Block[] = [];
  if (!rows.length) blocks.push({ type: 'paragraph', style: 'muted', text: tr('No plants assigned yet.') });
  const groups = new Map<PlantCategory | 'unknown', string[]>();
  for (const [pid, list] of byPlant) {
    const cat = list[0].plant?.category ?? 'unknown';
    groups.set(cat, [...(groups.get(cat) ?? []), pid]);
  }
  const order = [...CATEGORY_ORDER, 'unknown' as const];
  const lang = ctx.language;
  for (const cat of order) {
    const ids = groups.get(cat);
    if (!ids) continue;
    blocks.push({ type: 'heading', level: 2, text: cat === 'unknown' ? tr('Other plants') : CATEGORY_TITLES[cat] });
    ids.sort((a, b) => nameOf(byPlant.get(a)![0], lang).localeCompare(nameOf(byPlant.get(b)![0], lang)));
    for (const pid of ids) {
      const list = byPlant.get(pid)!;
      const plant = list[0].plant;
      const name = plant ? plantDisplayName(plant, lang) : pid;
      blocks.push({ type: 'heading', level: 3, text: `${name}${plant ? ` — ${plant.names.scientific}` : ''}` });
      const qty = list.reduce((s, r) => s + (r.quantity ?? 0), 0);
      const where = list.map((r) => `${r.host.code} ${r.host.name}${r.quantity != null ? ` (${r.quantity})` : ''}${r.planting.variety ? ` ‘${r.planting.variety}’` : ''}`).join('; ');
      const kv: [string, string][] = [
        [tr('Where'), where],
        [tr('Quantity'), `${qty}${list.some((r) => r.quantity == null) ? tr(' (some unknown)') : ''}`],
      ];
      if (!plant) {
        blocks.push({ type: 'kv', rows: kv }, { type: 'paragraph', style: 'muted', text: tr('No care data available for this plant.') });
        continue;
      }
      const p = plant.planting;
      const c = plant.care;
      const t = localizedText;
      const add = (label: string, value: string | null | undefined) => value && kv.push([label, value]);
      add(tr('Planting'), [t(p.directSowing, lang), t(p.transplanting, lang)].filter(Boolean).join(' '));
      add(tr('Spacing'), [p.inRowSpacingCm && tr('{{range}} cm between plants', { range: formatRange(p.inRowSpacingCm) }), p.rowSpacingCm && tr('{{range}} cm between rows', { range: formatRange(p.rowSpacingCm) })].filter(Boolean).join(', '));
      add(tr('Depth'), p.seedDepthCm ? tr('sow {{range}} cm deep', { range: formatRange(p.seedDepthCm, 1) }) : p.plantingDepthCm ? tr('plant {{range}} cm deep', { range: formatRange(p.plantingDepthCm, 1) }) : null);
      add(tr('Light'), plant.growing.sun?.join(', ').replace(/-/g, ' '));
      add(tr('Watering'), t(c.watering, lang) ?? (plant.growing.water ? tr('{{level}} water need', { level: tr(plant.growing.water) }) : null));
      add(tr('Feeding'), t(c.fertilizing, lang) ?? (c.feeding ? tr('{{level}} feeder', { level: tr(c.feeding) }) : null));
      add(tr('Pruning'), t(c.pruning, lang));
      add(tr('Support'), t(c.support, lang));
      add(tr('Thinning'), t(c.thinning, lang));
      add(tr('Mulching'), t(c.mulching, lang));
      add(tr('Pests'), t(c.pests, lang));
      add(tr('Diseases'), t(c.diseases, lang));
      add(tr('Harvest'), t(c.harvesting, lang));
      add(tr('Storage'), t(c.storage, lang));
      add(tr('Winter'), t(c.winter, lang));
      const warnings = list.flatMap((r) => checkSuitability(plant, r.host, doc.location).filter((i) => i.status === 'warning').map((i) => `${r.host.code}: ${i.message}`));
      blocks.push({ type: 'kv', rows: kv });
      if (warnings.length) blocks.push({ type: 'bullets', items: warnings });
    }
  }
  blocks.push({ type: 'paragraph', style: 'muted', text: tr('Care information is general guidance compiled from the plant database; local conditions and cultivar differences matter. Data confidence is recorded for each plant in the app.') });
  return { ...header(ctx, 'care-guide'), blocks };
}

export function buildCalendarDoc(ctx: ReportContext): ReportDoc {
  const cal = generatePlantingCalendar(ctx.doc, ctx.lookup, { language: ctx.language });
  const blocks: Block[] = [locationBlock(ctx.doc)];
  for (const w of cal.warnings) blocks.push({ type: 'paragraph', style: 'warning', text: w });
  const groups = groupEventsByMonth(cal.events);
  if (!cal.events.length) blocks.push({ type: 'paragraph', style: 'muted', text: tr('No calendar events — add plants to your beds first.') });
  for (const [ym, events] of groups) {
    const [y, m] = ym.split('-').map(Number);
    blocks.push({ type: 'heading', level: 2, text: `${MONTH_NAMES[m - 1]} ${y}` });
    blocks.push({
      type: 'table',
      columns: [tr('Done'), tr('Date'), tr('Task'), tr('Basis')],
      widths: [7, 20, 43, 30],
      rows: events.map((e) => [e.done ? '✓' : '☐', formatDateRange(e.start, e.end), e.title + (e.note ? ` — ${e.note}` : '') + (e.warnings.length ? ` ⚠ ${e.warnings.join(' ')}` : ''), e.overridden ? tr('Your date') : e.basis]),
    });
  }
  return { ...header(ctx, 'calendar'), blocks };
}

export function buildHarvestPlan(ctx: ReportContext): ReportDoc {
  const { doc, lookup } = ctx;
  const rows = collectRows(doc, lookup, ctx.language);
  const cal = generatePlantingCalendar(doc, lookup, { language: ctx.language });
  const stats = gardenStats(doc, rows);
  const blocks: Block[] = [
    {
      type: 'stats',
      items: [
        { label: tr('Estimated harvest'), value: stats.harvest.total ? kg(stats.harvest.total) : tr('n/a'), sub: tn('{{count}} plantings with yield data', stats.harvest.included) },
        { label: tr('Without yield data'), value: String(stats.harvest.excluded), sub: tr('not included in the total') },
      ],
    },
    {
      type: 'table',
      columns: [tr('Crop'), tr('Where'), tr('Qty'), tr('Harvest window'), tr('Estimated yield'), tr('Basis / confidence')],
      widths: [20, 12, 7, 20, 14, 27],
      rows: rows.map((r) => {
        const h = cal.events.find((e) => e.plantingId === r.planting.id && e.type === 'harvest');
        return [
          nameOf(r, ctx.language),
          r.host.code,
          r.quantity ?? '—',
          h ? formatDateRange(h.start, h.end) : '—',
          r.harvest.total ? kg(r.harvest.total) : 'unavailable',
          r.harvest.total ? tr('{{basis}}, {{confidence}} confidence', { basis: tr(r.harvest.basis), confidence: tr(r.harvest.confidence) }) : r.harvest.unavailableReason ?? '',
        ];
      }),
    },
    { type: 'heading', level: 2, text: tr('Assumptions') },
    {
      type: 'bullets',
      items: [
        tr('Yield figures are broad ranges for healthy home-garden plants in a reasonable season. Actual harvests vary with cultivar, weather, soil, pests and care.'),
        tr('Where the database has no reliable yield figure, no estimate is made and the crop is excluded from totals.'),
        tr('Harvest windows are derived from days-to-maturity or seasonal windows relative to your frost dates.'),
        ...[...new Set(rows.flatMap((r) => r.harvest.assumptions))].slice(0, 20),
      ],
    },
  ];
  return { ...header(ctx, 'harvest-plan', 'landscape'), blocks };
}

function statItems(stats: GardenStats, units: ProjectDoc['settings']['unitSystem']) {
  const area = (m2: number) => formatArea(m2 * 1e6, units);
  const items = [
    { label: tr('Planting area'), value: area(stats.plantingAreaM2), sub: tr('beds and plantable areas') },
    { label: tr('Vegetable & herb area'), value: area(stats.vegetableAreaM2), sub: tr('areas with edible crops') },
    { label: tr('Plants'), value: formatNumber(stats.plantCount), sub: stats.plantCountComplete ? tr('calculated or set by you') : tr('some quantities unknown') },
    { label: tr('Varieties'), value: String(stats.varieties) },
  ];
  if (stats.harvest.total) items.push({ label: tr('Estimated harvest'), value: kg(stats.harvest.total), sub: stats.harvest.excluded ? tn('{{count}} crops without data excluded', stats.harvest.excluded) : tr('range, not a guarantee') });
  return items;
}

export function buildCompleteReport(ctx: ReportContext): ReportDoc {
  const { doc, lookup } = ctx;
  const units = doc.settings.unitSystem;
  const rows = collectRows(doc, lookup, ctx.language);
  const stats = gardenStats(doc, rows);
  const cal = generatePlantingCalendar(doc, lookup, { language: ctx.language });
  const rotation = analyzeRotation(doc, lookup, ctx.rotationRules);
  const blocks: Block[] = [
    { type: 'heading', level: 2, text: tr('Overview') },
    ...(doc.meta.description ? [{ type: 'paragraph' as const, text: doc.meta.description }] : []),
    { type: 'stats', items: statItems(stats, units) },
    locationBlock(doc),
    { type: 'plan', caption: tr('Garden plan') },
    { type: 'pagebreak' },
    { type: 'heading', level: 2, text: tr('Areas') },
    {
      type: 'table',
      columns: [tr('Code'), tr('Name'), tr('Type'), tr('Size'), tr('Area'), tr('Sun'), tr('Soil'), tr('Irrigation')],
      widths: [7, 18, 14, 18, 10, 11, 10, 12],
      rows: orderedObjects(doc)
        .filter((o) => kindInfo(o.kind).surface || kindInfo(o.kind).plantable)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
        .map((o) => [o.code, o.name, kindInfo(o.kind).label, objectSize(o, units), formatArea(shapeArea(o.shape), units), o.props.sunLevel ? SUN_LABEL[o.props.sunLevel] : o.props.sunHours != null ? `${o.props.sunHours} h` : '—', o.props.soil ? tr(o.props.soil) : '—', o.props.irrigation ? tr(o.props.irrigation) : '—']),
    },
    { type: 'heading', level: 2, text: tr('Plants') },
    {
      type: 'table',
      columns: [tr('Area'), tr('Plant'), tr('Method'), tr('Qty'), tr('Planting'), tr('Harvest'), tr('Est. yield')],
      widths: [8, 22, 12, 7, 19, 17, 15],
      rows: rows.map((r) => [
        r.host.code,
        nameOf(r, ctx.language),
        r.rules.method,
        r.quantity ?? '—',
        eventsFor(cal, r.planting.id, ['sow-indoors', 'direct-sow', 'transplant', 'plant-out']),
        eventsFor(cal, r.planting.id, ['harvest']),
        r.harvest.total ? kg(r.harvest.total) : 'n/a',
      ]),
    },
  ];

  // Water & feeding summary (grouping plants by need)
  const needs = (get: (p: Plant) => string | null | undefined) => {
    const m = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.plant) continue;
      const v = get(r.plant) ?? 'unknown';
      m.set(v, (m.get(v) ?? new Set()).add(plantDisplayName(r.plant, ctx.language)));
    }
    return [...m.entries()].map(([k, v]) => [k, [...v].sort().join(', ')] as [string, string]);
  };
  if (rows.length) {
    blocks.push({ type: 'heading', level: 2, text: tr('Watering and feeding needs') });
    blocks.push({ type: 'heading', level: 3, text: tr('Water need') }, { type: 'kv', rows: needs((p) => p.growing.water) });
    blocks.push({ type: 'heading', level: 3, text: tr('Feeding need') }, { type: 'kv', rows: needs((p) => p.care.feeding) });
  }

  const woody = rows.filter((r) => r.host.kind === 'tree' || r.host.kind === 'shrub');
  if (woody.length) {
    blocks.push({ type: 'heading', level: 2, text: tr('Trees and shrubs') });
    blocks.push({
      type: 'table',
      columns: [tr('Code'), tr('Species'), tr('Planted'), tr('Mature size'), tr('Current size'), tr('First harvest'), tr('Est. yield')],
      rows: woody.map((r) => {
        const tp = r.host.props.tree ?? {};
        const p = r.plant;
        return [
          r.host.code,
          nameOf(r, ctx.language),
          tp.plantingDate ? formatDate(tp.plantingDate) : '—',
          p?.planting.matureHeightCm ? tr('H {{height}} × W {{width}} cm', { height: formatRange(p.planting.matureHeightCm), width: p.planting.matureWidthCm ? formatRange(p.planting.matureWidthCm) : '?' }) : '—',
          tp.currentHeightMm ? tr('H {{height}}', { height: formatLength(tp.currentHeightMm, units) }) : '—',
          p?.timing.yearsToFirstHarvest ? tr('{{range}} yr', { range: formatRange(p.timing.yearsToFirstHarvest) }) : '—',
          r.harvest.total ? kg(r.harvest.total) : 'n/a',
        ];
      }),
    });
  }

  blocks.push({ type: 'pagebreak' }, { type: 'heading', level: 2, text: tr('Planting calendar') });
  for (const [ym, events] of groupEventsByMonth(cal.events)) {
    const [y, m] = ym.split('-').map(Number);
    blocks.push({ type: 'heading', level: 3, text: `${MONTH_NAMES[m - 1]} ${y}` });
    blocks.push({ type: 'bullets', items: events.map((e) => `${formatDateRange(e.start, e.end)}: ${e.title}`) });
  }

  blocks.push({ type: 'heading', level: 2, text: tr('Crop rotation') });
  if (!rotation.length) blocks.push({ type: 'paragraph', style: 'muted', text: tr('No rotation history yet. Plantings from each season build it up automatically.') });
  for (const b of rotation) {
    const o = doc.objects[b.objectId];
    blocks.push({ type: 'paragraph', text: `${o.code} ${o.name}: ${b.entries.map((e) => `${e.season} ${tr(e.group)}${e.crops.length ? ` (${e.crops.join(', ')})` : ''}`).join(' → ') || '—'}${b.suggestion ? ` · ${tr('Suggested for {{season}}: {{group}}', { season: b.suggestion.season, group: tr(b.suggestion.group) })}` : ''}` });
    for (const i of b.issues) blocks.push({ type: 'paragraph', style: 'warning', text: i.message });
  }

  if (doc.notes.length || Object.values(doc.objects).some((o) => o.props.notes)) {
    blocks.push({ type: 'heading', level: 2, text: tr('Notes') });
    for (const n of doc.notes) blocks.push({ type: 'heading', level: 3, text: n.title }, { type: 'paragraph', text: n.body });
    const objNotes = Object.values(doc.objects).filter((o) => o.props.notes);
    if (objNotes.length) blocks.push({ type: 'bullets', items: objNotes.map((o) => `${o.code} ${o.name}: ${o.props.notes}`) });
  }

  // Warnings
  const warnings: string[] = [...cal.warnings];
  for (const r of rows) {
    if (r.plant) for (const i of checkSuitability(r.plant, r.host, doc.location)) if (i.status === 'warning') warnings.push(`${r.host.code} ${nameOf(r)}: ${i.message}`);
    for (const w of r.warnings) warnings.push(`${r.host.code} ${nameOf(r)}: ${w}`);
  }
  for (const e of cal.events) for (const w of e.warnings) warnings.push(`${e.title}: ${w}`);
  if (doc.backgrounds.some((b) => !b.calibration)) warnings.push(tr('A blueprint image is not calibrated; measurements taken from it may be off.'));
  blocks.push({ type: 'heading', level: 2, text: tr('Warnings') });
  blocks.push(warnings.length ? { type: 'bullets', items: [...new Set(warnings)] } : { type: 'paragraph', style: 'muted', text: tr('No warnings.') });

  blocks.push({ type: 'heading', level: 2, text: tr('Assumptions and data sources') });
  blocks.push({
    type: 'bullets',
    items: [
      tr('All measurements are real-world dimensions from the scaled plan.'),
      tr('Plant quantities are laid out on each area’s actual shape using the mid-range recommended spacing with an edge margin of half the spacing, unless you set other values.'),
      tr('Harvest estimates are ranges from plant yield data and are not guarantees; crops without reliable yield data are excluded from totals.'),
      tr('Calendar dates are derived from average frost dates and plant timing data.'),
      tr('Companion planting notes are labelled by evidence level; traditional advice is not presented as fact.'),
    ],
  });
  const usedSources = new Set(rows.flatMap((r) => r.plant?.provenance.sources.map((s) => s.id) ?? []));
  const srcRows = [...usedSources].map((id) => ctx.sources.get(id)).filter((s): s is DataSource => !!s);
  if (srcRows.length) blocks.push({ type: 'table', columns: [tr('Source'), tr('Licence'), tr('Notes')], widths: [30, 15, 55], rows: srcRows.map((s) => [s.title, s.license, s.notes ?? '']) });
  return { ...header(ctx, 'complete'), blocks };
}

export function buildReport(kind: ReportKind, ctx: ReportContext): ReportDoc {
  switch (kind) {
    case 'planting-plan':
      return buildPlantingPlan(ctx);
    case 'garden-design':
      return buildGardenDesign(ctx);
    case 'care-guide':
      return buildCareGuide(ctx);
    case 'calendar':
      return buildCalendarDoc(ctx);
    case 'harvest-plan':
      return buildHarvestPlan(ctx);
    case 'complete':
      return buildCompleteReport(ctx);
  }
}

/** Convenience used by the spec's naming: deterministic care guide generation. */
export function generateCareGuide(ctx: ReportContext): ReportDoc {
  return buildCareGuide(ctx);
}
