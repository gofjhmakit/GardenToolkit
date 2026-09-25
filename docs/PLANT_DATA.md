# Plant database

## Principles

1. **Never invent data to fill a field.** Every horticultural field is optional. Unknown means
   the UI says "unknown/unavailable" and calculations refuse to guess.
2. **Ranges over false precision.** Spacing, depths, days to maturity and yields are `{min, max}`.
3. **Provenance on every record** (`provenance.sources`, `confidence`, `updated`), with optional
   per-field provenance (`provenance.fields`).
4. **Global reference data is separate from projects.** Projects reference plant ids and never
   modify plant records.
5. **Localisable.** Common names are keyed by language (`common: { en: [...], fi: [...] }`). Care
   text is `{ en: "…", fi: "…" }`. Scientific names are language-independent.

The schema is `PlantSchema` in `src/plants/schema.ts`. Timing windows are relative to the
location's average **last spring frost** or **first autumn frost** (in weeks), or fixed month-day
windows that are shifted for the southern hemisphere. That makes one record usable in Helsinki,
Oulu and Lyon.

## Datasets

Datasets are JSON files (`format: "garden-toolkit-plants"`) in `public/data/plants/`. They are
precached by the service worker, so search and plant data work offline. Each record is validated
on load, so one bad record never breaks a dataset. The app shows datasets, licences and skipped
records under **Plant database → Data sources & licences**.

| Dataset | Content | Licence | Status |
| --- | --- | --- | --- |
| `core.json` (`gtk-core`) | 110 curated common temperate garden plants (vegetables, herbs, fruit, berries, fruit trees, ornamentals, bulbs, shrubs, trees, green manures) with planting, timing, care, yield, rotation data; 13 companion relations; rotation rules | CC0-1.0 | Bundled |
| `wikidata-names.json` (`gtk-wikidata-names`) | Names/taxonomy for thousands of garden-relevant species (en/fi/sv/de) — **names only** | CC0-1.0 | Pipeline ready (`npm run data:wikidata`); not generated in this repository yet because the build environment had no access to Wikidata |
| User plants ("My plants") | Created in the app, stored in IndexedDB | User's own | Built in |

### How the core dataset was compiled — honest statement

The core seed data (`data/plants/seed/*.mjs`, built into `public/data/plants/core.json` by
`npm run data:build`) was compiled by the project maintainers from widely published, general
horticultural guidance: seed-packet conventions and national gardening-organisation /
university-extension style planting charts. It was **not** verified field by field against a
single citable source, and the records say so (source `gtk-editorial`). Ranges are intentionally
broad. Record confidence is mostly `medium`, and all yield figures are marked `low` confidence
with their assumptions stated. The Finnish frost-date presets are rounded approximations with
low confidence, and the UI tells users to replace them with local observations (e.g. from the
Finnish Meteorological Institute). Improving this data with properly cited sources is the most
valuable next step for the database (see "Adding data").

### Candidate sources reviewed

| Source | Licence / terms (as checked Sep 2026) | Decision |
| --- | --- | --- |
| **Wikidata** | CC0 | ✅ Used for names/taxonomy via `scripts/import-wikidata.mjs` |
| **GBIF Backbone Taxonomy** | CC BY 4.0 | ✅ Suitable for taxonomy/synonyms with attribution (future importer) |
| **USDA PLANTS** | US public domain | ✅ Suitable for taxonomy and some traits; US-centric |
| **OpenFarm** | CC0; service shut down April 2025, repository archived; community-rescued copy of ~340 crops | ⚠️ Usable in principle; data quality varies, so each record needs review before import |
| **Growstuff** | CC BY-SA 3.0 (API data) | ⚠️ Share-alike would apply to the combined dataset; keep it as a separate, optional dataset if ever used |
| **Plants For A Future (PFAF)** | Website text under a Creative Commons licence, but the downloadable database is sold under restrictive home/commercial licences | ❌ Not bundled |
| **Practical Plants** | CC BY-NC-SA | ❌ Non-commercial restriction; not bundled |
| Seed-company catalogues, national extension services, Luke / Puutarhaliitto publications | Copyrighted text | ❌ Not copied. They may be used as references for values, with citation |

## Adding data

1. Add or modify records in `data/plants/seed/*.mjs` (helpers in `_helpers.mjs`). Add a source to
   `relations.mjs → sources` and reference it in `provenance.sources` or `provenance.fields`.
2. `npm run data:build`, then `npm test`. The dataset test validates every record, checks that
   sources exist and that yields have a confidence level, and sanity-checks ranges.
3. For large external datasets, write an importer like `scripts/import-wikidata.mjs`: a pure,
   unit-tested `transform()` plus a thin network `main()`. Output a separate dataset file and add
   it to `BUNDLED_DATASETS` in `src/plants/catalog.ts`.

Companion relations (`relations.mjs → companions`) must set `evidence` to `documented`,
`common-claim` or `traditional`, plus a `mechanism` text that states the limits of the claim.
