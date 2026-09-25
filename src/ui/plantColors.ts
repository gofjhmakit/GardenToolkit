import type { PlantCategory } from '../plants/schema';

export const CATEGORY_COLORS: Record<PlantCategory, string> = {
  vegetable: '#1E7A4C',
  herb: '#4F9A43',
  fruit: '#B83C0C',
  berry: '#753753',
  'fruit-tree': '#C66A38',
  nut: '#7A4F2A',
  tree: '#1A4F33',
  shrub: '#3C8467',
  flower: '#BD609A',
  perennial: '#814AAB',
  bulb: '#A87F0A',
  vine: '#455689',
  grass: '#809160',
  groundcover: '#1A727B',
  'green-manure': '#6A741C',
  aquatic: '#2F86C8',
};

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  vegetable: 'Vegetable',
  herb: 'Herb',
  fruit: 'Fruit',
  berry: 'Berry',
  'fruit-tree': 'Fruit tree',
  nut: 'Nut',
  tree: 'Tree',
  shrub: 'Shrub',
  flower: 'Flower',
  perennial: 'Perennial',
  bulb: 'Bulb',
  vine: 'Vine / climber',
  grass: 'Grass',
  groundcover: 'Groundcover',
  'green-manure': 'Green manure',
  aquatic: 'Aquatic',
};

/** Stable colour for a plant id (distinguishes several plantings in one bed). */
export function plantColor(id: string, category?: PlantCategory): string {
  if (category) {
    const base = CATEGORY_COLORS[category];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const shift = (h % 5) - 2;
    return shiftColor(base, shift * 14);
  }
  return '#557755';
}

function shiftColor(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
