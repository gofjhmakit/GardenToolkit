import { describe, expect, it } from 'vitest';
import { addDays, addWeeks, diffDays, formatDate, formatDateRange, isValidIsoDate, isValidMonthDay, monthDayToIso, monthOf, yearOf } from './dates';

describe('date helpers', () => {
  it('does timezone-safe arithmetic across DST and year ends', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addWeeks('2026-05-20', -8)).toBe('2026-03-25');
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364);
    expect(monthDayToIso(2028, '02-29')).toBe('2028-02-29');
    expect(monthOf('2026-07-04')).toBe(7);
    expect(yearOf('2026-07-04')).toBe(2026);
  });
  it('validates and formats', () => {
    expect(isValidIsoDate('2026-01-01')).toBe(true);
    expect(isValidIsoDate('nope')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
    expect(formatDate('2026-07-04')).toBe('4 Jul');
    expect(formatDateRange('2026-07-04', '2026-07-04')).toBe('4 Jul');
    expect(formatDateRange('2026-07-04', '2026-08-01')).toBe('4 Jul – 1 Aug');
  });
});

describe('date validation rejects impossible dates', () => {
  it('rejects dates that would silently roll over into another month', () => {
    expect(isValidIsoDate('2026-13-45')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-00-10')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-12-31')).toBe(true);
    // Timestamps are accepted by their date part.
    expect(isValidIsoDate('2026-05-01T10:00:00Z')).toBe(true);
  });
  it('validates recurring MM-DD dates such as frost dates', () => {
    expect(isValidMonthDay('05-20')).toBe(true);
    expect(isValidMonthDay('02-29')).toBe(true);
    expect(isValidMonthDay('02-30')).toBe(false);
    expect(isValidMonthDay('13-01')).toBe(false);
    expect(isValidMonthDay('5-20')).toBe(false);
    expect(isValidMonthDay(null)).toBe(false);
  });
});
