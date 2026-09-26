import { plant, R, LF, FF, t } from './_helpers.mjs';

// Green manures and cover crops. Seed rates are for broadcast sowing.

function cover(id, scientific, common, family, o) {
  return plant(id, scientific, common, {
    family,
    category: 'green-manure',
    lifecycle: o.lifecycle ?? 'annual',
    edible: false,
    tags: ['green-manure', ...(o.tags ?? [])],
    growing: { sun: ['full-sun', 'partial-shade'], sunHoursMin: 4, water: o.water ?? 'medium', frostTolerance: o.frost ?? 'hardy' },
    planting: { methods: ['broadcast'], seedRateGPerM2: o.rate, seedDepthCm: o.depth },
    timing: o.timing,
    care: { harvesting: o.use },
    rotation: o.rotation ?? { group: 'other' },
    conf: 'low',
  });
}

export default [
  cover('secale-cereale', 'Secale cereale', { en: ['Winter rye'], fi: ['Ruis', 'Syysruis'] }, 'Poaceae', {
    tags: ['winter-cover', 'weed-suppressing'], rate: R(15, 20), depth: R(2, 4),
    timing: { directSow: FF(-6, -2) },
    use: t('Sow in late summer or autumn to protect bare soil over winter. Dig in or cut 2–3 weeks before sowing in spring; rye residue briefly inhibits small seeds.'),
  }),
  cover('trifolium-pratense', 'Trifolium pratense', { en: ['Red clover'], fi: ['Puna-apila'] }, 'Fabaceae', {
    lifecycle: 'perennial', tags: ['nitrogen-fixer', 'pollinators', 'deep-rooted'], rate: R(1.5, 2), depth: R(0.5, 1),
    timing: { directSow: LF(-2, 10) },
    use: t('Grow for one or two seasons to add nitrogen and improve structure; mow before seeding and dig in.'),
    rotation: { group: 'legumes', nitrogenFixer: true },
  }),
  cover('trifolium-incarnatum', 'Trifolium incarnatum', { en: ['Crimson clover'], fi: ['Veriapila'] }, 'Fabaceae', {
    tags: ['nitrogen-fixer', 'pollinators'], frost: 'half-hardy', rate: R(2, 3), depth: R(0.5, 1),
    timing: { directSow: LF(0, 10) },
    use: t('Fast-growing annual clover; cut at flowering and incorporate.'),
    rotation: { group: 'legumes', nitrogenFixer: true },
  }),
  cover('vicia-villosa', 'Vicia villosa', { en: ['Hairy vetch'], fi: ['Ruisvirna'] }, 'Fabaceae', {
    tags: ['nitrogen-fixer', 'winter-cover'], rate: R(5, 8), depth: R(2, 4),
    timing: { directSow: FF(-8, -4) },
    use: t('Often sown with winter rye, which gives it support. Fixes large amounts of nitrogen by the following spring.'),
    rotation: { group: 'legumes', nitrogenFixer: true },
  }),
  cover('sinapis-alba', 'Sinapis alba', { en: ['White mustard'], fi: ['Valkosinappi'] }, 'Brassicaceae', {
    tags: ['fast', 'biofumigant'], frost: 'half-hardy', rate: R(1.5, 2.5), depth: R(1, 2),
    timing: { directSow: LF(0, 14) },
    use: t('Very fast cover (4–8 weeks); dig in before flowering. A brassica — do not use where clubroot is a problem or before other brassicas.'),
    rotation: { group: 'brassicas' },
  }),
  cover('raphanus-sativus-oleiformis', 'Raphanus sativus var. oleiformis', { en: ['Fodder radish', 'Oilseed radish'], fi: ['Öljyretikka'] }, 'Brassicaceae', {
    tags: ['deep-rooted', 'soil-structure'], frost: 'half-hardy', rate: R(1.5, 2.5), depth: R(1, 2),
    timing: { directSow: LF(4, 14) },
    use: t('Its thick taproot breaks up compacted subsoil; frost kills it and the roots rot in place over winter.'),
    rotation: { group: 'brassicas' },
  }),
  cover('lupinus-angustifolius', 'Lupinus angustifolius', { en: ['Blue lupin', 'Narrow-leaved lupin'], fi: ['Sinilupiini'] }, 'Fabaceae', {
    tags: ['nitrogen-fixer', 'deep-rooted', 'acid-tolerant'], rate: R(10, 15), depth: R(2, 4), frost: 'half-hardy',
    timing: { directSow: LF(-2, 4) },
    use: t('Annual green-manure lupin for acidic, light soils; cut at flowering. Unlike garden lupin it is not invasive.'),
    rotation: { group: 'legumes', nitrogenFixer: true },
  }),
  cover('avena-sativa', 'Avena sativa', { en: ['Oats (cover crop)'], fi: ['Kaura'] }, 'Poaceae', {
    tags: ['fast', 'nurse-crop'], frost: 'half-hardy', rate: R(10, 15), depth: R(2, 4),
    timing: { directSow: LF(-2, 12) },
    use: t('Sown alone or as a nurse crop for clover. Late-summer sowings are killed by frost and leave an easy mulch.'),
  }),
];
