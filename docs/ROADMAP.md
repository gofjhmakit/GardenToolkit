# Status & roadmap

## Implemented

**Project & storage**
- Local-first storage in IndexedDB: projects, images as Blobs, version snapshots, "My plants", favourites/recent plants.
- Autosave on every change, never mid-gesture. It flushes when the tab is hidden or closed, and the status bar shows the save state (including failures).
- Automatic snapshots (on open, every 15 minutes while editing, latest 20 kept) and manual versions (Ctrl/⌘+S), with restore.
- If a stored project can't be read, it can be recovered from a snapshot.
- Warning when the same project is open in another tab, and a reload prompt when the other tab saves.
- Project management: create (with a climate preset), rename, duplicate, Save as, delete.
- Import and export: `.gtkproject` package and single JSON file, with a versioned public format, migrations and hardened import validation.

**Offline**
- Installable PWA. The app shell and plant data are precached, so the app works offline, and updates are offered with a reload prompt.

**Design canvas**
- Blueprint import (PNG/JPEG/WebP/PDF) with move, rotate, resize, crop, opacity, lock, hide, remove, and two-point scale calibration that can optionally rescale existing objects.
- Drawing tools: rectangle, ellipse/circle, polygon, freehand, line/path with width, tree, shrub, text, dimension, measure and calibrate.
- 23 garden object kinds with sensible defaults, patterns and properties.
- Editing: click/Shift/Ctrl selection, marquee, move, resize (Shift keeps aspect, Alt resizes from the centre), rotate (Shift snaps to 15°), Alt-drag duplicate, arrow-key nudge, group/ungroup, lock, hide, z-order, align/distribute, point editing (add, move, Alt-click to delete), copy/cut/paste (including across projects via the system clipboard; pasting an image imports a blueprint), duplicate and delete.
- Undo/redo with labelled history, grid/object/guide snapping with a toggle and Ctrl/⌘ bypass, platform-aware shortcuts and a context menu.
- Layers panel with visibility, locking, reordering, renaming, a filter, and add/delete layer.
- View: pan, zoom (wheel, pinch, buttons, 100 %), fit to screen, zoom to selection, rulers, grid, scale bar, and cursor coordinates in real units.

**Planting**
- Inspector for every object kind, with growing conditions, a materials estimate for raised beds, and tree details.
- Plant database of 498 curated records, focused on what grows outdoors in Finland, with Finnish names and winter-hardiness zones, pest, disease and watering notes for every plant, and usage notes (food, traditional use, cautions) for 129 herbs: search (fuzzy, accent-insensitive, Finnish names), filters (category, light, water, lifecycle, edibility, sowing/harvest month, spacing data), favourites, recent plants, a virtualised list, full details with provenance, and custom plants.
- Assign a plant to many areas at once, with a quantity preview per area.
- Calculator: shape-aware capacity for rows, spaced plants, square/triangular grids, broadcast sowing and single plants. Handles shared beds, explicit shares, spacing/margin/pattern overrides and quantity overrides, gives seed estimates, and explains every result.
- Harvest ranges with basis, confidence and assumptions, plus your own yield overrides. "Unavailable" is shown when there's no data.
- Calendar: generated from your frost dates, with editable dates, done/hidden states, custom tasks and a timeline, exportable as iCal/CSV.
- Crop rotation analysis with suggestions and recorded history. Companion notes labelled by evidence level. Warnings for sun, Finnish/USDA hardiness and container suitability.

**Documents**
- PDFs: planting plan, garden design, care guide, calendar, harvest plan and a complete report, with the scaled plan embedded as vectors.
- Plan as SVG/PNG, data as CSV, and HTML previews of every document.

**Platform**
- Light and dark themes; accessibility (semantic controls, focus rings, keyboard access, axe checks in CI).
- Full Finnish translation (UI, reports, number and date formats, plant names and plant texts) with a language switch in Settings.

## Known limitations / next steps

1. **Plant data depth.** The bundled data is 498 curated records compiled from general guidance, not cited per field (see PLANT_DATA.md). Next: run `npm run data:wikidata` where Wikidata is reachable (it adds thousands of names-only species), then add cited, per-field sources and region-specific (Finnish) timing data.
2. **Canvas:**
   - no snapping to the blueprint image contents;
   - multi-selection resize with arbitrarily rotated objects keeps the aspect ratio;
   - no rotation handle for the blueprint (use the inspector);
   - no touch-optimised gestures beyond pinch and pan.
3. **Harvest logging** (actual vs. estimated), recurring care tasks, a watering/fertiliser schedule, irrigation planning, seed inventory and a shopping list. The data model already separates estimates from overrides and supports seasons, tasks and notes, so these can be added on top.
4. **Material calculator.** The raised-bed soil volume and edging estimate is in place. Lumber, irrigation and mulch are not implemented yet.
5. **Optional sync or sharing.** Not planned by default. If added, reference data and personal data must stay clearly separated (datasets already carry origin metadata).
