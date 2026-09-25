import type { PlantCategory } from '../plants/schema';

export const CATEGORY_COLORS: Record<PlantCategory, string> = {
  vegetable: '#3f8a4a',
  herb: '#6c9a2e',
  fruit: '#c0492f',
  berry: '#8e3a6b',
  'fruit-tree': '#b5652b',
  nut: '#8a6a3a',
  tree: '#2f6a45',
  shrub: '#4f8a6a',
  flower: '#c05a8a',
  perennial: '#8a5ac0',
  bulb: '#c0a02a',
  vine: '#5a7ac0',
  grass: '#7a9a4a',
  groundcover: '#5a9a7a',
  'green-manure': '#9aa83a',
  aquatic: '#3a8ab0',
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
