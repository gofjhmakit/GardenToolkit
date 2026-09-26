import { R, t } from './_helpers.mjs';

/**
 * Companion relations. Evidence levels:
 *  - documented:   mechanism supported by horticultural/agronomic research
 *                  (the mechanism text states the limits of the effect);
 *  - common-claim: widely repeated in gardening literature, mixed/weak evidence;
 *  - traditional:  folklore / traditional practice, little or no testing.
 */
export const companions = [
  {
    a: 'solanum-tuberosum', b: 'solanum-lycopersicum', kind: 'antagonistic', evidence: 'documented',
    mechanism: t('Both are hosts of late blight (Phytophthora infestans); growing them close together makes it easier for the disease to spread between them.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'tagetes-patula', b: 'family:Solanaceae', kind: 'beneficial', evidence: 'documented',
    mechanism: t('French marigold roots suppress some root-knot and lesion nematodes. The effect is documented mainly for dense marigold stands grown for a season before the crop, not for occasional interplanting.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'phacelia-tanacetifolia', b: 'family:Brassicaceae', kind: 'beneficial', evidence: 'documented',
    mechanism: t('Phacelia flowers feed hoverflies and parasitoid wasps whose larvae prey on aphids and caterpillars. Attraction of beneficial insects is well documented; the resulting reduction in crop pests varies.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'lobularia-maritima', b: 'genus:Lactuca', kind: 'beneficial', evidence: 'documented',
    mechanism: t('Sweet alyssum strips supply nectar for hoverflies that prey on lettuce aphids; studied in field lettuce. Effect depends on distance and flowering time.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'daucus-carota-sativus', b: 'allium-cepa', kind: 'beneficial', evidence: 'common-claim',
    mechanism: t('Often claimed that onion scent masks carrots from carrot fly and vice versa. Trials give mixed results; insect mesh is far more reliable.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'daucus-carota-sativus', b: 'allium-porrum', kind: 'beneficial', evidence: 'common-claim',
    mechanism: t('Same scent-masking claim as carrot + onion; weak and inconsistent evidence.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'solanum-lycopersicum', b: 'ocimum-basilicum', kind: 'beneficial', evidence: 'common-claim',
    mechanism: t('Popular pairing; claims of improved flavour or pest repellence are not well supported. Both like the same warm conditions, which makes them practical neighbours.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'tropaeolum-majus', b: 'family:Brassicaceae', kind: 'beneficial', evidence: 'common-claim',
    mechanism: t('Used as a trap crop for cabbage white butterflies and blackfly; may concentrate pests away from the crop, but can also build up pest numbers if not managed.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'genus:Allium', b: 'family:Fabaceae', kind: 'antagonistic', evidence: 'traditional',
    mechanism: t('Traditional advice says onions and garlic stunt peas and beans. Little experimental support.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'foeniculum-vulgare-azoricum', b: 'solanum-lycopersicum', kind: 'antagonistic', evidence: 'traditional',
    mechanism: t('Fennel is traditionally said to inhibit most garden plants. Evidence is anecdotal.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'zea-mays-saccharata', b: 'phaseolus-vulgaris', kind: 'beneficial', evidence: 'traditional',
    mechanism: t('Part of the "Three Sisters" (maize, climbing beans, squash) traditional intercropping system. Works best with climbing beans and in warm climates.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'zea-mays-saccharata', b: 'cucurbita-maxima', kind: 'beneficial', evidence: 'traditional',
    mechanism: t('"Three Sisters" intercropping: squash leaves shade the soil and suppress weeds.'),
    sources: ['gtk-editorial'],
  },
  {
    a: 'borago-officinalis', b: 'fragaria-x-ananassa', kind: 'beneficial', evidence: 'common-claim',
    mechanism: t('Borage attracts bees, which may help strawberry pollination; claims of improved flavour are unsupported.'),
    sources: ['gtk-editorial'],
  },
];

/** Rotation guidance per crop group. Intervals are conservative ranges. */
export const rotation = [
  { group: 'solanaceae', label: t('Potatoes & tomatoes (Solanaceae)'), minYearsBetween: R(3, 4), reason: t('Limits potato cyst nematode and soil-borne diseases such as potato scab and verticillium.'), confidence: 'medium', sources: ['gtk-editorial'] },
  { group: 'brassicas', label: t('Brassicas (cabbage family)'), minYearsBetween: R(3, 4), reason: t('Limits clubroot and cabbage root fly build-up. Clubroot spores survive for many years; if clubroot is present, much longer breaks are needed.'), confidence: 'medium', sources: ['gtk-editorial'] },
  { group: 'alliums', label: t('Onion family (alliums)'), minYearsBetween: R(3, 4), reason: t('Limits onion white rot and stem nematode; white rot sclerotia persist in soil for many years.'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'legumes', label: t('Peas & beans (legumes)'), minYearsBetween: R(2, 3), reason: t('Limits root rots and pea wilt. Legumes leave some nitrogen for the next crop.'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'roots', label: t('Root crops & umbellifers'), minYearsBetween: R(2, 3), reason: t('Limits carrot fly and root diseases.'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'cucurbits', label: t('Cucurbits (squash family)'), minYearsBetween: R(2, 3), reason: t('Limits soil-borne diseases; less critical than for brassicas or potatoes.'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'leafy', label: t('Leafy crops'), minYearsBetween: R(1, 2), reason: t('Few crop-specific soil problems; rotate mainly to share nutrients and break disease cycles.'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'perennial', label: t('Perennial crops'), minYearsBetween: null, reason: t('Not rotated. When replanting, avoid replanting the same crop in the same spot (replant disease in e.g. apple, strawberry).'), confidence: 'low', sources: ['gtk-editorial'] },
  { group: 'other', label: t('Other'), minYearsBetween: null, reason: t('No specific rotation guidance.'), confidence: 'unknown', sources: [] },
];

export const sources = [
  {
    id: 'gtk-editorial',
    title: 'Garden Toolkit editorial seed data',
    url: null,
    license: 'CC0-1.0',
    attribution: null,
    retrieved: '2026-09-25',
    notes:
      'Compiled by the Garden Toolkit maintainers from widely published, general horticultural guidance (seed-packet conventions, national gardening-organisation and university-extension style planting charts). Values are NOT verified field-by-field against a single citable source; ranges are intentionally broad and each record carries a confidence level. Treat as a starting point and verify locally.',
  },
  {
    id: 'yrttitarha',
    title: 'Yrttitarha – herb database (yrttitarha.fi)',
    url: 'http://www.yrttitarha.fi/kanta/haku.cgi?hakusanat=kaikki-suomi',
    license: 'Referenced, not copied',
    attribution: 'Yrttitarha herb database and its cultivation guides (Finnish).',
    retrieved: '2026-09-26',
    notes:
      'Used as a reference for herb uses (food, traditional medicinal and other uses), cautions and Finnish cultivation figures. The texts in this dataset are our own short summaries; no text is reproduced. Traditional medicinal use is reported for information only and is not medical advice.',
  },
];
