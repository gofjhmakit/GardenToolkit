# Architecture

## Layers

```
UI (React components)                     src/ui/**
  │   reads state, dispatches named commands
Editor state & commands                   src/editor/** (zustand store, undo/redo, commands, snapping)
  │
Domain model                              src/domain/** (zod schemas, geometry, units, object kinds)
  │
Calculation engine (pure, deterministic)  src/engine/** (capacity, harvest, calendar, rotation,
  │                                                      companions, suitability, climate)
Reports (pure builders → renderers)       src/reports/** (document model, PDF, SVG/PNG, CSV/iCal)
  │
Persistence                               src/persistence/** (IndexedDB via Dexie, migrations,
                                                              public file format, import/export)
Global plant database (read-only)         src/plants/** + public/data/plants/*.json
```

Rules:

- Horticultural calculations never live in components. The engine functions (`calculatePlantCapacity`,
  `calculateExpectedHarvest`, `generatePlantingCalendar`, `analyzeRotation`,
  `buildCareGuide`/`generateCareGuide`, …) are pure and unit-tested.
- The **global plant database is separate from project data.** Projects only reference plant ids.
  Assigning or editing a planting creates or changes a project `Planting` record and never
  touches the plant record. Projects embed snapshots of referenced plants only in exported files,
  and in `embeddedPlants` when an import brings plants the local database lacks.
- Internal document ≠ public file format. `persistence/projectFile.ts` maps between them explicitly.

## Technology choices

All versions below were checked against the npm registry when the project was set up
(September 2026), including licences.

| Concern | Choice | Why |
| --- | --- | --- |
| Language/build | TypeScript 7, Vite 8, React 19 | Mature, fast, strictly typed; static output, no server |
| Canvas | **Own SVG renderer + own interaction layer** | See comparison below |
| State | zustand 5 + immer 11 | Small, selector-based subscriptions (fewer re-renders); immer gives immutable docs with structural sharing, so undo is cheap |
| Validation | zod 4 | One schema per boundary (stored docs, imports, plant datasets, clipboard) |
| Storage | Dexie 4 (IndexedDB) | Versioned schema, transactions, native Blob storage |
| Search | MiniSearch 7 | In-memory full-text index with prefix + fuzzy search, accent folding; fast for 10k+ records |
| Lists | @tanstack/react-virtual | Plant list is virtualised; the DOM never holds the whole database |
| PDF | jsPDF 4 + jspdf-autotable 5 + svg2pdf.js 2 | Client-side PDFs with real tables; the plan is embedded as **vectors**. Lazy-loaded |
| PDF import | pdfjs-dist 6 | First page rendered to an image for blueprint import. Lazy-loaded |
| Packages | fflate | ZIP read/write for `.gtkproject` packages, with size-checked extraction |
| Offline | vite-plugin-pwa (Workbox) | Precaches app shell + bundled plant data; prompt-to-update |
| i18n | i18next + react-i18next | English source strings as keys; Finnish catalogue started |
| Icons | lucide-react | Consistent, tree-shakable, ISC licence |
| Tests | Vitest 5, Testing Library, fake-indexeddb, Playwright | Unit/component/persistence tests + real-browser E2E |

### Why not a canvas library?

Options considered: **Konva/react-konva**, **Fabric.js**, **tldraw**, **Excalidraw**, and plain **SVG**.

- tldraw's SDK licence needs a licence key / watermark for production use, which rules it out
  for an open, offline, account-free tool. Excalidraw is a whiteboard with its own document model;
  bending it into a garden domain model (real units, plantings, layers-as-data) would be a fight.
- Fabric and Konva both give you selection handles and transforms. But undo/redo, grouping
  semantics, copy/paste with plantings, snapping to real-world increments, and serialisation have
  to be built on top anyway. Both also keep their own object model, which then has to be synced
  with ours: two sources of truth.
- SVG + our own interaction layer keeps **one document model** (plain data in mm). It renders
  crisp at any zoom, exports to SVG/PDF directly (the PDF plan is the same renderer), hit-tests in
  real units, and makes screen-reader-accessible chrome easier. Hundreds of objects are
  comfortably fast. Plant markers are batched into one `<path>` per planting, and objects are
  memoised by immutable reference, so editing one bed re-renders only that bed.

## Coordinate system and units

- World units are **millimetres**, +x east/right, +y south/down, rotation clockwise in degrees.
- The view transform is `screen = world × scale + offset`. Zoom only changes the view. It never
  touches stored geometry, and a test asserts this.
- Formatting to m/cm/m² (or ft/in) happens only at the edges (`domain/units.ts`). Inputs accept
  typed units (`120 cm`, `2,5 m`, `10'`).
- Each object has `transform {x, y, rotation}` and local geometry (`rect`, `ellipse`, `polygon`,
  `polyline` + width, `text`, `dimension`). Point shapes are re-centred after edits so rotation
  handles stay centred.

## Blueprint calibration

A background image stores its world centre, rotation, `mmPerPx`, crop (in image pixels) and
calibration record. Calibrating means clicking two points and entering their real distance. The
image is then scaled about the first point, which stays fixed. Existing objects can optionally be
rescaled by the same factor. Until calibrated, the image is assumed to span 20 m and the UI says
"uncalibrated" in the layers panel, the status bar and the inspector.

## Editor: undo/redo, gestures, clipboard

- The document is immutable. `commit(label, recipe)` produces the next document with immer and
  pushes the previous one onto the undo stack. Structural sharing keeps this cheap. Rapid edits
  with the same `coalesceKey` (typing in a field, nudging) merge into one undo step.
- Drags are gestures: `beginGesture` → `updateGesture(absolute recipe)` (applied to the base doc,
  so accumulated floating-point error can't creep in) → `endGesture(label)` = one undo step.
- Clipboard: selections are serialised (objects + their plantings + groups) into the internal
  clipboard and, via the DOM `copy` event, into the system clipboard as JSON. Paste validates the
  payload with zod, assigns fresh ids and plan codes, and offsets repeated pastes. Pasting an
  image from the clipboard imports it as a blueprint.
- Snapping: grid, object edges/centres/vertices and alignment guides, with tolerance in screen
  pixels converted to mm. It can be toggled in the status bar and bypassed by holding Ctrl/⌘.

## Storage strategy

IndexedDB database `garden-toolkit` (Dexie), schema version 1:

| Table | Content |
| --- | --- |
| `projects` | Lightweight metadata for the project list |
| `docs` | One full `ProjectDoc` per project (structured clone, no JSON stringify) |
| `assets` | Blueprint images as **Blobs**, shown via object URLs (never base64 in normal use). Images no saved document or snapshot references are deleted when the project is closed (not while it is open in another tab, and never within 10 minutes of being added) |
| `snapshots` | Version snapshots: automatic (on open, every 15 min of editing; latest 20 kept) and manual (Ctrl/⌘+S) |
| `userPlants` | "My plants" |
| `kv` | Favourites, recently used plants |

localStorage holds only UI preferences (theme, panel visibility, wheel behaviour, language).

Autosave writes the document ~0.7 s after the last change, never mid-gesture. It also flushes
when the tab is hidden or closed, and the status bar shows "Saved locally / Saving… / Unsaved
changes / Save failed". The app requests persistent storage so the browser is less likely to
evict data. Loading validates the stored document (zod), runs migrations, and repairs broken
references (dangling ids, objects missing from layers) instead of refusing to open.

## Calculation strategy

- **Capacity** (`engine/capacity.ts`): rows or grid lines are placed across the real region
  polygon with an edge margin (default: half the spacing). Each row is intersected with the
  polygon, stations are counted along the resulting segments, and stations too close to slanted
  or curved edges are rejected. The best estimate uses mid-range spacing, and a range is given for
  the full spacing range. Square vs. triangular grids, row sowing (with seed spacing → seed count
  and grams), broadcast sowing (seed g/m²) and single-plant symbols (trees/shrubs) each have their
  own logic. The results come with a step-by-step explanation and the positions used to draw
  markers. Missing data gives `null` and a warning, never a guess.
  Above `MAX_LAYOUT_STATIONS` candidate stations (field-sized areas) the per-plant layout is
  skipped in favour of an area ÷ spacing estimate with a warning, so a typo or a crafted file
  cannot freeze the main thread.
- **Sharing a bed:** several plantings split the bed into bands along the row direction, with
  area found by bisection, so it works for concave shapes too. Shares can be set explicitly.
- **Harvest** (`engine/harvest.ts`): user override → per-plant range × quantity → per-m² range ×
  area → "unavailable". Estimates carry their basis, confidence and assumptions, and totals report
  how many plantings were excluded.
- **Calendar** (`engine/calendar.ts`): timing windows are relative to last/first frost, or fixed
  (shifted for the southern hemisphere). Harvest comes from days-to-maturity or seasonal windows.
  Succession sowings, bed preparation, frost-risk warnings and cross-year crops (autumn garlic)
  are handled. User edits live in `calendarOverrides`, keyed by stable event ids, so regenerating
  the calendar never loses them. Missing frost dates fall back to explicit placeholders with a
  visible warning.
- **Rotation**: per-group minimum intervals are data (`RotationRule`), not code. The suggestion
  follows one conventional four-course scheme and says so.
- **Companions**: relations carry an evidence level (documented / common claim / traditional).
- **Suitability**: sun (categories or hours), Finnish/USDA zone hardiness and container
  suitability produce warnings, never blocks.

## Export strategy

Report builders (`reports/builders.ts`) turn project data into a small document model (headings,
paragraphs, tables, key-value lists, stats, plan). Renderers turn that model into a PDF (jsPDF +
autotable; the plan is embedded as vector SVG) or an HTML preview. Plans are also exported as
standalone scaled SVG (mm units) or PNG. Data exports are CSV (with CSV-injection neutralised)
and iCal. Project backups use the documented file format (see PROJECT_FORMAT.md).

## Security

- Content-Security-Policy in `index.html`: scripts only from self, and no network connections
  beyond the app's own origin.
- Imports are size-limited before decompression (ZIP-bomb safe), parsed defensively, migrated and
  validated. Only expected ZIP entries are read. Images are accepted only if their magic bytes are
  PNG/JPEG/WebP, so SVG and other active content is rejected. Nothing imported is executed or
  rendered as HTML. All user text is rendered by React as text.
- PDF import uses pdf.js (scripting off) and only rasterises the first page.
- The only network requests are for the app's own files. No analytics.

## Extensibility

The data model already has room for future features: seasons and plantings per year (harvest
logging, actual vs. estimated), `props.heightMm`/`material` and a materials estimate (soil
volume, edging) for a material calculator, custom tasks (recurring care), notes, multiple
datasets (regional data, synced reference data clearly labelled as such), and localised plant
text. New object kinds are a data entry in `domain/objectKinds.ts`.
