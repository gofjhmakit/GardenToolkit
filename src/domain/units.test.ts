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
