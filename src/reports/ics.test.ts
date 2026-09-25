import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { calendarIcs, foldIcsLine } from './csv';

const catalog = loadCoreCatalog();
const lookup = (id: string) => catalog.get(id);

function project() {
  const doc = createProject('Allotment', { now: new Date('2026-01-01'), location: { lastFrost: '05-20', firstFrost: '09-25' } });
  doc.settings.activeSeason = 2026;
  const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 });
  addObjects(doc, [bed]);
  assignPlant(doc, [bed.id], 'daucus-carota-sativus');
  return doc;
}

/** Undoes RFC 5545 line folding. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('iCalendar export', () => {
  it('keeps every physical line within 75 octets, including multi-byte text', () => {
    const doc = project();
    doc.customTasks.push({ id: 'long', title: `Kitkentä ja kastelu – ${'ääkköset ja 🌱 taimet '.repeat(8)}`, start: '2026-06-01', end: null, objectId: null, notes: '', done: false });
    const ics = calendarIcs(doc, lookup, new Date('2026-01-01T00:00:00Z'));
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    // Folding never splits a character, and unfolding restores the title exactly.
    expect(unfold(ics)).toContain(`SUMMARY:${doc.customTasks[0].title}`);
  });

  it('uses exclusive all-day end dates that calendar apps show on the right days', () => {
    const doc = project();
    doc.customTasks.push(
      { id: 'one-day', title: 'Order seed', start: '2026-03-01', end: null, objectId: null, notes: '', done: false },
      { id: 'span', title: 'Holiday watering', start: '2026-07-30', end: '2026-08-02', objectId: null, notes: '', done: false },
      { id: 'year-end', title: 'Plan next year', start: '2026-12-31', end: null, objectId: null, notes: '', done: false },
    );
    const ics = unfold(calendarIcs(doc, lookup));
    const event = (uid: string) => ics.split('BEGIN:VEVENT').find((e) => e.includes(`UID:${uid}@`))!;
    expect(event('one-day')).toMatch(/DTSTART;VALUE=DATE:20260301\r\nDTEND;VALUE=DATE:20260302/);
    expect(event('span')).toMatch(/DTSTART;VALUE=DATE:20260730\r\nDTEND;VALUE=DATE:20260803/);
    expect(event('year-end')).toMatch(/DTEND;VALUE=DATE:20270101/);
  });

  it('is a well-formed calendar with one VEVENT per visible event', () => {
    const ics = calendarIcs(project(), lookup);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    const begins = ics.match(/BEGIN:VEVENT/g)!.length;
    expect(begins).toBeGreaterThan(0);
    expect(ics.match(/END:VEVENT/g)!.length).toBe(begins);
    // UIDs are unique so re-importing updates events instead of duplicating them.
    const uids = ics.match(/^UID:.*$/gm)!;
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('folds lines exactly at the octet limit', () => {
    expect(foldIcsLine('a'.repeat(75))).toBe('a'.repeat(75));
    expect(foldIcsLine('a'.repeat(76))).toBe(`${'a'.repeat(75)}\r\n a`);
    // "ä" is two octets: 37 of them (74 octets) fit on the first line, the 38th does not.
    expect(foldIcsLine('ä'.repeat(38)).split('\r\n ')[0]).toBe('ä'.repeat(37));
  });
});
