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
- **Works on phones and tablets.** On screens up to 900 px wide (and phones held sideways) the
  canvas takes the full width, tools sit in a strip at the bottom, and Layers and Details open
  as sheets. Pinch to zoom, drag empty space to pan, long-press for the object menu.
- **Private and offline.** No account, no server and no tracking. Data lives in IndexedDB in
  your browser, and the app works offline once installed/loaded.
- **Portable.** Export a project (`.gtkproject` or JSON) from the editor's Export button or its
  card on the home screen, or "Export all" into one `.gtkbackup`. Import on any browser or
  device, several files at once or by drag and drop.

## Your data: where it lives and how to keep it safe

Projects are stored **only in the browser you created them in** (IndexedDB), per site address.
They are not synced anywhere. That means:

- Clearing the browser's site data, using a private/incognito window, or uninstalling the
  browser removes your projects. A different browser, device or URL (e.g. `localhost` vs. your
  deployed site) has its own separate set of projects.
- The app asks the browser for persistent storage so it is less likely to be evicted under
  disk pressure, but browsers may refuse.
- **Back up with "Export all"** on the home screen (one `.gtkbackup` file with every project and
  its images) and keep the file somewhere safe. Import it again to restore or move to another
  device.
- Every project also keeps version snapshots (on open, every 15 minutes of editing, and
  manually with Ctrl/⌘+S). If a project cannot be opened, the error page offers to restore one.

## Using the app

- Start from the project list: **New project**, pick a climate preset (or enter your own frost
  dates in Settings), then draw beds with the toolbar tools.
- Select a bed and use **Add plants**; the inspector shows the calculated quantity and explains
  how it was worked out. Field-sized areas (for closely spaced crops such as carrots, from
  roughly 40 m × 40 m) are estimated as area ÷ spacing, and plant markers are not drawn.
- Length fields accept units: `1.2` (field unit), `120 cm`, `2,5 m`, `10'`, `5' 6"`, `6 ft 6 in`.
- Press **?** in the editor for all keyboard shortcuts.

Supported browsers: current Chrome, Edge, Firefox and Safari (desktop). IndexedDB is required;
offline use requires HTTPS (or `localhost`) so the service worker can register.

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

Before the first E2E run, install Playwright's browser with `npx playwright install chromium`.
The browser build must match the installed `@playwright/test` version (re-run the install after
upgrading). In environments where Playwright's own browsers can't be downloaded, set
`CHROMIUM_PATH=/path/to/chrome` for the E2E tests.

### Project layout

| Path | Contents |
| --- | --- |
| `src/domain` | Data model (zod schemas), geometry, units |
| `src/engine` | Pure calculations: capacity, harvest, calendar, rotation, companions, climate |
| `src/editor` | Editor store, commands, undo/redo, snapping |
| `src/persistence` | IndexedDB storage, migrations, project file import/export |
| `src/reports` | Report builders, PDF/SVG/PNG/CSV/iCal output |
| `src/plants` | Plant catalogue, search and filters |
| `src/ui` | React components |
| `data/plants/seed` | Source of the bundled plant dataset |
| `tests/e2e` | Playwright end-to-end tests |

## Deploying

`npm run build` produces a fully static site in `dist/`, built with a relative base path. It
can be served from any static host (GitHub Pages, Netlify, S3, nginx) at any sub-path. No
server-side code or API is involved. Serve over HTTPS so the service worker can register and
the app works offline. When a new version is deployed, the app offers a reload; it never
updates in the middle of an edit.

## Security

The app has no server, account or network API. Imported files are treated as untrusted: they
are size-limited before decompression, only expected ZIP entries are read, images must be real
PNG/JPEG/WebP files (SVG is rejected), and all data is schema-validated and repaired before use.
A Content-Security-Policy restricts scripts and network access to the app's own origin. See the
Security section of [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details. Please report
security issues privately to the maintainer rather than in a public issue.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture, technology choices, data model, storage, calculation and export strategy
- [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md): the versioned project file format
- [docs/PLANT_DATA.md](docs/PLANT_DATA.md): plant database strategy, schema, sources and licensing
- [docs/TESTING.md](docs/TESTING.md): test strategy and how to run the tests
- [docs/ROADMAP.md](docs/ROADMAP.md): what is implemented and what remains

## Licence

Code: MIT (see [LICENSE](LICENSE)). Bundled plant seed data: CC0-1.0 (see `docs/PLANT_DATA.md` for how it was compiled
and its limits).
