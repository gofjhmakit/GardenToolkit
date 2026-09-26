# Testing

```bash
npm test            # all unit/component/persistence tests (Vitest, jsdom + fake-indexeddb)
npm run test:e2e    # end-to-end tests in Chromium (Playwright) against the production build
npx playwright test --project=phone   # only the phone/touch tests
```

## Layers of tests

| Layer | Where | What |
| --- | --- | --- |
| Pure domain & engine | `src/domain/*.test.ts`, `src/engine/*.test.ts` | Units parsing/formatting, geometry (areas, hit tests, clipping, splitting), capacity for rows/grids/triangular/circles/concave shapes/broadcast/single plants, harvest ranges & overrides, calendar (frost-relative, fixed, southern hemisphere, successions, cross-year crops, overrides), rotation, companions, suitability, climate |
| Plant data | `src/plants/*.test.ts` | Every bundled record validates; sources exist; yields have confidence; search (common/scientific/Finnish/fuzzy/accent-insensitive), filters, 10 000-record performance; Wikidata pipeline transform; every localised plant text has a Finnish version |
| Editor | `src/editor/*.test.ts` | All commands (create, delete, duplicate, copy/paste, group, z-order, align, layers, calibration, planting assignment), store undo/redo, coalescing, gestures, selection modes, zoom independence, snapping |
| Persistence | `src/persistence/*.test.ts` | Create/list/load/save/duplicate/delete, snapshots, reload, migrations, reference repair, package/JSON round trips, corrupted & hostile imports (prototype-named ids, impossible dates, absurd geometry, lying ZIP headers), save → reopen contract at every UI text limit |
| Reports | `src/reports/*.test.ts` | Report builders for every document type, CSV escaping/injection, PDF text sanitising, iCal escaping, line folding and all-day end dates |
| Components | `src/ui/**/*.test.tsx` | Inputs (units, validation), dialogs (including prompt length limits), error boundary, inspector editing, plant browser keyboard navigation |
| Phone & touch | `tests/e2e/mobile.spec.ts` (Playwright project `phone`) | iPhone 17 Pro viewport (402 × 874) with real multi-touch through the DevTools protocol: no horizontal overflow on any screen, draw/select/move with a finger, pinch-zoom and pan never edit the plan, long-press menu, polygon Finish button, bottom sheets, add-plants flow, plant database panes, landscape, Pro Max and portrait iPads |
| End-to-end | `tests/e2e/*.spec.ts` | Full workflows in a real browser: create → draw → select → plant → undo/redo → copy/paste → reload; blueprint import & calibration; export/import round trip; corrupted import; PDFs; drawing tools; layers; keyboard shortcuts; views; offline; accessibility checks |

Calculation logic is tested without the UI, and UI behaviour is tested against the real
engine. Nothing is mocked except the browser storage backend (fake-indexeddb) in unit tests.
