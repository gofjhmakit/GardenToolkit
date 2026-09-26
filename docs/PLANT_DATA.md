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
| `core.json` (`gtk-core`) | 395 curated temperate garden plants (88 vegetables, 88 herbs, 50 annual/biennial flowers, 55 perennials, 14 bulbs, 24 berries, fruit trees, vines, shrubs, trees, grasses, groundcovers and 11 green manures), Finnish names for almost all of them with planting, timing, care (including pests, diseases and watering for every plant), yield and rotation data; usage notes (food, traditional medicinal use, other uses, preserving, cautions) for 129 herbs; 13 companion relations; rotation rules | CC0-1.0 (our own texts; see Yrttitarha below) | Bundled |
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
Finnish Meteorological Institute).

**Herb uses and Finnish herbs (September 2026).** Every herb in the Yrttitarha herb database
(yrttitarha.fi, 129 herbs) is in the dataset: 62 matched existing records and 67 were added in
`data/plants/seed/herbs3.mjs`, including wild herbs, berries and trees gathered for food and
remedies (nettle, fireweed, meadowsweet, cloudberry, birch, Iceland moss…). Their usage notes are in
`data/plants/seed/uses.mjs` (the `uses` field: parts used, food and drink, traditional medicinal
use, other uses, preserving and cautions). Yrttitarha's texts are copyrighted, so they were used as
a **reference only**: the notes are our own short summaries in English and Finnish, no text is
reproduced, and each record credits the source (`yrttitarha` in `provenance.sources` and
`provenance.fields.uses`). Cultivation figures for the new herbs were cross-checked with the Finnish
cultivation guides the database cites (Mikkeli trials). Medicinal notes describe traditional use
only — no doses, no claims of cure — and every plant with known risks (toxic plants, drug
interactions, pregnancy) carries a `safety` note that the app shows first; the app also says the
information is not medical advice.

**Gap filling (`data/plants/seed/enrich.mjs`).** Soil pH and type, mature width and height, root and
sowing depth, feeding, harvesting notes and low-confidence yield ranges were added where records had
none, plus pest and disease notes for every plant. Pest and disease texts are shared per crop group
(brassicas, alliums, carrot family, legumes, cucurbits, fruit trees, berries…) and name the problems
common in Finnish gardens. Watering advice is derived from each record's water need. Enrichment only
fills empty fields — hand-written values always win — and a test fails if a plant appears twice in
the table.

Winter hardiness (`data/plants/seed/hardiness.mjs`) gives each hardy perennial the coldest Finnish
growing zone (I–VIII) where it usually survives, plus a USDA zone range. These are rounded
editorial approximations of commonly published nursery ratings; cultivars often differ by a zone
or two. Tender perennials that are overwintered indoors have no zone rating on purpose. Finnish
common names were included only where the maintainers were confident of them; a plant without a
Finnish name shows its English name. Care notes, pests, yield assumptions, companion mechanisms
and rotation texts are written in English in the seed files and translated in
`data/plants/seed/fi-texts.mjs` (keyed by the English text); the build fills in `fi` from there
and the dataset test fails if any localised text has no Finnish version. Improving this data with properly cited sources is the most
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
| **Yrttitarha** (yrttitarha.fi herb database) | Copyrighted text | ✅ Used as a reference for herb uses, cautions and Finnish cultivation figures; own summaries only, credited per record |

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
