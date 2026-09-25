/**
 * CSV exports. Cells are quoted per RFC 4180 and cells that a spreadsheet
 * could interpret as a formula are neutralised (CSV injection).
 */
import type { ProjectDoc } from '../domain/project';
import { kindInfo } from '../domain/objectKinds';
import { shapeArea, shapePerimeter } from '../domain/geometry';
import type { PlantLookup } from '../engine/plantings';
import { generatePlantingCalendar } from '../engine/calendar';
import { collectRows } from './builders';

export function csvCell(v: unknown): string {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function plantingsCsv(doc: ProjectDoc, lookup: PlantLookup): string {
  const rows = collectRows(doc, lookup);
  return toCsv(
    ['area_code', 'area_name', 'area_type', 'plant_id', 'common_name', 'scientific_name', 'variety', 'season', 'method', 'area_m2', 'calculated_plants', 'calculated_min', 'calculated_max', 'user_quantity', 'quantity_used', 'in_row_spacing_cm', 'row_spacing_cm', 'seeds_min', 'seeds_max', 'yield_min_kg', 'yield_max_kg', 'yield_basis', 'yield_confidence', 'status', 'notes'],
    rows.map((r) => [
      r.host.code,
      r.host.name,
      kindInfo(r.host.kind).label,
      r.planting.plantId,
      r.plant?.names.common.en?.[0] ?? '',
      r.plant?.names.scientific ?? '',
      r.planting.variety,
      r.planting.season,
      r.rules.method,
      r.areaM2.toFixed(3),
      r.capacity.plants ?? '',
      r.capacity.plantsRange?.min ?? '',
      r.capacity.plantsRange?.max ?? '',
      r.planting.quantityOverride ?? '',
      r.quantity ?? '',
      r.capacity.inRowMm ? (r.capacity.inRowMm / 10).toFixed(1) : '',
      r.capacity.rowMm ? (r.capacity.rowMm / 10).toFixed(1) : '',
      r.capacity.seeds?.min ?? '',
      r.capacity.seeds?.max ?? '',
      r.harvest.total?.min.toFixed(2) ?? '',
      r.harvest.total?.max.toFixed(2) ?? '',
      r.harvest.basis,
      r.harvest.confidence,
      r.planting.status,
      r.planting.notes,
    ]),
  );
}

export function objectsCsv(doc: ProjectDoc): string {
  const objs = doc.layers.flatMap((l) => l.objectIds.map((id) => doc.objects[id]).filter(Boolean).map((o) => ({ o, layer: l.name })));
  return toCsv(
    ['code', 'name', 'type', 'layer', 'x_m', 'y_m', 'rotation_deg', 'area_m2', 'perimeter_m', 'sun', 'sun_hours', 'soil', 'irrigation', 'material', 'height_cm', 'locked', 'hidden', 'notes'],
    objs.map(({ o, layer }) => [
      o.code,
      o.name,
      kindInfo(o.kind).label,
      layer,
      (o.transform.x / 1000).toFixed(3),
      (o.transform.y / 1000).toFixed(3),
      o.transform.rotation.toFixed(1),
      (shapeArea(o.shape) / 1e6).toFixed(3),
      (shapePerimeter(o.shape) / 1000).toFixed(3),
      o.props.sunLevel ?? '',
      o.props.sunHours ?? '',
      o.props.soil ?? '',
      o.props.irrigation ?? '',
      o.props.material ?? '',
      o.props.heightMm ? (o.props.heightMm / 10).toFixed(1) : '',
      o.locked,
      o.hidden,
      o.props.notes ?? '',
    ]),
  );
}

export function calendarCsv(doc: ProjectDoc, lookup: PlantLookup): string {
  const cal = generatePlantingCalendar(doc, lookup);
  return toCsv(
    ['start', 'end', 'type', 'task', 'areas', 'basis', 'done', 'note', 'warnings'],
    cal.events.map((e) => [e.start, e.end ?? '', e.type, e.title, e.objectIds.map((id) => doc.objects[id]?.code ?? '').join(' '), e.basis, e.done, e.note, e.warnings.join(' ')]),
  );
}

/** iCalendar export of calendar tasks (all-day events). */
export function calendarIcs(doc: ProjectDoc, lookup: PlantLookup, now = new Date()): string {
  const cal = generatePlantingCalendar(doc, lookup);
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const d = (iso: string) => iso.replace(/-/g, '');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Garden Toolkit//EN', 'CALSCALE:GREGORIAN'];
  for (const e of cal.events) {
    const end = new Date(Date.parse(e.end ?? e.start) + 86_400_000).toISOString().slice(0, 10);
    lines.push('BEGIN:VEVENT', `UID:${esc(e.id)}@garden-toolkit`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(e.start)}`, `DTEND;VALUE=DATE:${d(end)}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.basis)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

