import { describe, expect, it } from 'vitest';
import { formatArea, formatLength, parseLength, toMm } from './units';

describe('units', () => {
  it('parses lengths with units and comma decimals', () => {
    expect(parseLength('3')).toBe(3000);
    expect(parseLength('3 m')).toBe(3000);
    expect(parseLength('120cm')).toBe(1200);
    expect(parseLength('2,5 m')).toBe(2500);
    expect(parseLength('10', 'cm')).toBe(100);
    expect(parseLength("10'")).toBeCloseTo(3048);
    expect(parseLength('abc')).toBeNull();
    expect(parseLength('')).toBeNull();
    expect(parseLength('5 parsecs')).toBeNull();
  });
  it('formats lengths and areas', () => {
    expect(formatLength(3000)).toBe('3.00 m');
    expect(formatLength(250)).toBe('25 cm');
    expect(formatLength(5)).toBe('5 mm');
    expect(formatArea(3.6e6)).toBe('3.60 m²');
    expect(formatArea(3.6e6, 'imperial')).toBe('38.8 ft²');
    expect(toMm(1, 'ft')).toBeCloseTo(304.8);
  });
});

describe('units — imperial and odd input', () => {
  it('formats imperial lengths', () => {
    expect(formatLength(254, 'imperial')).toBe('10.0 in');
    expect(formatLength(3048, 'imperial')).toBe('10′ 0.0″');
    expect(formatLength(NaN)).toBe('—');
    expect(formatArea(NaN)).toBe('—');
  });
  it('parses unit words and rejects garbage', () => {
    expect(parseLength('2 metres')).toBe(2000);
    expect(parseLength('15 millimeters')).toBe(15);
    expect(parseLength('.5m')).toBe(500);
    expect(parseLength('-1 m')).toBe(-1000);
    expect(parseLength('1e3')).toBeNull();
    expect(parseLength('3 m 20 cm')).toBeNull();
  });
});

describe('units — what imperial users type and read', () => {
  it('parses feet and inches written together', () => {
    const ft6in = 6 * 304.8 + 6 * 25.4;
    expect(parseLength(`6' 6"`)).toBeCloseTo(ft6in);
    expect(parseLength(`6'6"`)).toBeCloseTo(ft6in);
    expect(parseLength('6′ 6″')).toBeCloseTo(ft6in);
    expect(parseLength('6 ft 6 in')).toBeCloseTo(ft6in);
    expect(parseLength(`6'6`)).toBeCloseTo(ft6in);
    expect(parseLength(`-2' 3"`)).toBeCloseTo(-(2 * 304.8 + 3 * 25.4));
    expect(parseLength(`6' 6 m`)).toBeNull();
  });
  it('never shows 12 inches in the inch part', () => {
    // 71.996 in used to be shown as 5′ 12.0″.
    expect(formatLength(1828.7, 'imperial')).toBe('6′ 0.0″');
    expect(formatLength(-1828.7, 'imperial')).toBe('-6′ 0.0″');
    expect(formatLength(609.5, 'imperial')).toBe('2′ 0.0″');
    for (let mm = 610; mm < 4000; mm += 0.37) {
      const inchPart = Number(/ ([\d.]+)″$/.exec(formatLength(mm, 'imperial'))![1]);
      expect(inchPart).toBeLessThan(12);
    }
  });
  it('reads back what it displays (imperial round trip within display precision)', () => {
    for (let mm = 610; mm < 30000; mm += 97.3) {
      expect(parseLength(formatLength(mm, 'imperial'))).toBeCloseTo(mm, -1);
    }
  });
});
