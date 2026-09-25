import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Star } from 'lucide-react';
import { usePlants } from '../../app/plantStore';
import { useEditor } from '../../editor/store';
import { EMPTY_FILTER, filterPlants, isFilterActive, type PlantFilter } from '../../plants/filter';
import { anchorsFor, formatMonthSpan, plantSeasons } from '../../engine/plantSeasons';
import { PLANT_CATEGORIES, SUN_LEVELS, type Plant } from '../../plants/schema';
import { plantDisplayName } from '../../plants/names';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../plantColors';
import { SUN_LABEL } from '../../engine/suitability';
import { formatRange } from '../../domain/range';
import { MONTH_NAMES } from '../../lib/dates';
import { PlantDetail } from './PlantDetail';
import { Select, Checkbox } from '../components/Fields';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onActivate?: (id: string) => void;
  /** Replaces the detail pane (e.g. with an assignment preview). */
  renderSide?: (plant: Plant | undefined) => React.ReactNode;
  autoFocus?: boolean;
}

export function PlantBrowser({ selectedId, onSelect, onActivate, renderSide, autoFocus }: Props) {
  const { catalog, version, favourites, recents, status, toggleFavourite } = usePlants();
  const location = useEditor((s) => s.doc?.location);
  const season = useEditor((s) => s.doc?.settings.activeSeason ?? new Date().getFullYear());
  const [filter, setFilter] = useState<PlantFilter>(EMPTY_FILTER);
  const deferred = useDeferredValue(filter);
  const anchors = useMemo(
    () =>
      anchorsFor(
        location ?? { country: null, region: null, climateSystem: null, climateZone: null, lastFrost: null, firstFrost: null, latitude: null, longitude: null, growingSeasonDays: null, frostDateSource: null },
        season,
      ),
    [location, season],
  );
  const results = useMemo(
    () => filterPlants(catalog, deferred, favourites, anchors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, version, deferred, favourites, anchors],
  );
  const showRecents = !filter.query && !isFilterActive(filter) && recents.length > 0;
  const recentPlants = showRecents ? recents.map((id) => catalog.get(id)).filter((p): p is Plant => !!p).slice(0, 8) : [];
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: results.length, getScrollElement: () => listRef.current, estimateSize: () => 64, overscan: 8, initialRect: { width: 400, height: 800 } });
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) searchRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    // Keep the selection inside the current result list so the side panel matches what the user searched for.
    if (results[0] && (!selectedId || !results.some((p) => p.id === selectedId))) onSelect(results[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  const selected = selectedId ? catalog.get(selectedId) : undefined;
  const set = (patch: Partial<PlantFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const idx = results.findIndex((p) => p.id === selectedId);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, Math.min(results.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)));
      if (results[next]) {
        onSelect(results[next].id);
        virtualizer.scrollToIndex(next);
      }
    } else if (e.key === 'Enter' && selectedId && onActivate) {
      e.preventDefault();
      onActivate(selectedId);
    }
  };

  return (
    <div className="plant-browser">
      <div className="pb-filters" aria-label="Plant filters">
        <div className="col" style={{ gap: 4 }}>
          <span className="field-label">Category</span>
          <div className="row wrap" style={{ gap: 4 }}>
            {PLANT_CATEGORIES.filter((c) => catalog.all().some((p) => p.category === c)).map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={filter.categories.includes(c)}
                onClick={() => set({ categories: filter.categories.includes(c) ? filter.categories.filter((x) => x !== c) : [...filter.categories, c] })}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <Checkbox checked={filter.favouritesOnly} onChange={(v) => set({ favouritesOnly: v })} label={`Favourites only (${favourites.size})`} />
        <div className="field">
          <label htmlFor="f-sun">Tolerates</label>
          <Select id="f-sun" value={filter.sun ?? ''} emptyLabel="Any light" options={SUN_LEVELS.map((s) => ({ value: s, label: SUN_LABEL[s] }))} onChange={(v) => set({ sun: v })} />
        </div>
        <div className="field">
          <label htmlFor="f-water">Water need</label>
          <Select id="f-water" value={filter.water ?? ''} emptyLabel="Any" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} onChange={(v) => set({ water: v })} />
        </div>
        <div className="field">
          <label htmlFor="f-life">Lifecycle</label>
          <Select id="f-life" value={filter.lifecycle ?? ''} emptyLabel="Any" options={[{ value: 'annual', label: 'Annual' }, { value: 'biennial', label: 'Biennial' }, { value: 'perennial', label: 'Perennial' }]} onChange={(v) => set({ lifecycle: v })} />
        </div>
        <div className="field">
          <label htmlFor="f-edible">Edible</label>
          <Select id="f-edible" value={filter.edible == null ? '' : filter.edible ? 'yes' : 'no'} emptyLabel="Any" options={[{ value: 'yes', label: 'Edible' }, { value: 'no', label: 'Non-edible / ornamental' }]} onChange={(v) => set({ edible: v == null ? null : v === 'yes' })} />
        </div>
        <div className="field">
          <label htmlFor="f-sow">Sow / plant in</label>
          <Select id="f-sow" value={filter.sowMonth ? String(filter.sowMonth) : ''} emptyLabel="Any month" options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={(v) => set({ sowMonth: v ? Number(v) : null })} />
        </div>
        <div className="field">
          <label htmlFor="f-harvest">Harvest in</label>
          <Select id="f-harvest" value={filter.harvestMonth ? String(filter.harvestMonth) : ''} emptyLabel="Any month" options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={(v) => set({ harvestMonth: v ? Number(v) : null })} />
        </div>
        <Checkbox checked={filter.withSpacing} onChange={(v) => set({ withSpacing: v })} label="Only plants with spacing data" />
        {isFilterActive(filter) && (
          <button className="btn sm" onClick={() => setFilter({ ...EMPTY_FILTER, query: filter.query })}>
            Clear filters
          </button>
        )}
        <p className="tiny muted">Months are based on this garden’s frost dates.</p>
      </div>

      <div className="pb-list">
        <div className="pb-search">
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 8, color: 'var(--muted)' }} aria-hidden="true" />
            <input
              ref={searchRef}
              className="input"
              style={{ paddingLeft: 28 }}
              type="search"
              placeholder="Search name, scientific name, family, tag…"
              aria-label="Search plants"
              aria-controls="plant-results"
              value={filter.query}
              onChange={(e) => set({ query: e.target.value })}
              onKeyDown={onListKey}
            />
          </div>
          <div className="tiny muted" aria-live="polite">
            {status === 'loading' ? 'Loading plant database…' : `${results.length.toLocaleString()} of ${catalog.plants.size.toLocaleString()} plants`}
          </div>
          {recentPlants.length > 0 && (
            <div className="row wrap" style={{ gap: 4 }}>
              <span className="tiny muted">Recent:</span>
              {recentPlants.map((p) => (
                <button key={p.id} className="chip" style={{ height: 20, fontSize: 11 }} onClick={() => onSelect(p.id)}>
                  {plantDisplayName(p)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pb-results" ref={listRef} id="plant-results" role="listbox" aria-label="Plants" tabIndex={0} onKeyDown={onListKey} aria-activedescendant={selectedId ? `plant-${selectedId}` : undefined}>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const p = results[vi.index];
              return (
                <div key={p.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }} data-index={vi.index} ref={virtualizer.measureElement}>
                  <PlantListItem
                    plant={p}
                    selected={p.id === selectedId}
                    favourite={favourites.has(p.id)}
                    onSelect={() => onSelect(p.id)}
                    onActivate={onActivate ? () => onActivate(p.id) : undefined}
                    onFavourite={() => toggleFavourite(p.id)}
                    harvest={formatMonthSpan(plantSeasons(p, anchors).harvest)}
                  />
                </div>
              );
            })}
          </div>
          {results.length === 0 && status !== 'loading' && <p className="muted" style={{ padding: 16 }}>No plants match. Try fewer filters or a different spelling.</p>}
        </div>
      </div>

      <div className="pb-detail" aria-label="Plant details">
        {renderSide ? renderSide(selected) : selected ? <PlantDetail plant={selected} /> : <p className="muted">Select a plant to see its details.</p>}
      </div>
    </div>
  );
}

function PlantListItem({ plant, selected, favourite, onSelect, onActivate, onFavourite, harvest }: { plant: Plant; selected: boolean; favourite: boolean; onSelect: () => void; onActivate?: () => void; onFavourite: () => void; harvest: string | null }) {
  const spacing = plant.planting.inRowSpacingCm ?? plant.planting.gridSpacingCm;
  const sun = plant.growing.sun?.map((s) => SUN_LABEL[s]).join('/');
  return (
    <div className="plant-item" id={`plant-${plant.id}`} role="option" aria-selected={selected} onClick={onSelect} onDoubleClick={onActivate}>
      <span className="cat-dot" style={{ background: CATEGORY_COLORS[plant.category] }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pname">{plantDisplayName(plant)}</div>
        <div className="sci">{plant.names.scientific}</div>
        <div className="meta">
          {[CATEGORY_LABELS[plant.category], sun, plant.lifecycle ? plant.lifecycle[0].toUpperCase() + plant.lifecycle.slice(1) : null].filter(Boolean).join(' · ')}
        </div>
        <div className="meta">
          {spacing ? `Spacing: ${formatRange(spacing)} cm` : 'Spacing: unknown'}
          {harvest ? ` · Harvest: ${harvest}` : ''}
          {plant.dataset === 'user' ? ' · My plant' : ''}
        </div>
      </div>
      <button
        type="button"
        className="icon-btn sm"
        aria-label={favourite ? `Remove ${plantDisplayName(plant)} from favourites` : `Add ${plantDisplayName(plant)} to favourites`}
        aria-pressed={favourite}
        onClick={(e) => {
          e.stopPropagation();
          onFavourite();
        }}
      >
        <Star size={14} fill={favourite ? 'var(--warn)' : 'none'} color={favourite ? 'var(--warn)' : 'currentColor'} />
      </button>
    </div>
  );
}
