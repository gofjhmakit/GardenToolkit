import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Download, EyeOff, RotateCcw } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { usePlantLookup } from '../../app/lookup';
import { generatePlantingCalendar, groupEventsByMonth, type CalendarEvent } from '../../engine/calendar';
import { MONTH_NAMES, formatDateRange, parseIso } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { calendarCsv, calendarIcs } from '../../reports/csv';
import { downloadText, safeFileName } from '../../lib/download';
import { Checkbox } from '../components/Fields';

export const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  prepare: '#8a6a3a',
  'sow-indoors': '#6a7ac0',
  'direct-sow': '#3f8a4a',
  transplant: '#2f7a8a',
  'plant-out': '#2f7a8a',
  succession: '#7aa04a',
  harvest: '#c0692f',
  custom: '#8a5ac0',
};

const TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  prepare: 'Prepare',
  'sow-indoors': 'Sow indoors',
  'direct-sow': 'Sow outdoors',
  transplant: 'Transplant',
  'plant-out': 'Plant out',
  succession: 'Succession',
  harvest: 'Harvest',
  custom: 'Task',
};

export function CalendarView() {
  const doc = useEditor((s) => s.doc)!;
  const lookup = usePlantLookup();
  const cal = useMemo(() => generatePlantingCalendar(doc, lookup), [doc, lookup]);
  const [showDone, setShowDone] = useState(true);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(`${doc.settings.activeSeason}-05-01`);
  const groups = groupEventsByMonth(cal.events.filter((e) => showDone || !e.done));
  const hiddenCount = Object.values(doc.calendarOverrides).filter((o) => o.hidden).length;
  const setOverride = (id: string, patch: Record<string, unknown>, label: string) =>
    useEditor.getState().commit(label, (d) => {
      const custom = d.customTasks.find((t) => t.id === id);
      if (custom) {
        if ('done' in patch) custom.done = !!patch.done;
        if ('start' in patch && typeof patch.start === 'string') custom.start = patch.start;
        if (patch.hidden) d.customTasks = d.customTasks.filter((t) => t.id !== id);
        return;
      }
      d.calendarOverrides[id] = { ...d.calendarOverrides[id], ...patch };
    });

  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>Planting calendar {doc.settings.activeSeason}</h1>
          <p className="muted">
            Generated from your plants and frost dates (last frost {cal.lastFrost}, first frost {cal.firstFrost}). Edits you make here are kept when the calendar is regenerated.
          </p>
        </div>
        <span className="spacer" />
        <Checkbox checked={showDone} onChange={setShowDone} label="Show completed" />
        <button className="btn" onClick={() => downloadText(calendarIcs(doc, lookup), `${safeFileName(doc.meta.name)}-calendar.ics`, 'text/calendar')}>
          <Download size={14} /> iCal
        </button>
        <button className="btn" onClick={() => downloadText(calendarCsv(doc, lookup), `${safeFileName(doc.meta.name)}-calendar.csv`, 'text/csv')}>
          <Download size={14} /> CSV
        </button>
      </div>
      {cal.warnings.map((w, i) => (
        <div key={i} className="callout warn">
          <AlertTriangle size={14} />
          <span>
            {w}{' '}
            <button className="btn sm" onClick={() => useEditor.getState().setWorkspace('settings')}>Set location</button>
          </span>
        </div>
      ))}
      <Timeline events={cal.events} season={doc.settings.activeSeason} />
      <form
        className="card row wrap"
        onSubmit={(e) => {
          e.preventDefault();
          if (!taskTitle.trim()) return;
          useEditor.getState().commit('Add task', (d) => {
            d.customTasks.push({ id: newId('task'), title: taskTitle.trim(), start: taskDate, end: null, objectId: null, notes: '', done: false });
          });
          setTaskTitle('');
        }}
      >
        <CalendarPlus size={16} />
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Add your own task, e.g. “Order seed potatoes”" aria-label="Task title" value={taskTitle} maxLength={300} onChange={(e) => setTaskTitle(e.target.value)} />
        <input className="input" style={{ width: 160 }} type="date" aria-label="Task date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!taskTitle.trim()}>
          Add task
        </button>
        {hiddenCount > 0 && (
          <button type="button" className="btn ghost" onClick={() => useEditor.getState().commit('Restore hidden events', (d) => {
            for (const o of Object.values(d.calendarOverrides)) delete o.hidden;
          })}>
            <RotateCcw size={13} /> Restore {hiddenCount} hidden
          </button>
        )}
      </form>
      {cal.events.length === 0 && <div className="empty-state">No events yet — add plants to your beds to generate the calendar.</div>}
      <div>
        {[...groups.entries()].map(([ym, events]) => {
          const [y, m] = ym.split('-').map(Number);
          return (
            <section key={ym} className="month-block" aria-label={`${MONTH_NAMES[m - 1]} ${y}`}>
              <div className="month-name">
                {MONTH_NAMES[m - 1]}
                <div className="muted tiny">{y}</div>
              </div>
              <div>
                {events.map((e) => (
                  <div key={e.id} className={`event ${e.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={e.done} aria-label={`Mark "${e.title}" done`} onChange={(ev) => setOverride(e.id, { done: ev.target.checked }, 'Mark done')} />
                    <span className="event-type" style={{ background: EVENT_COLORS[e.type] }} title={TYPE_LABELS[e.type]} />
                    <div style={{ flex: 1 }}>
                      <div className="event-title">
                        <strong>{e.title}</strong> <span className="muted small">{formatDateRange(e.start, e.end)}</span>
                        {e.overridden && <span className="badge accent" style={{ marginLeft: 6 }}>your date</span>}
                      </div>
                      <div className="tiny muted">{e.basis}</div>
                      {e.warnings.map((w, i) => (
                        <div key={i} className="tiny" style={{ color: 'var(--warn)' }}>
                          ⚠ {w}
                        </div>
                      ))}
                    </div>
                    <input className="input sm" style={{ width: 140 }} type="date" aria-label={`Change date of "${e.title}"`} value={e.start} onChange={(ev) => ev.target.value && setOverride(e.id, { start: ev.target.value }, 'Change date')} />
                    {e.overridden && e.type !== 'custom' && (
                      <button className="icon-btn sm" title="Reset to calculated date" aria-label="Reset date" onClick={() => setOverride(e.id, { start: null }, 'Reset date')}>
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button className="icon-btn sm" title={e.type === 'custom' ? 'Delete task' : 'Hide event'} aria-label="Hide event" onClick={() => setOverride(e.id, { hidden: true }, 'Hide event')}>
                      <EyeOff size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Year strip showing each planting's sowing → harvest windows. */
function Timeline({ events, season }: { events: CalendarEvent[]; season: number }) {
  const start = Date.UTC(season, 0, 1);
  const end = Date.UTC(season + 1, 0, 1);
  const span = end - start;
  const byPlanting = new Map<string, CalendarEvent[]>();
  for (const e of events) if (e.plantingId) byPlanting.set(e.plantingId, [...(byPlanting.get(e.plantingId) ?? []), e]);
  if (!byPlanting.size) return null;
  const pos = (iso: string) => Math.max(0, Math.min(1, (parseIso(iso) - start) / span));
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '4px 10px', minWidth: 720 }}>
        <div />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }} className="tiny muted">
          {MONTH_NAMES.map((m) => (
            <div key={m}>{m.slice(0, 3)}</div>
          ))}
        </div>
        {[...byPlanting.entries()].map(([pid, evs]) => {
          const label = evs[0].title.replace(/^[^:]+:\s*/, '');
          return (
            <div key={pid} style={{ display: 'contents' }}>
              <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
                {label}
              </div>
              <div className="timeline" aria-hidden="true">
                {evs.map((e) => {
                  const a = pos(e.start);
                  const b = pos(e.end ?? e.start);
                  return <span key={e.id} className="bar" title={`${e.title}: ${formatDateRange(e.start, e.end)}`} style={{ left: `${a * 100}%`, width: `max(4px, ${(b - a) * 100}%)`, background: EVENT_COLORS[e.type], opacity: e.done ? 0.4 : 0.9 }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="row wrap tiny muted" style={{ marginTop: 8 }}>
        {(['sow-indoors', 'direct-sow', 'transplant', 'succession', 'harvest'] as const).map((t) => (
          <span key={t} className="row" style={{ gap: 4 }}>
            <span className="event-type" style={{ background: EVENT_COLORS[t], marginTop: 0 }} />
            {TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
