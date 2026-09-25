#!/usr/bin/env node
/**
 * Wikidata → Garden Toolkit "names" dataset.
 *
 * Wikidata content is CC0 (public domain), so it may be bundled and
 * redistributed without restriction. It provides scientific names, taxonomy
 * and localised common names (incl. Finnish and Swedish) for thousands of
 * garden-relevant species. It does NOT provide reliable planting data, so
 * the generated records deliberately leave all horticultural fields empty
 * (unknown) and are tagged "names-only". The app then says "no spacing data"
 * instead of guessing.
 *
 * Usage (needs network access to query.wikidata.org):
 *   node scripts/import-wikidata.mjs [--min-sitelinks 3] [--out public/data/plants/wikidata-names.json]
 * Then add the output path to BUNDLED_DATASETS in src/plants/catalog.ts.
 *
 * The transformation is a pure function (`transform`) covered by unit tests.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const LANGS = ['en', 'fi', 'sv', 'de'];

export function slug(s) {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/** Builds the SPARQL query for species within the given genera. */
export function buildQuery(genera, minSitelinks = 3) {
  const values = genera.map((g) => `"${g.replace(/"/g, '')}"`).join(' ');
  return `SELECT ?item ?name ?genusName ?familyName ?sitelinks ?label ?labelLang WHERE {
  VALUES ?genusName { ${values} }
  ?genus wdt:P225 ?genusName; wdt:P105 wd:Q34740.
  ?item wdt:P171 ?genus; wdt:P105 wd:Q7432; wdt:P225 ?name; wikibase:sitelinks ?sitelinks.
  FILTER(?sitelinks >= ${Number(minSitelinks)})
  OPTIONAL { ?genus wdt:P171* ?fam. ?fam wdt:P105 wd:Q35409; wdt:P225 ?familyName. }
  OPTIONAL { ?item rdfs:label ?label. BIND(LANG(?label) AS ?labelLang) FILTER(?labelLang IN (${LANGS.map((l) => `"${l}"`).join(', ')})) }
}`;
}

/**
 * Pure transformation of SPARQL JSON bindings into a plant dataset.
 * @param {object} sparqlJson  result of the query above
 * @param {Record<string,string>} genusCategory  genus → category
 * @param {Set<string>} existingScientific  scientific names already in curated datasets (skipped)
 */
export function transform(sparqlJson, genusCategory, existingScientific = new Set(), today = new Date().toISOString().slice(0, 10)) {
  const byItem = new Map();
  for (const b of sparqlJson?.results?.bindings ?? []) {
    const qid = b.item?.value?.split('/').pop();
    const name = b.name?.value;
    const genus = b.genusName?.value;
    if (!qid || !name || !genus || !genusCategory[genus]) continue;
    if (!/^[A-Z][a-z-]+ [a-z×-]+/.test(name)) continue; // species binomials only
    const rec = byItem.get(qid) ?? { qid, name, genus, family: null, sitelinks: 0, labels: {} };
    if (b.familyName?.value && !rec.family) rec.family = b.familyName.value;
    rec.sitelinks = Math.max(rec.sitelinks, Number(b.sitelinks?.value ?? 0));
    const lang = b.labelLang?.value;
    const label = b.label?.value;
    // Wikidata often uses the scientific name as the English label; that is not a common name.
    if (lang && label && label !== name) {
      const list = (rec.labels[lang] ??= []);
      const nice = lang === 'en' ? label.charAt(0).toUpperCase() + label.slice(1) : label.charAt(0).toUpperCase() + label.slice(1);
      if (!list.includes(nice)) list.push(nice);
    }
    byItem.set(qid, rec);
  }
  const plants = [];
  const seen = new Set();
  for (const r of [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    if (existingScientific.has(r.name.toLowerCase())) continue;
    const id = `wd-${slug(r.name)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    plants.push({
      id,
      dataset: 'gtk-wikidata-names',
      names: { scientific: r.name, common: r.labels, synonyms: [] },
      taxonomy: { family: r.family, genus: r.genus, species: r.name.split(' ')[1] ?? null, infraspecific: null, cultivar: null },
      category: genusCategory[r.genus],
      tags: ['names-only'],
      lifecycle: null,
      edible: null,
      growing: {},
      planting: { methods: [] },
      timing: {},
      care: {},
      yield: null,
      rotation: null,
      provenance: {
        sources: [{ id: 'wikidata', note: `https://www.wikidata.org/wiki/${r.qid}` }],
        confidence: 'unknown',
        updated: today,
        note: 'Names and taxonomy only. No planting data — enter spacing manually or use a curated record.',
      },
    });
  }
  return {
    format: 'garden-toolkit-plants',
    schemaVersion: 1,
    dataset: {
      id: 'gtk-wikidata-names',
      title: 'Wikidata plant names',
      version: today,
      license: 'CC0-1.0',
      description: 'Scientific names, families and common names (en/fi/sv/de) for garden-relevant species from Wikidata. Names only — no horticultural data.',
      generated: today,
    },
    sources: [
      {
        id: 'wikidata',
        title: 'Wikidata',
        url: 'https://www.wikidata.org/',
        license: 'CC0-1.0',
        attribution: null,
        retrieved: today,
        notes: 'Structured data from Wikidata is available under CC0 (public domain dedication). Used for names and taxonomy only.',
      },
    ],
    plants,
    companions: [],
    rotation: [],
  };
}

export function genusCategoryMap(json) {
  const map = {};
  for (const [category, genera] of Object.entries(json)) {
    if (category.startsWith('_')) continue;
    for (const g of genera) map[g] ??= category; // first category listed wins
  }
  return map;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : def;
  };
  const out = resolve(ROOT, opt('--out', 'public/data/plants/wikidata-names.json'));
  const minSitelinks = Number(opt('--min-sitelinks', '3'));
  const genusCategory = genusCategoryMap(JSON.parse(readFileSync(resolve(ROOT, 'data/plants/garden-genera.json'), 'utf8')));
  const core = JSON.parse(readFileSync(resolve(ROOT, 'public/data/plants/core.json'), 'utf8'));
  const existing = new Set(core.plants.map((p) => p.names.scientific.toLowerCase()));
  const genera = Object.keys(genusCategory);
  const merged = { results: { bindings: [] } };
  // Query in batches to stay within Wikidata's query limits.
  for (let i = 0; i < genera.length; i += 25) {
    const batch = genera.slice(i, i + 25);
    const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(buildQuery(batch, minSitelinks))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'GardenToolkitDataPipeline/0.1 (https://github.com/gofjhmakit/GardenToolkit)', Accept: 'application/sparql-results+json' } });
    if (!res.ok) throw new Error(`Wikidata query failed: HTTP ${res.status}`);
    const json = await res.json();
    merged.results.bindings.push(...json.results.bindings);
    console.log(`Batch ${i / 25 + 1}: ${json.results.bindings.length} rows`);
    await new Promise((r) => setTimeout(r, 1500)); // be polite to the public endpoint
  }
  const dataset = transform(merged, genusCategory, existing);
  writeFileSync(out, JSON.stringify(dataset));
  console.log(`Wrote ${dataset.plants.length} species to ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
