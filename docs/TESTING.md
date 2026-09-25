# Testing

```bash
npm test            # all unit/component/persistence tests (Vitest, jsdom + fake-indexeddb)
npm run test:e2e    # end-to-end tests in Chromium (Playwright) against the production build
```

## Layers of tests

| Layer | Where | What |
| --- | --- | --- |
| Pure domain & engine | `src/domain/*.test.ts`, `src/engine/*.test.ts` | Units parsing/formatting, geometry (areas, hit tests, clipping, splitting), capacity for rows/grids/triangular/circles/concave shapes/broadcast/single plants, harvest ranges & overrides, calendar (frost-relative, fixed, southern hemisphere, successions, cross-year crops, overrides), rotation, companions, suitability, climate |
| Plant data | `src/plants/*.test.ts` | Every bundled record validates; sources exist; yields have confidence; search (common/scientific/Finnish/fuzzy/accent-insensitive), filters, 10 000-record performance; Wikidata pipeline transform |
| Editor | `src/editor/*.test.ts` | All commands (create, delete, duplicate, copy/paste, group, z-order, align, layers, calibration, planting assignment), store undo/redo, coalescing, gestures, selection modes, zoom independence, snapping |
| Persistence | `src/persistence/*.test.ts` | Create/list/load/save/duplicate/delete, snapshots, reload, migrations, reference repair, package/JSON round trips, corrupted & hostile imports |
| Reports | `src/reports/*.test.ts` | Report builders for every document type, CSV escaping/injection, PDF text sanitising |
| Components | `src/ui/**/*.test.tsx` | Inputs (units, validation), dialogs, inspector editing, plant browser keyboard navigation |
| End-to-end | `tests/e2e/*.spec.ts` | Full workflows in a real browser: create → draw → select → plant → undo/redo → copy/paste → reload; blueprint import & calibration; export/import round trip; corrupted import; PDFs; drawing tools; layers; keyboard shortcuts; views; offline; accessibility checks |

Calculation logic is tested without the UI, and UI behaviour is tested against the real
engine. Nothing is mocked except the browser storage backend (fake-indexeddb) in unit tests.
