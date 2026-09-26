import { plant, R, LF, FF, t } from './_helpers.mjs';

// Hardy perennials, spring and summer bulbs, and ornamental grasses.

const DIVIDE = t('Divide crowded clumps every 3–5 years in spring or early autumn.');

function perennial(id, scientific, common, family, o) {
  return plant(id, scientific, common, {
    family,
    category: o.category ?? 'perennial',
    lifecycle: 'perennial',
    edible: o.edible ?? false,
    tags: o.tags ?? ['perennial'],
    growing: { sun: o.sun ?? ['full-sun', 'partial-shade'], sunHoursMin: o.sunHours ?? 4, water: o.water ?? 'medium', frostTolerance: 'hardy', ...(o.soil ? { soil: o.soil } : {}) },
    planting: {
      methods: [o.method ?? 'spaced'],
      ...(o.method === 'grid' ? { gridSpacingCm: o.spacing } : { inRowSpacingCm: o.spacing, rowSpacingCm: o.spacing }),
      ...(o.depth ? { plantingDepthCm: o.depth } : {}),
      containerSuitable: o.container ?? false,
      matureHeightCm: o.height,
      ...(o.width ? { matureWidthCm: o.width } : {}),
      rootDepth: o.root ?? 'medium',
      ...(o.transplanting ? { transplanting: o.transplanting } : {}),
    },
    timing: o.timing,
    care: { ...(o.divide === false ? {} : { thinning: DIVIDE }), ...(o.care ?? {}) },
    rotation: { group: 'perennial' },
    conf: o.conf ?? 'medium',
  });
}

const SPRING_BULB = (depth) => t(`Plant bulbs in autumn, ${depth} cm deep, about 4–6 weeks before the ground freezes.`);
const bulb = (id, scientific, common, family, o) =>
  perennial(id, scientific, common, family, { category: 'bulb', method: 'grid', root: 'shallow', divide: false, container: true, ...o, transplanting: o.transplanting ?? SPRING_BULB(o.depthText ?? '8–10') });

export default [
  // --- Border perennials ------------------------------------------------------
  perennial('lupinus-polyphyllus', 'Lupinus polyphyllus', { en: ['Garden lupin', 'Lupine'], fi: ['Komealupiini', 'Lupiini'] }, 'Fabaceae', {
    tags: ['perennial', 'invasive-warning', 'nitrogen-fixer', 'pollinators'], sun: ['full-sun'], sunHours: 6, spacing: R(45, 60), height: R(90, 120), root: 'deep', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(4, 10) },
    care: { pruning: t('Cut off spent spikes before seeds ripen.'), winter: t('Invasive alien species in Finland and several other countries — spreads by seed into meadows and roadsides. Deadhead strictly or choose another plant.') },
  }),
  perennial('delphinium-elatum', 'Delphinium elatum', { en: ['Delphinium', 'Candle larkspur'], fi: ['Jaloritarinkannus', 'Ritarinkannus'] }, 'Ranunculaceae', {
    tags: ['perennial', 'tall', 'cut-flower', 'toxic', 'pollinators'], sun: ['full-sun'], sunHours: 6, soil: ['compost-rich'], spacing: R(45, 60), height: R(120, 200), root: 'deep',
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 12) },
    care: { support: t('Stake each spike early, before the flowers open.'), pruning: t('Cut back after flowering for a smaller second flush.'), pests: t('Slugs on new shoots in spring.') },
  }),
  perennial('phlox-paniculata', 'Phlox paniculata', { en: ['Garden phlox', 'Summer phlox'], fi: ['Syysleimu'] }, 'Polemoniaceae', {
    tags: ['perennial', 'fragrant', 'pollinators', 'cottage'], soil: ['compost-rich'], water: 'medium', spacing: R(45, 60), height: R(60, 120),
    timing: { plantOut: LF(-2, 2), flowering: LF(12, 18) },
    care: { diseases: t('Powdery mildew in dry, crowded conditions — thin shoots and water in dry spells.') },
  }),
  perennial('astilbe-arendsii', 'Astilbe × arendsii', { en: ['Astilbe', 'False goat\'s beard'], fi: ['Jaloangervo', 'Astilbe'] }, 'Saxifragaceae', {
    tags: ['perennial', 'shade', 'moist-soil'], sun: ['partial-shade', 'shade'], sunHours: 2, water: 'high', soil: ['humus-rich'], spacing: R(40, 50), height: R(40, 100), root: 'shallow',
    timing: { plantOut: LF(-2, 2), flowering: LF(8, 14) },
    care: { watering: t('Must not dry out; leaves scorch in dry sun.') },
  }),
  perennial('bergenia-crassifolia', 'Bergenia crassifolia', { en: ['Bergenia', 'Elephant\'s ears'], fi: ['Vuorenkilpi'] }, 'Saxifragaceae', {
    tags: ['perennial', 'evergreen', 'groundcover', 'early'], sun: ['full-sun', 'partial-shade', 'shade'], sunHours: 2, water: 'low', spacing: R(40, 50), height: R(30, 45), root: 'shallow',
    timing: { plantOut: LF(-3, 2), flowering: LF(-2, 4) },
  }),
  perennial('alchemilla-mollis', 'Alchemilla mollis', { en: ['Lady\'s mantle'], fi: ['Jättipoimulehti', 'Poimulehti'] }, 'Rosaceae', {
    tags: ['perennial', 'groundcover', 'self-seeds', 'edging'], sun: ['full-sun', 'partial-shade'], sunHours: 3, spacing: R(40, 50), height: R(30, 50), root: 'shallow',
    timing: { plantOut: LF(-3, 2), flowering: LF(6, 12) },
    care: { pruning: t('Cut back after flowering for fresh leaves and to stop self-seeding.') },
  }),
  perennial('geranium-magnificum', 'Geranium × magnificum', { en: ['Showy cranesbill', 'Hardy geranium'], fi: ['Loistokurjenpolvi', 'Kurjenpolvi'] }, 'Geraniaceae', {
    tags: ['perennial', 'groundcover', 'pollinators', 'low-maintenance'], spacing: R(45, 60), height: R(45, 60), root: 'medium',
    timing: { plantOut: LF(-3, 2), flowering: LF(6, 10) },
    care: { pruning: t('Shear back after flowering for new leaves.') },
  }),
  perennial('geranium-sanguineum', 'Geranium sanguineum', { en: ['Bloody cranesbill'], fi: ['Verikurjenpolvi'] }, 'Geraniaceae', {
    tags: ['perennial', 'groundcover', 'drought-tolerant', 'pollinators'], sun: ['full-sun'], sunHours: 5, water: 'low', spacing: R(30, 40), height: R(20, 30), root: 'medium', divide: false,
    timing: { plantOut: LF(-3, 2), flowering: LF(6, 14) },
  }),
  perennial('aquilegia-vulgaris', 'Aquilegia vulgaris', { en: ['Columbine', 'Granny\'s bonnet'], fi: ['Lehtoakileija', 'Akileija'] }, 'Ranunculaceae', {
    tags: ['perennial', 'self-seeds', 'cottage', 'toxic'], sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(30, 40), height: R(40, 80), root: 'deep', divide: false,
    timing: { plantOut: LF(-3, 2), flowering: LF(2, 8) },
    care: { pruning: t('Short-lived, but self-seeds; cut off seed heads if you want to keep a colour pure.') },
  }),
  perennial('convallaria-majalis', 'Convallaria majalis', { en: ['Lily of the valley'], fi: ['Kielo'] }, 'Asparagaceae', {
    tags: ['perennial', 'shade', 'groundcover', 'fragrant', 'toxic', 'spreading'], sun: ['shade', 'partial-shade'], sunHours: 1, spacing: R(15, 20), method: 'grid', height: R(15, 25), root: 'shallow', divide: false,
    transplanting: t('Plant rhizome pieces (pips) just below the surface in autumn or early spring.'),
    timing: { plantOut: LF(-4, 0), flowering: LF(2, 6) },
    care: { harvesting: t('All parts are highly poisonous, including the red berries and the water in a vase.') },
  }),
  perennial('iris-sibirica', 'Iris sibirica', { en: ['Siberian iris'], fi: ['Siperiankurjenmiekka'] }, 'Iridaceae', {
    tags: ['perennial', 'moist-soil', 'cut-flower'], sun: ['full-sun', 'partial-shade'], sunHours: 5, water: 'high', spacing: R(45, 60), height: R(60, 100), root: 'medium',
    timing: { plantOut: LF(-3, 2), flowering: LF(4, 8) },
  }),
  perennial('iris-germanica', 'Iris germanica', { en: ['Bearded iris'], fi: ['Saksankurjenmiekka'] }, 'Iridaceae', {
    tags: ['perennial', 'drought-tolerant', 'cut-flower'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['well-drained'], spacing: R(30, 45), height: R(40, 90), root: 'shallow',
    transplanting: t('Plant rhizomes with their top half above the soil so they can bake in the sun.'),
    timing: { plantOut: FF(-10, -6), flowering: LF(4, 8) },
  }),
  perennial('papaver-orientale', 'Papaver orientale', { en: ['Oriental poppy'], fi: ['Idänunikko'] }, 'Papaveraceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(45, 60), height: R(60, 90), root: 'deep', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(4, 8) },
    care: { pruning: t('Dies back after flowering; plant late-summer perennials nearby to hide the gap.') },
  }),
  perennial('leucanthemum-superbum', 'Leucanthemum × superbum', { en: ['Shasta daisy'], fi: ['Jalopäivänkakkara'] }, 'Asteraceae', {
    tags: ['perennial', 'cut-flower', 'pollinators'], sun: ['full-sun'], sunHours: 6, spacing: R(40, 50), height: R(50, 90),
    timing: { plantOut: LF(-2, 2), flowering: LF(8, 14) },
    care: { pruning: t('Deadhead to prolong flowering.') },
  }),
  perennial('coreopsis-verticillata', 'Coreopsis verticillata', { en: ['Threadleaf coreopsis', 'Tickseed'], fi: ['Kiehkuratyttösilmä'] }, 'Asteraceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators', 'long-flowering'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(30, 45), height: R(40, 60),
    timing: { plantOut: LF(-2, 2), flowering: LF(8, 16) },
  }),
  perennial('rudbeckia-fulgida', 'Rudbeckia fulgida', { en: ['Orange coneflower'], fi: ['Päivänhattu'] }, 'Asteraceae', {
    tags: ['perennial', 'pollinators', 'long-flowering', 'late-flowering'], sun: ['full-sun'], sunHours: 6, spacing: R(45, 60), height: R(60, 90),
    timing: { plantOut: LF(-2, 2), flowering: LF(12, 20) },
  }),
  perennial('hylotelephium-spectabile', 'Hylotelephium spectabile', { en: ['Showy stonecrop', 'Ice plant'], fi: ['Kaunomaksaruoho'] }, 'Crassulaceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators', 'late-flowering'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['well-drained'], spacing: R(40, 50), height: R(30, 60),
    timing: { plantOut: LF(-2, 2), flowering: LF(14, 20) },
    care: { pruning: t('Leave the dry flower heads for winter structure; cut back in spring.') },
  }),
  perennial('salvia-nemorosa', 'Salvia nemorosa', { en: ['Woodland sage', 'Balkan clary'], fi: ['Lehtosalvia'] }, 'Lamiaceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators', 'long-flowering'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(40, 50), height: R(40, 60),
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 14) },
    care: { pruning: t('Cut back after the first flush for a second flowering.') },
  }),
  perennial('veronica-spicata', 'Veronica spicata', { en: ['Spiked speedwell'], fi: ['Tähkätädyke'] }, 'Plantaginaceae', {
    tags: ['perennial', 'pollinators', 'drought-tolerant'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(30, 45), height: R(30, 60),
    timing: { plantOut: LF(-2, 2), flowering: LF(8, 14) },
  }),
  perennial('heuchera-hybrids', 'Heuchera hybrids', { en: ['Coral bells', 'Heuchera'], fi: ['Keijunkukka'] }, 'Saxifragaceae', {
    tags: ['perennial', 'foliage', 'shade', 'container'], sun: ['partial-shade', 'shade'], sunHours: 2, soil: ['humus-rich', 'well-drained'], spacing: R(30, 40), height: R(20, 50), root: 'shallow', container: true,
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 12) },
    care: { winter: t('Replant crowns that lift in frost; mulch in cold regions.') },
  }),
  perennial('matteuccia-struthiopteris', 'Matteuccia struthiopteris', { en: ['Ostrich fern'], fi: ['Kotkansiipi'] }, 'Onocleaceae', {
    tags: ['perennial', 'fern', 'shade', 'spreading', 'nordic'], sun: ['shade', 'partial-shade'], sunHours: 1, water: 'high', soil: ['humus-rich'], spacing: R(60, 90), height: R(90, 150), root: 'shallow', divide: false,
    timing: { plantOut: LF(-3, 2) },
    care: { harvesting: t('Spreads by runners into large colonies. The young fronds (fiddleheads) are eaten cooked in some countries.') },
  }),
  perennial('dryopteris-filix-mas', 'Dryopteris filix-mas', { en: ['Male fern'], fi: ['Kivikkoalvejuuri', 'Alvejuuri'] }, 'Dryopteridaceae', {
    tags: ['perennial', 'fern', 'shade', 'low-maintenance', 'nordic'], sun: ['shade', 'partial-shade'], sunHours: 1, water: 'medium', spacing: R(60, 90), height: R(60, 120), divide: false,
    timing: { plantOut: LF(-3, 2) },
  }),
  perennial('stachys-byzantina', 'Stachys byzantina', { en: ['Lamb\'s ear'], fi: ['Villapähkämö'] }, 'Lamiaceae', {
    tags: ['perennial', 'foliage', 'groundcover', 'drought-tolerant', 'pollinators'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['well-drained'], spacing: R(30, 45), height: R(20, 45), root: 'shallow',
    timing: { plantOut: LF(-2, 2), flowering: LF(8, 12) },
  }),
  perennial('armeria-maritima', 'Armeria maritima', { en: ['Sea thrift'], fi: ['Laukkaneilikka'] }, 'Plumbaginaceae', {
    tags: ['perennial', 'rock-garden', 'drought-tolerant', 'edging'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], spacing: R(20, 30), height: R(10, 30), root: 'shallow', container: true,
    timing: { plantOut: LF(-2, 2), flowering: LF(2, 8) },
  }),
  perennial('phlox-subulata', 'Phlox subulata', { en: ['Creeping phlox', 'Moss phlox'], fi: ['Sammalleimu'] }, 'Polemoniaceae', {
    tags: ['perennial', 'groundcover', 'rock-garden', 'evergreen'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['well-drained'], method: 'grid', spacing: R(30, 45), height: R(5, 15), root: 'shallow',
    timing: { plantOut: LF(-2, 2), flowering: LF(0, 4) },
    care: { pruning: t('Shear lightly after flowering to keep it dense.') },
  }),
  perennial('sempervivum-tectorum', 'Sempervivum tectorum', { en: ['Houseleek', 'Hens and chicks'], fi: ['Kattomehitähti', 'Mehitähti'] }, 'Crassulaceae', {
    tags: ['perennial', 'succulent', 'rock-garden', 'container', 'drought-tolerant'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], method: 'grid', spacing: R(10, 20), height: R(5, 15), root: 'shallow', container: true, divide: false,
    timing: { plantOut: LF(-2, 4) },
    care: { watering: t('Needs almost no water; rots in wet, heavy soil.') },
  }),
  perennial('dianthus-deltoides', 'Dianthus deltoides', { en: ['Maiden pink'], fi: ['Ketoneilikka'] }, 'Caryophyllaceae', {
    tags: ['perennial', 'groundcover', 'rock-garden', 'nordic', 'self-seeds'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], spacing: R(20, 30), height: R(10, 25), root: 'shallow', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 12) },
  }),
  perennial('campanula-persicifolia', 'Campanula persicifolia', { en: ['Peach-leaved bellflower'], fi: ['Kurjenkello'] }, 'Campanulaceae', {
    tags: ['perennial', 'cottage', 'self-seeds', 'nordic'], spacing: R(30, 45), height: R(50, 90),
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 12) },
  }),
  perennial('campanula-glomerata', 'Campanula glomerata', { en: ['Clustered bellflower'], fi: ['Peurankello'] }, 'Campanulaceae', {
    tags: ['perennial', 'spreading', 'pollinators'], spacing: R(30, 45), height: R(40, 60),
    timing: { plantOut: LF(-2, 2), flowering: LF(6, 12) },
  }),
  perennial('echinops-ritro', 'Echinops ritro', { en: ['Globe thistle'], fi: ['Pallo-ohdake'] }, 'Asteraceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators', 'dried-flower'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(45, 60), height: R(60, 120), root: 'deep', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(10, 16) },
  }),
  perennial('eryngium-planum', 'Eryngium planum', { en: ['Blue eryngo', 'Sea holly'], fi: ['Sinipiikkiputki'] }, 'Apiaceae', {
    tags: ['perennial', 'drought-tolerant', 'pollinators', 'dried-flower'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], spacing: R(40, 50), height: R(60, 90), root: 'deep', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(10, 16) },
  }),
  perennial('helleborus-hybridus', 'Helleborus × hybridus', { en: ['Lenten rose', 'Hellebore'], fi: ['Tarhajouluruusu', 'Jouluruusu'] }, 'Ranunculaceae', {
    tags: ['perennial', 'shade', 'early', 'evergreen', 'toxic'], sun: ['partial-shade', 'shade'], sunHours: 2, soil: ['humus-rich'], spacing: R(40, 50), height: R(30, 50), root: 'deep', divide: false,
    timing: { plantOut: LF(-2, 2), flowering: LF(-4, 2) },
    care: { winter: t('Plant in a sheltered spot; in cold regions cover with spruce boughs in winter.') },
    conf: 'low',
  }),
  perennial('primula-veris', 'Primula veris', { en: ['Cowslip'], fi: ['Kevätesikko', 'Esikko'] }, 'Primulaceae', {
    tags: ['perennial', 'spring', 'wildflower', 'nordic', 'pollinators'], sun: ['full-sun', 'partial-shade'], sunHours: 4, water: 'medium', spacing: R(20, 25), height: R(15, 25), root: 'shallow',
    timing: { plantOut: LF(-3, 2), flowering: LF(-1, 4) },
  }),
  perennial('aconitum-napellus', 'Aconitum napellus', { en: ['Monkshood'], fi: ['Ukonhattu'] }, 'Ranunculaceae', {
    tags: ['perennial', 'tall', 'shade', 'toxic', 'late-flowering'], sun: ['partial-shade', 'full-sun'], sunHours: 3, water: 'medium', spacing: R(45, 60), height: R(90, 150), root: 'deep',
    timing: { plantOut: LF(-3, 2), flowering: LF(12, 18) },
    care: { harvesting: t('One of the most poisonous garden plants — wear gloves and keep away from children and pets.') },
  }),
  perennial('aruncus-dioicus', 'Aruncus dioicus', { en: ['Goat\'s beard'], fi: ['Isoangervo'] }, 'Rosaceae', {
    tags: ['perennial', 'shade', 'tall', 'low-maintenance'], sun: ['partial-shade', 'shade'], sunHours: 2, water: 'high', spacing: R(90, 120), height: R(120, 200), width: R(90, 120), root: 'deep', divide: false,
    timing: { plantOut: LF(-3, 2), flowering: LF(6, 10) },
  }),
  perennial('ligularia-dentata', 'Ligularia dentata', { en: ['Leopard plant', 'Ligularia'], fi: ['Kiiltonauhus', 'Nauhus'] }, 'Asteraceae', {
    tags: ['perennial', 'shade', 'moist-soil', 'foliage'], sun: ['partial-shade'], sunHours: 3, water: 'high', soil: ['humus-rich'], spacing: R(60, 90), height: R(90, 120), root: 'deep',
    timing: { plantOut: LF(-2, 2), flowering: LF(12, 16) },
    care: { pests: t('Slugs love the young leaves.'), watering: t('Wilts dramatically in afternoon sun or dry soil.') },
  }),
  perennial('brunnera-macrophylla', 'Brunnera macrophylla', { en: ['Siberian bugloss'], fi: ['Kaukasianlemmikki'] }, 'Boraginaceae', {
    tags: ['perennial', 'shade', 'spring', 'groundcover'], sun: ['partial-shade', 'shade'], sunHours: 2, soil: ['humus-rich'], spacing: R(40, 50), height: R(30, 45), root: 'medium', divide: false,
    timing: { plantOut: LF(-3, 2), flowering: LF(0, 6) },
  }),
  perennial('pulmonaria-officinalis', 'Pulmonaria officinalis', { en: ['Lungwort'], fi: ['Rohtoimikkä', 'Imikkä'] }, 'Boraginaceae', {
    tags: ['perennial', 'shade', 'spring', 'pollinators', 'groundcover'], sun: ['partial-shade', 'shade'], sunHours: 2, spacing: R(30, 40), height: R(20, 30), root: 'shallow',
    timing: { plantOut: LF(-3, 2), flowering: LF(-2, 4) },
  }),
  perennial('lilium-martagon', 'Lilium martagon', { en: ['Martagon lily', 'Turk\'s cap lily'], fi: ['Varjolilja'] }, 'Liliaceae', {
    category: 'bulb', tags: ['bulb', 'shade', 'toxic-to-cats', 'long-lived'], sun: ['partial-shade', 'full-sun'], sunHours: 3, soil: ['humus-rich', 'well-drained'], spacing: R(25, 30), depth: R(10, 15), height: R(90, 150), root: 'medium', divide: false,
    transplanting: t('Plant bulbs in autumn 10–15 cm deep; slow to establish but very long-lived.'),
    timing: { plantOut: FF(-6, -2), flowering: LF(6, 10) },
    care: { pests: t('Lily beetle (red) — pick off adults and larvae.'), harvesting: t('All lilies are deadly to cats, including the pollen.') },
  }),
  perennial('lilium-asiatic', 'Lilium Asiatic hybrids', { en: ['Asiatic lily'], fi: ['Aasianlilja', 'Tarhalilja'] }, 'Liliaceae', {
    category: 'bulb', tags: ['bulb', 'cut-flower', 'toxic-to-cats'], sun: ['full-sun'], sunHours: 6, soil: ['well-drained'], spacing: R(20, 30), depth: R(10, 15), height: R(50, 120), root: 'medium', divide: false, container: true,
    transplanting: t('Plant bulbs in spring or autumn, 2–3 times their own height deep.'),
    timing: { plantOut: LF(-4, 0), flowering: LF(8, 12) },
    care: { pests: t('Lily beetle (red) — pick off adults and larvae.'), harvesting: t('All lilies are deadly to cats, including the pollen.') },
  }),
  // --- Ornamental grasses -------------------------------------------------
  perennial('calamagrostis-acutiflora', 'Calamagrostis × acutiflora', { en: ['Feather reed grass', '\'Karl Foerster\''], fi: ['Sulkakastikka'] }, 'Poaceae', {
    category: 'grass', tags: ['grass', 'winter-structure', 'low-maintenance'], sun: ['full-sun'], sunHours: 6, spacing: R(45, 60), height: R(120, 180), divide: false,
    timing: { plantOut: LF(-3, 2), flowering: LF(8, 12) },
    care: { pruning: t('Leave standing over winter; cut to 10 cm in early spring.') },
  }),
  perennial('festuca-glauca', 'Festuca glauca', { en: ['Blue fescue'], fi: ['Sinilampaannata'] }, 'Poaceae', {
    category: 'grass', tags: ['grass', 'edging', 'drought-tolerant', 'container'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], spacing: R(20, 30), height: R(15, 30), root: 'shallow', container: true,
    timing: { plantOut: LF(-2, 2) },
    care: { pruning: t('Comb out dead leaves in spring; replace after a few years when clumps die in the centre.') },
  }),
  perennial('miscanthus-sinensis', 'Miscanthus sinensis', { en: ['Chinese silver grass', 'Miscanthus'], fi: ['Kiinanhopeaheinä'] }, 'Poaceae', {
    category: 'grass', tags: ['grass', 'tall', 'winter-structure'], sun: ['full-sun'], sunHours: 6, spacing: R(90, 120), height: R(120, 200), root: 'deep',
    timing: { plantOut: LF(0, 3), flowering: LF(16, 22) },
    care: { winter: t('Many cultivars need a long summer to flower in cold climates.'), pruning: t('Cut back in early spring.') },
    conf: 'low',
  }),
  // --- Spring bulbs ---------------------------------------------------------
  bulb('galanthus-nivalis', 'Galanthus nivalis', { en: ['Snowdrop'], fi: ['Lumikello'] }, 'Amaryllidaceae', {
    tags: ['bulb', 'spring', 'early', 'naturalising', 'shade'], sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(5, 10), height: R(10, 15), depthText: '5–8',
    timing: { plantOut: FF(-8, -4), flowering: LF(-6, -2) },
  }),
  bulb('scilla-siberica', 'Scilla siberica', { en: ['Siberian squill'], fi: ['Sinililja', 'Idänsinililja'] }, 'Asparagaceae', {
    tags: ['bulb', 'spring', 'early', 'naturalising', 'pollinators'], spacing: R(5, 10), height: R(10, 15), depthText: '5–8',
    timing: { plantOut: FF(-8, -4), flowering: LF(-4, 0) },
  }),
  bulb('muscari-armeniacum', 'Muscari armeniacum', { en: ['Grape hyacinth'], fi: ['Armenianhelmililja', 'Helmililja'] }, 'Asparagaceae', {
    tags: ['bulb', 'spring', 'naturalising', 'pollinators'], spacing: R(5, 10), height: R(15, 20), depthText: '5–8',
    timing: { plantOut: FF(-8, -4), flowering: LF(-2, 2) },
  }),
  bulb('hyacinthus-orientalis', 'Hyacinthus orientalis', { en: ['Hyacinth'], fi: ['Tarhahyasintti', 'Hyasintti'] }, 'Asparagaceae', {
    tags: ['bulb', 'spring', 'fragrant'], sun: ['full-sun'], sunHours: 5, spacing: R(10, 15), height: R(20, 30), depthText: '10–15',
    timing: { plantOut: FF(-8, -4), flowering: LF(-1, 3) },
    care: { harvesting: t('Bulbs can irritate skin — wear gloves when planting.') },
  }),
  bulb('allium-hollandicum', 'Allium hollandicum', { en: ['Ornamental onion', 'Persian onion'], fi: ['Koristelaukka'] }, 'Amaryllidaceae', {
    tags: ['bulb', 'pollinators', 'cut-flower'], sun: ['full-sun'], sunHours: 6, spacing: R(15, 20), height: R(60, 90), depthText: '10–15',
    timing: { plantOut: FF(-8, -4), flowering: LF(4, 8) },
  }),
  bulb('fritillaria-meleagris', 'Fritillaria meleagris', { en: ['Snake\'s head fritillary'], fi: ['Kirjopikarililja'] }, 'Liliaceae', {
    tags: ['bulb', 'spring', 'moist-soil', 'naturalising'], sun: ['full-sun', 'partial-shade'], sunHours: 4, water: 'high', spacing: R(8, 12), height: R(20, 30), depthText: '8–10',
    timing: { plantOut: FF(-8, -4), flowering: LF(0, 4) },
  }),
  bulb('chionodoxa-luciliae', 'Chionodoxa luciliae', { en: ['Glory-of-the-snow'] }, 'Asparagaceae', {
    tags: ['bulb', 'spring', 'early', 'naturalising'], spacing: R(5, 8), height: R(10, 15), depthText: '5–8',
    timing: { plantOut: FF(-8, -4), flowering: LF(-4, 0) },
  }),
  bulb('fritillaria-imperialis', 'Fritillaria imperialis', { en: ['Crown imperial'], fi: ['Keisarinpikarililja'] }, 'Liliaceae', {
    tags: ['bulb', 'spring', 'tall'], sun: ['full-sun'], sunHours: 6, soil: ['well-drained'], spacing: R(30, 40), height: R(60, 100), depthText: '20',
    timing: { plantOut: FF(-10, -6), flowering: LF(0, 4) },
    care: { winter: t('Plant the bulb on its side on a layer of sand to avoid rot. Not reliably hardy in the coldest zones.') },
    conf: 'low',
  }),
  bulb('anemone-blanda', 'Anemone blanda', { en: ['Grecian windflower'], fi: ['Kreikanvuokko'] }, 'Ranunculaceae', {
    tags: ['bulb', 'spring', 'naturalising'], sun: ['full-sun', 'partial-shade'], sunHours: 4, spacing: R(8, 10), height: R(10, 15), depthText: '5',
    timing: { plantOut: FF(-8, -4), flowering: LF(-1, 3) },
    transplanting: t('Plant tubers in autumn, 5 cm deep; soak the knobbly tubers overnight first.'),
    conf: 'low',
  }),
];
