/**
 * Registry describing each garden object kind: default layer, shape, look and
 * which inspector fields apply. Adding a new kind is a data change here plus
 * an entry in ObjectKindSchema — no editor code needs to change.
 */
import type { ShapeType } from './geometry';
import type { ObjectKind } from './project';

export type DefaultLayerKey =
  | 'background'
  | 'ground'
  | 'structures'
  | 'paths'
  | 'beds'
  | 'plants'
  | 'trees'
  | 'measurements'
  | 'labels';

export const DEFAULT_LAYERS: { key: DefaultLayerKey; name: string; role: 'background' | 'content' }[] = [
  { key: 'background', name: 'Background', role: 'background' },
  { key: 'ground', name: 'Ground & lawn', role: 'content' },
  { key: 'structures', name: 'Structures', role: 'content' },
  { key: 'paths', name: 'Paths', role: 'content' },
  { key: 'beds', name: 'Beds & areas', role: 'content' },
  { key: 'plants', name: 'Plants & shrubs', role: 'content' },
  { key: 'trees', name: 'Trees', role: 'content' },
  { key: 'measurements', name: 'Measurements', role: 'content' },
  { key: 'labels', name: 'Labels', role: 'content' },
];

export type InspectorField =
  | 'soil'
  | 'sun'
  | 'irrigation'
  | 'material'
  | 'height'
  | 'tree'
  | 'pathWidth'
  | 'text'
  | 'rowAxis';

export interface ObjectKindInfo {
  kind: ObjectKind;
  label: string;
  /** Code prefix for plan references (B1, T2 …). */
  prefix: string;
  layer: DefaultLayerKey;
  defaultShape: ShapeType;
  /** Whether plants can be assigned (plantings). */
  plantable: boolean;
  /** Treats the object as an area in reports (lawn/gravel etc. count as surfaces). */
  surface: boolean;
  fill: string;
  stroke: string;
  pattern?: 'grass' | 'gravel' | 'soil' | 'water' | 'glazing' | 'paving' | 'hatch';
  fields: InspectorField[];
  group: 'Beds & planting' | 'Trees & shrubs' | 'Surfaces' | 'Structures' | 'Drawing' | 'Annotation';
}

const bedFields: InspectorField[] = ['soil', 'sun', 'irrigation', 'rowAxis'];

export const OBJECT_KINDS_INFO: Record<ObjectKind, ObjectKindInfo> = {
  bed: { kind: 'bed', label: 'Garden bed', prefix: 'B', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#D5C29B', stroke: '#7A5C33', pattern: 'soil', fields: bedFields, group: 'Beds & planting' },
  'raised-bed': { kind: 'raised-bed', label: 'Raised bed', prefix: 'RB', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#C6A57A', stroke: '#6A4724', pattern: 'soil', fields: [...bedFields, 'height', 'material'], group: 'Beds & planting' },
  planter: { kind: 'planter', label: 'Planter / container', prefix: 'PL', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#D8AE90', stroke: '#8C4A2C', pattern: 'soil', fields: [...bedFields, 'height', 'material'], group: 'Beds & planting' },
  'vegetable-bed': { kind: 'vegetable-bed', label: 'Vegetable bed', prefix: 'V', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#CBBC89', stroke: '#625426', pattern: 'soil', fields: bedFields, group: 'Beds & planting' },
  'flower-bed': { kind: 'flower-bed', label: 'Flower bed', prefix: 'F', layer: 'beds', defaultShape: 'polygon', plantable: true, surface: true, fill: '#E4C3CC', stroke: '#9A4A66', pattern: 'soil', fields: bedFields, group: 'Beds & planting' },
  'herb-area': { kind: 'herb-area', label: 'Herb area', prefix: 'H', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#C6D3A4', stroke: '#556C33', pattern: 'soil', fields: bedFields, group: 'Beds & planting' },
  'ground-crop-area': { kind: 'ground-crop-area', label: 'Potato / ground crop area', prefix: 'G', layer: 'beds', defaultShape: 'rect', plantable: true, surface: true, fill: '#CDB38D', stroke: '#6B4F2C', pattern: 'soil', fields: bedFields, group: 'Beds & planting' },
  orchard: { kind: 'orchard', label: 'Orchard area', prefix: 'O', layer: 'ground', defaultShape: 'polygon', plantable: true, surface: true, fill: '#D9E3B9', stroke: '#557036', pattern: 'grass', fields: ['soil', 'sun', 'irrigation'], group: 'Beds & planting' },
  area: { kind: 'area', label: 'Generic garden area', prefix: 'A', layer: 'beds', defaultShape: 'polygon', plantable: true, surface: true, fill: '#E2DCC9', stroke: '#6B6450', fields: ['soil', 'sun', 'irrigation', 'material'], group: 'Beds & planting' },
  tree: { kind: 'tree', label: 'Tree', prefix: 'T', layer: 'trees', defaultShape: 'ellipse', plantable: true, surface: false, fill: '#86AC70', stroke: '#2F5627', fields: ['tree', 'sun', 'soil'], group: 'Trees & shrubs' },
  shrub: { kind: 'shrub', label: 'Bush / shrub', prefix: 'S', layer: 'plants', defaultShape: 'ellipse', plantable: true, surface: false, fill: '#A3C486', stroke: '#426B30', fields: ['tree', 'sun', 'soil'], group: 'Trees & shrubs' },
  lawn: { kind: 'lawn', label: 'Lawn', prefix: 'L', layer: 'ground', defaultShape: 'polygon', plantable: false, surface: true, fill: '#C8E0A9', stroke: '#4E7D34', pattern: 'grass', fields: ['sun', 'irrigation'], group: 'Surfaces' },
  gravel: { kind: 'gravel', label: 'Gravel area', prefix: 'GR', layer: 'ground', defaultShape: 'polygon', plantable: false, surface: true, fill: '#E3DFD6', stroke: '#756E61', pattern: 'gravel', fields: ['material'], group: 'Surfaces' },
  soil: { kind: 'soil', label: 'Soil area', prefix: 'SO', layer: 'ground', defaultShape: 'polygon', plantable: true, surface: true, fill: '#CBB08C', stroke: '#6F5234', pattern: 'soil', fields: ['soil', 'sun'], group: 'Surfaces' },
  water: { kind: 'water', label: 'Water feature', prefix: 'W', layer: 'ground', defaultShape: 'ellipse', plantable: true, surface: true, fill: '#AAD0E4', stroke: '#2F6C90', pattern: 'water', fields: ['material'], group: 'Surfaces' },
  path: { kind: 'path', label: 'Path', prefix: 'P', layer: 'paths', defaultShape: 'polyline', plantable: false, surface: true, fill: '#DED4C0', stroke: '#76684F', pattern: 'paving', fields: ['material', 'pathWidth'], group: 'Surfaces' },
  greenhouse: { kind: 'greenhouse', label: 'Greenhouse', prefix: 'GH', layer: 'structures', defaultShape: 'rect', plantable: true, surface: true, fill: '#DCEDE8', stroke: '#3A7468', pattern: 'glazing', fields: ['soil', 'irrigation', 'height', 'material', 'rowAxis'], group: 'Structures' },
  compost: { kind: 'compost', label: 'Compost area', prefix: 'C', layer: 'structures', defaultShape: 'rect', plantable: false, surface: true, fill: '#A89070', stroke: '#4B3922', pattern: 'hatch', fields: ['material'], group: 'Structures' },
  building: { kind: 'building', label: 'Building / structure', prefix: 'BLD', layer: 'structures', defaultShape: 'rect', plantable: false, surface: false, fill: '#D8D5CE', stroke: '#514D46', pattern: 'hatch', fields: ['material', 'height'], group: 'Structures' },
  shape: { kind: 'shape', label: 'Shape', prefix: 'SH', layer: 'beds', defaultShape: 'rect', plantable: false, surface: false, fill: '#E9E4D8', stroke: '#6B6557', fields: [], group: 'Drawing' },
  line: { kind: 'line', label: 'Line', prefix: 'LN', layer: 'measurements', defaultShape: 'polyline', plantable: false, surface: false, fill: 'none', stroke: '#46433C', fields: [], group: 'Drawing' },
  label: { kind: 'label', label: 'Text label', prefix: 'TX', layer: 'labels', defaultShape: 'text', plantable: false, surface: false, fill: '#27251F', stroke: 'none', fields: ['text'], group: 'Annotation' },
  dimension: { kind: 'dimension', label: 'Dimension', prefix: 'D', layer: 'measurements', defaultShape: 'dimension', plantable: false, surface: false, fill: 'none', stroke: '#2C5E6B', fields: [], group: 'Annotation' },
};

export function kindInfo(kind: ObjectKind): ObjectKindInfo {
  return OBJECT_KINDS_INFO[kind];
}

/** Kinds that can be converted between each other (same geometric family). */
export function compatibleKinds(shapeType: ShapeType): ObjectKindInfo[] {
  return Object.values(OBJECT_KINDS_INFO).filter((k) => {
    if (shapeType === 'text') return k.kind === 'label';
    if (shapeType === 'dimension') return k.kind === 'dimension';
    if (shapeType === 'polyline') return k.kind === 'path' || k.kind === 'line';
    return k.defaultShape !== 'text' && k.defaultShape !== 'dimension' && k.defaultShape !== 'polyline';
  });
}
