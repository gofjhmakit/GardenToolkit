# Garden Toolkit

A local-first, offline-capable garden planner for home gardeners: a lightweight mix of 2D CAD
editor, plant database, planting calculator, planting calendar and garden documentation tool.

- **Design** your garden on a scaled plan. Import a blueprint/aerial image or PDF, calibrate
  its scale, then draw beds, raised beds, paths, lawns, trees, greenhouses and more.
- **Edit like a desktop design app.** Multi-select, marquee, copy/paste, undo/redo, grouping,
  layers, z-order, alignment, snapping with guides, vertex editing and keyboard shortcuts.
- **Plant** from a searchable database, with quantities laid out on each bed's real shape.
  Every number comes with an explanation, and your overrides are kept.
- **Plan**: a calendar built from your frost dates, harvest ranges with their assumptions, a
  care guide, crop rotation and companion notes labelled by evidence level.
- **Export** a planting plan, garden design, care guide, calendar, harvest plan and a complete
  report as PDF, plus SVG/PNG plans, CSV, iCal and full project backups.
- **Private and offline.** No account, no server and no tracking. Data lives in IndexedDB in
  your browser, and the app works offline once installed/loaded.
- **Portable.** Export a project (`.gtkproject` or JSON) from the editor's Export button or its
  card on the home screen, or "Export all" into one `.gtkbackup`. Import on any browser or
  device, several files at once or by drag and drop.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Requirements: Node.js 20+ (developed with Node 22).

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Rebuilds the plant dataset, type-checks, builds to `dist/` (incl. service worker) |
| `npm run preview` | Serves the production build locally (needed to test offline/PWA) |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | Browser end-to-end tests (Playwright; builds and serves the app itself) |
| `npm run typecheck` | TypeScript project check |
| `npm run data:build` | Rebuilds `public/data/plants/core.json` from `data/plants/seed/*` |
| `npm run data:wikidata` | Optional: imports CC0 plant names from Wikidata (needs network) |

In environments where Playwright's own browsers aren't downloaded, set
`CHROMIUM_PATH=/path/to/chrome` for the E2E tests.

## Deploying

`npm run build` produces a fully static site in `dist/`, built with a relative base path. It
can be served from any static host (GitHub Pages, Netlify, S3, nginx) at any sub-path. No
server-side code or API is involved. Serve over HTTPS so the service worker can register and
the app works offline. When a new version is deployed, the app offers a reload; it never
updates in the middle of an edit.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture, technology choices, data model, storage, calculation and export strategy
- [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md): the versioned project file format
- [docs/PLANT_DATA.md](docs/PLANT_DATA.md): plant database strategy, schema, sources and licensing
- [docs/TESTING.md](docs/TESTING.md): test strategy and how to run the tests
- [docs/ROADMAP.md](docs/ROADMAP.md): what is implemented and what remains

## Licence

Code: MIT. Bundled plant seed data: CC0-1.0 (see `docs/PLANT_DATA.md` for how it was compiled
and its limits).
