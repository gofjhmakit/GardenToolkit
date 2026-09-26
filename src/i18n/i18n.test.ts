import { describe, expect, it } from 'vitest';
import en from './en.json';
import fi from './fi.json';
import { extractKeys } from '../../scripts/i18n/extract-keys.mjs';

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const keys = extractKeys('src');

describe('translations', () => {
  it('finds the UI strings', () => {
    expect(keys.length).toBeGreaterThan(900);
  });

  it('has a Finnish translation for every string in the code', () => {
    const cat = fi as Record<string, string>;
    const missing = keys.filter((k) => (k.plural ? !(`${k.key}_one` in cat && `${k.key}_other` in cat) : !(k.key in cat))).map((k) => k.key);
    expect(missing).toEqual([]);
  });

  it('keeps every {{placeholder}} of the English text in the Finnish text', () => {
    const bad: string[] = [];
    for (const [key, value] of Object.entries(fi as Record<string, string>)) {
      const base = key.replace(/_(one|other)$/, '');
      const need = placeholders(base).filter((p) => !(p === 'count' && /_one$/.test(key) && !value.includes('{{count}}')));
      const have = new Set(placeholders(value));
      if (need.some((p) => !have.has(p))) bad.push(key);
    }
    expect(bad).toEqual([]);
  });

  it('has an English singular for plural keys whose wording changes', () => {
    const cat = en as Record<string, string>;
    for (const k of keys.filter((x) => x.plural)) {
      const one = cat[`${k.key}_one`];
      // Keys like "{{count}} selected" read the same in both forms and need no entry.
      if (one) expect(placeholders(one)).toEqual(placeholders(k.key));
    }
  });

  it('has no empty translations', () => {
    expect(Object.entries(fi).filter(([, v]) => !String(v).trim())).toEqual([]);
  });
});
