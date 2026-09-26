import { plant, R, LF, FF, FIX, t } from './_helpers.mjs';

// Fruit and berries, ornamental shrubs, garden trees and green manures.

const MATURE = (x = '') => ({ confidence: 'low', assumptions: t(`Established, mature plants in good conditions. ${x}`.trim()) });
const CULTIVAR_HARDINESS = t('Winter hardiness depends strongly on cultivar and rootstock. In cold regions, choose cultivars rated for your zone.');

function woody(id, scientific, common, family, o) {
  return plant(id, scientific, common, {
    family,
    category: o.category,
    lifecycle: 'perennial',
    edible: o.edible ?? false,
    tags: o.tags ?? [o.category],
    growing: { sun: o.sun ?? ['full-sun', 'partial-shade'], sunHoursMin: o.sunHours ?? 5, water: o.water ?? 'medium', frostTolerance: o.frost ?? 'hardy', ...(o.soil ? { soil: o.soil } : {}), ...(o.ph ? { ph: o.ph } : {}) },
    planting: {
      methods: ['individual'],
      inRowSpacingCm: o.spacing,
      ...(o.rows ? { rowSpacingCm: o.rows } : {}),
      containerSuitable: o.container ?? false,
      matureHeightCm: o.height,
      matureWidthCm: o.width ?? o.spacing,
      rootDepth: o.root ?? 'medium',
      ...(o.transplanting ? { transplanting: o.transplanting } : {}),
    },
    timing: { plantOut: o.plantOut ?? LF(-4, 0), ...(o.timing ?? {}) },
    care: o.care ?? {},
    ...(o.yield ? { yield: o.yield } : {}),
    rotation: { group: 'perennial' },
    conf: o.conf ?? 'low',
  });
}

export default [
  // --- Berries --------------------------------------------------------------
  woody('rubus-arcticus', 'Rubus arcticus', { en: ['Arctic bramble', 'Arctic raspberry'], fi: ['Mesimarja', 'Jalomesimarja'] }, 'Rosaceae', {
    category: 'berry', edible: true, tags: ['berry', 'nordic', 'groundcover'], water: 'medium', soil: ['humus-rich'], spacing: R(20, 30), rows: R(60, 80), height: R(10, 30), root: 'shallow',
    timing: { harvest: FIX('07-15', '08-31'), yearsToFirstHarvest: R(2, 3), flowering: LF(4, 8) },
    care: {
      harvesting: t('Needs two different cultivars (or the hybrid "jalomesimarja" with a pollinator) for fruit set.'),
      diseases: t('Downy mildew in damp, crowded beds; keep weed-free and airy.'),
      feeding: 'light',
    },
    yield: { perM2Kg: R(0.1, 0.3), ...MATURE('Cultivated beds; wild plants yield far less.') },
  }),
  woody('vaccinium-vitis-idaea', 'Vaccinium vitis-idaea', { en: ['Lingonberry', 'Cowberry'], fi: ['Puolukka'] }, 'Ericaceae', {
    category: 'berry', edible: true, tags: ['berry', 'nordic', 'evergreen', 'groundcover', 'acid-soil'], sun: ['full-sun', 'partial-shade'], water: 'medium', soil: ['acidic', 'humus-rich'], ph: R(4, 5.5), spacing: R(25, 35), height: R(10, 30), root: 'shallow',
    timing: { harvest: FIX('08-20', '09-30'), yearsToFirstHarvest: R(2, 3) },
    care: { fertilizing: t('Needs acidic, peaty soil; mulch with conifer needles or bark. Do not lime.'), harvesting: t('Cultivated varieties (e.g. "Red Pearl", "Koralle") crop better than wild plants.'), feeding: 'light' },
    yield: { perM2Kg: R(0.3, 0.8), ...MATURE() },
  }),
  woody('vaccinium-macrocarpon', 'Vaccinium macrocarpon', { en: ['American cranberry'], fi: ['Isokarpalo', 'Amerikankarpalo'] }, 'Ericaceae', {
    category: 'berry', edible: true, tags: ['berry', 'evergreen', 'groundcover', 'acid-soil', 'moist-soil'], sun: ['full-sun'], sunHours: 6, water: 'high', soil: ['acidic', 'peat'], ph: R(4, 5.5), spacing: R(30, 45), height: R(10, 20), root: 'shallow',
    timing: { harvest: FIX('09-15', '10-31'), yearsToFirstHarvest: R(2, 3) },
    care: { watering: t('Keep the peat bed constantly moist; rainwater is best.'), feeding: 'light' },
    yield: { perM2Kg: R(0.3, 1), ...MATURE() },
  }),
  woody('rubus-fruticosus', 'Rubus fruticosus agg.', { en: ['Blackberry'], fi: ['Karhunvatukka'] }, 'Rosaceae', {
    category: 'berry', edible: true, tags: ['berry', 'cane-fruit', 'climber'], sun: ['full-sun'], sunHours: 6, spacing: R(150, 300), rows: R(180, 240), height: R(150, 300), root: 'medium', frost: 'half-hardy',
    timing: { harvest: FIX('08-15', '09-30'), yearsToFirstHarvest: R(2, 2) },
    care: { support: t('Tie the long canes to wires; thornless cultivars are easier to handle.'), pruning: t('Canes fruit in their second year: cut fruited canes out after harvest.'), winter: t('Only marginally hardy in cold regions — lay canes down under snow or choose hardy cultivars.'), feeding: 'medium' },
    yield: { perPlantKg: R(3, 8), ...MATURE() },
  }),
  woody('ribes-nidigrolaria', 'Ribes × nidigrolaria', { en: ['Jostaberry'], fi: ['Josta', 'Jostamarja'] }, 'Grossulariaceae', {
    category: 'berry', edible: true, tags: ['berry', 'bush', 'thornless'], spacing: R(150, 200), height: R(150, 200), root: 'medium',
    timing: { harvest: FIX('07-15', '08-15'), yearsToFirstHarvest: R(2, 3) },
    care: { pruning: t('Thin old stems every winter like blackcurrant.'), feeding: 'medium' },
    yield: { perPlantKg: R(3, 6), ...MATURE() },
  }),
  woody('fragaria-vesca', 'Fragaria vesca', { en: ['Alpine strawberry', 'Wild strawberry'], fi: ['Ahomansikka', 'Kuukausimansikka'] }, 'Rosaceae', {
    category: 'berry', edible: true, tags: ['berry', 'groundcover', 'container', 'shade-tolerant', 'nordic'], sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(20, 30), height: R(10, 25), root: 'shallow', container: true,
    transplanting: t('Easily grown from seed; runnerless "everbearing" types fruit all summer.'),
    timing: { harvest: FIX('06-20', '09-15') },
    care: { feeding: 'light' },
    yield: { perPlantKg: R(0.05, 0.2), ...MATURE() },
  }),
  woody('actinidia-kolomikta', 'Actinidia kolomikta', { en: ['Arctic kiwi', 'Kolomikta'], fi: ['Kiinanlaikkuköynnös', 'Kolomiktalaikkuköynnös'] }, 'Actinidiaceae', {
    category: 'vine', edible: true, tags: ['climber', 'fruit', 'foliage'], sun: ['full-sun', 'partial-shade'], spacing: R(150, 300), height: R(300, 500), width: R(150, 300), root: 'medium',
    timing: { harvest: FIX('08-01', '09-10'), yearsToFirstHarvest: R(3, 5) },
    care: { support: t('Needs a sturdy trellis. Plant a female (fruiting) and a male (pollinator).'), pests: t('Cats are attracted to young plants — protect the base with wire.'), feeding: 'medium' },
    yield: { perPlantKg: R(2, 8), ...MATURE() },
  }),
  woody('vitis-hybrid', 'Vitis hybrids (hardy grapes)', { en: ['Grape (hardy hybrids)'], fi: ['Viiniköynnös', 'Viinirypäle'] }, 'Vitaceae', {
    category: 'vine', edible: true, tags: ['climber', 'fruit'], sun: ['full-sun'], sunHours: 7, water: 'low', soil: ['well-drained'], spacing: R(120, 200), height: R(200, 500), width: R(120, 200), root: 'deep', frost: 'half-hardy',
    timing: { harvest: FF(-6, -1), yearsToFirstHarvest: R(3, 4) },
    care: { pruning: t('Prune hard in late winter (before sap rises) to 2–3 buds on each spur.'), winter: CULTIVAR_HARDINESS, feeding: 'light' },
    yield: { perPlantKg: R(2, 8), ...MATURE('Hardy cultivars (e.g. "Zilga", "Rondo") on a warm south wall.') },
  }),
  woody('sambucus-nigra', 'Sambucus nigra', { en: ['Elder', 'Elderberry'], fi: ['Mustaselja'] }, 'Adoxaceae', {
    category: 'berry', edible: true, tags: ['shrub', 'berry', 'pollinators', 'edible-flowers'], spacing: R(200, 400), height: R(300, 600), root: 'medium', frost: 'hardy',
    timing: { harvest: FIX('08-20', '09-30'), flowering: LF(6, 10) },
    care: { harvesting: t('Flowers for cordial in early summer; berries only cooked — raw berries, leaves and stems are toxic.'), winter: CULTIVAR_HARDINESS, feeding: 'medium' },
    yield: { perPlantKg: R(3, 10), ...MATURE() },
  }),
  woody('lycium-barbarum', 'Lycium barbarum', { en: ['Goji berry', 'Wolfberry'], fi: ['Goji', 'Pukinpensas'] }, 'Solanaceae', {
    category: 'berry', edible: true, tags: ['shrub', 'berry', 'suckering'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(150, 200), height: R(150, 300), root: 'deep',
    timing: { harvest: FIX('08-01', '09-30'), yearsToFirstHarvest: R(2, 3) },
    care: { pruning: t('Suckers widely — plant in a contained spot.'), feeding: 'light' },
    yield: { perPlantKg: R(0.5, 2), ...MATURE() },
  }),
  // --- Fruit trees ----------------------------------------------------------
  woody('prunus-armeniaca', 'Prunus armeniaca', { en: ['Apricot'], fi: ['Aprikoosi'] }, 'Rosaceae', {
    category: 'fruit-tree', edible: true, tags: ['fruit-tree', 'early-flowering'], sun: ['full-sun'], sunHours: 7, soil: ['well-drained'], spacing: R(400, 500), height: R(300, 500), root: 'deep', frost: 'half-hardy',
    timing: { harvest: FIX('07-20', '08-31'), yearsToFirstHarvest: R(3, 5), flowering: LF(-3, 0) },
    care: { winter: t('Early flowers are easily frosted; only hardy northern cultivars on a warm wall in cold regions.'), feeding: 'medium' },
    yield: { perPlantKg: R(10, 40), ...MATURE() },
  }),
  woody('prunus-persica', 'Prunus persica', { en: ['Peach', 'Nectarine'], fi: ['Persikka', 'Nektariini'] }, 'Rosaceae', {
    category: 'fruit-tree', edible: true, tags: ['fruit-tree', 'container'], sun: ['full-sun'], sunHours: 8, soil: ['well-drained'], spacing: R(400, 500), height: R(200, 400), root: 'deep', frost: 'half-hardy', container: true,
    timing: { harvest: FIX('08-01', '09-15'), yearsToFirstHarvest: R(2, 4), flowering: LF(-3, 0) },
    care: { diseases: t('Peach leaf curl — cover from rain in late winter and spring.'), winter: t('In cold regions grow a dwarf cultivar in a large pot and overwinter in a cold, frost-protected place.'), feeding: 'medium' },
    yield: { perPlantKg: R(5, 30), ...MATURE() },
  }),
  woody('chaenomeles-japonica', 'Chaenomeles japonica', { en: ['Japanese quince', 'Maule\'s quince'], fi: ['Ruusukvitteni', 'Japaninruusukvitteni'] }, 'Rosaceae', {
    category: 'shrub', edible: true, tags: ['shrub', 'fruit', 'early-flowering', 'thorny'], sun: ['full-sun'], sunHours: 6, spacing: R(80, 120), height: R(60, 100), root: 'medium',
    timing: { harvest: FIX('09-01', '10-15'), flowering: LF(0, 4) },
    care: { harvesting: t('The hard, very sour fruits are used for juice, jam and as a lemon substitute (rich in vitamin C).'), feeding: 'light' },
    yield: { perPlantKg: R(1, 4), ...MATURE() },
  }),
  woody('malus-ornamental', 'Malus (ornamental crab apples)', { en: ['Crab apple (ornamental)'], fi: ['Koristeomenapuu', 'Paratiisiomenapuu'] }, 'Rosaceae', {
    category: 'tree', edible: true, tags: ['tree', 'pollinators', 'pollinizer', 'autumn-fruit'], sun: ['full-sun'], sunHours: 6, spacing: R(300, 500), height: R(300, 600), root: 'deep',
    timing: { flowering: LF(2, 5) },
    care: { harvesting: t('Good pollinator for eating apples; small fruits for jelly and for birds in winter.'), feeding: 'light' },
  }),
  // --- Shrubs ---------------------------------------------------------------
  woody('rosa-rugosa', 'Rosa rugosa', { en: ['Japanese rose', 'Rugosa rose'], fi: ['Kurttulehtiruusu'] }, 'Rosaceae', {
    category: 'shrub', edible: true, tags: ['shrub', 'invasive-warning', 'hedging', 'rose-hips'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy'], spacing: R(80, 120), height: R(100, 200), root: 'medium',
    timing: { flowering: LF(4, 14) },
    care: { winter: t('Invasive alien species in Finland — sale and planting of the species are banned there. Choose other roses.'), feeding: 'light' },
  }),
  woody('rosa-shrub', 'Rosa (hardy shrub roses)', { en: ['Shrub rose (hardy)'], fi: ['Pensasruusu'] }, 'Rosaceae', {
    category: 'shrub', tags: ['shrub', 'fragrant', 'cut-flower'], sun: ['full-sun'], sunHours: 6, soil: ['loam', 'compost-rich'], spacing: R(80, 150), height: R(100, 200), root: 'deep',
    transplanting: t('Plant own-root roses 10 cm deeper than in the pot; grafted roses with the graft union 5–10 cm below the surface in cold regions.'),
    timing: { flowering: LF(6, 14) },
    care: { pruning: t('Remove dead and weak wood in spring; shape lightly after flowering.'), diseases: t('Black spot and powdery mildew — choose resistant cultivars.'), winter: CULTIVAR_HARDINESS, feeding: 'heavy' },
  }),
  woody('philadelphus-coronarius', 'Philadelphus coronarius', { en: ['Mock orange'], fi: ['Pihajasmike', 'Jasmike'] }, 'Hydrangeaceae', {
    category: 'shrub', tags: ['shrub', 'fragrant', 'low-maintenance'], spacing: R(150, 250), height: R(200, 300), root: 'medium',
    timing: { flowering: LF(7, 10) },
    care: { pruning: t('After flowering, cut some of the oldest stems to the base.') },
  }),
  woody('forsythia-intermedia', 'Forsythia × intermedia', { en: ['Forsythia'], fi: ['Onnenpensas'] }, 'Oleaceae', {
    category: 'shrub', tags: ['shrub', 'early-flowering'], sun: ['full-sun'], sunHours: 6, spacing: R(150, 200), height: R(150, 250), root: 'medium',
    timing: { flowering: LF(-2, 2) },
    care: { pruning: t('Prune right after flowering; flowers form on last year\'s wood.'), winter: t('Flower buds freeze in hard winters — choose hardy cultivars (e.g. "Northern Gold", "Meadowlark").') },
  }),
  woody('weigela-florida', 'Weigela florida', { en: ['Weigela'], fi: ['Ruusuweigela'] }, 'Caprifoliaceae', {
    category: 'shrub', tags: ['shrub', 'pollinators'], sun: ['full-sun', 'partial-shade'], spacing: R(120, 180), height: R(120, 200), root: 'medium',
    timing: { flowering: LF(6, 10) },
    care: { pruning: t('Thin oldest stems after flowering.'), winter: CULTIVAR_HARDINESS },
  }),
  woody('cornus-alba', 'Cornus alba', { en: ['Red-barked dogwood', 'Siberian dogwood'], fi: ['Valkokanukka'] }, 'Cornaceae', {
    category: 'shrub', tags: ['shrub', 'winter-structure', 'hedging', 'moist-soil'], sun: ['full-sun', 'partial-shade'], spacing: R(100, 150), height: R(150, 300), root: 'medium',
    timing: { flowering: LF(4, 8) },
    care: { pruning: t('Cut a third of the stems to the base each spring for the brightest red winter bark.') },
  }),
  woody('physocarpus-opulifolius', 'Physocarpus opulifolius', { en: ['Ninebark'], fi: ['Lännenheisiangervo', 'Heisiangervo'] }, 'Rosaceae', {
    category: 'shrub', tags: ['shrub', 'foliage', 'hedging', 'low-maintenance'], sun: ['full-sun', 'partial-shade'], water: 'low', spacing: R(100, 150), height: R(150, 250), root: 'medium',
    timing: { flowering: LF(6, 10) },
    care: { pruning: t('Thin old stems after flowering; purple-leaved cultivars colour best in sun.') },
  }),
  woody('dasiphora-fruticosa', 'Dasiphora fruticosa', { en: ['Shrubby cinquefoil', 'Potentilla'], fi: ['Pensashanhikki'] }, 'Rosaceae', {
    category: 'shrub', tags: ['shrub', 'long-flowering', 'low-maintenance', 'hedging'], sun: ['full-sun'], sunHours: 6, water: 'low', spacing: R(60, 100), height: R(50, 120), root: 'medium', container: true,
    timing: { flowering: LF(6, 18) },
    care: { pruning: t('Trim in early spring; cut some old stems to the base every few years.') },
  }),
  woody('berberis-thunbergii', 'Berberis thunbergii', { en: ['Japanese barberry'], fi: ['Japaninhappomarja', 'Happomarja'] }, 'Berberidaceae', {
    category: 'shrub', tags: ['shrub', 'hedging', 'thorny', 'foliage'], sun: ['full-sun', 'partial-shade'], water: 'low', spacing: R(50, 80), height: R(50, 150), root: 'medium',
    timing: {},
    care: { pruning: t('Clip hedges after the spring growth. Thorny — wear gloves.'), winter: t('Invasive in parts of North America; check local rules.') },
  }),
  woody('hydrangea-arborescens', 'Hydrangea arborescens', { en: ['Smooth hydrangea', '\'Annabelle\''], fi: ['Pallohortensia'] }, 'Hydrangeaceae', {
    category: 'shrub', tags: ['shrub', 'late-flowering', 'cut-flower', 'shade-tolerant'], sun: ['partial-shade', 'full-sun'], sunHours: 3, water: 'high', spacing: R(100, 150), height: R(90, 150), root: 'shallow',
    timing: { flowering: LF(10, 16) },
    care: { pruning: t('Flowers on new wood: cut all stems back to 20–30 cm in early spring.'), support: t('Heavy heads flop after rain — use a ring support.') },
  }),
  woody('rhododendron-catawbiense', 'Rhododendron (hardy hybrids)', { en: ['Rhododendron (hardy)'], fi: ['Alppiruusu', 'Rododendron'] }, 'Ericaceae', {
    category: 'shrub', tags: ['shrub', 'evergreen', 'acid-soil', 'shade-tolerant'], sun: ['partial-shade'], sunHours: 3, water: 'medium', soil: ['acidic', 'humus-rich'], ph: R(4.5, 5.5), spacing: R(100, 200), height: R(100, 250), root: 'shallow',
    transplanting: t('Plant shallowly in a wide pit filled with acidic peat and bark compost; never deeper than it grew.'),
    timing: { flowering: LF(2, 6) },
    care: { watering: t('Shallow roots — water in dry spells and mulch with bark or needles.'), winter: t('Shade from late-winter sun, which scorches the evergreen leaves. Helsinki University hybrids suit Finnish winters.'), feeding: 'light' },
  }),
  woody('buxus-sempervirens', 'Buxus sempervirens', { en: ['Boxwood', 'Box'], fi: ['Palsampuksipuu', 'Puksipuu'] }, 'Buxaceae', {
    category: 'shrub', tags: ['shrub', 'evergreen', 'hedging', 'topiary', 'container'], sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(25, 40), height: R(30, 150), root: 'shallow', frost: 'half-hardy', container: true,
    timing: {},
    care: { pruning: t('Clip in early summer and again in late summer if needed.'), pests: t('Box tree moth caterpillars and box blight in many regions.'), winter: t('Protect from late-winter sun and dry wind in cold regions.') },
  }),
  woody('taxus-baccata', 'Taxus baccata', { en: ['English yew'], fi: ['Euroopanmarjakuusi', 'Marjakuusi'] }, 'Taxaceae', {
    category: 'shrub', tags: ['shrub', 'evergreen', 'hedging', 'shade-tolerant', 'toxic'], sun: ['partial-shade', 'shade', 'full-sun'], sunHours: 2, spacing: R(40, 60), height: R(100, 300), root: 'medium', frost: 'half-hardy',
    timing: {},
    care: { pruning: t('Tolerates hard pruning, even into old wood.'), harvesting: t('All parts except the red flesh of the berry are highly poisonous.'), winter: t('In the coldest regions choose Taxus × media or T. cuspidata, which are hardier.') },
  }),
  woody('thuja-occidentalis', 'Thuja occidentalis', { en: ['Northern white cedar', 'Arborvitae'], fi: ['Kanadantuija', 'Tuija'] }, 'Cupressaceae', {
    category: 'shrub', tags: ['shrub', 'evergreen', 'hedging'], sun: ['full-sun', 'partial-shade'], water: 'medium', spacing: R(50, 80), height: R(200, 600), root: 'shallow',
    timing: {},
    care: { pruning: t('Clip hedges in early summer; does not regrow from bare old wood.'), pests: t('Browsed by deer in winter.') },
  }),
  woody('viburnum-opulus', 'Viburnum opulus', { en: ['Guelder rose', 'European cranberrybush'], fi: ['Koiranheisi', 'Lumipalloheisi'] }, 'Adoxaceae', {
    category: 'shrub', tags: ['shrub', 'wildlife', 'nordic', 'moist-soil'], sun: ['full-sun', 'partial-shade'], water: 'medium', spacing: R(150, 250), height: R(200, 400), root: 'medium',
    timing: { flowering: LF(4, 8) },
    care: { pests: t('Viburnum beetle can strip the leaves in early summer.'), harvesting: t('Raw berries are mildly toxic; birds eat them in late winter.') },
  }),
  woody('cotoneaster-lucidus', 'Cotoneaster lucidus', { en: ['Shiny cotoneaster', 'Hedge cotoneaster'], fi: ['Kiiltotuhkapensas', 'Tuhkapensas'] }, 'Rosaceae', {
    category: 'shrub', tags: ['shrub', 'hedging', 'autumn-colour'], sun: ['full-sun', 'partial-shade'], water: 'low', spacing: R(30, 50), height: R(100, 200), root: 'medium',
    timing: {},
    care: { pruning: t('Clip hedges once or twice a summer; a classic hedge plant in Finland.') },
  }),
  woody('pinus-mugo', 'Pinus mugo', { en: ['Mountain pine', 'Mugo pine'], fi: ['Vuorimänty'] }, 'Pinaceae', {
    category: 'shrub', tags: ['shrub', 'evergreen', 'drought-tolerant', 'rock-garden'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy', 'well-drained'], spacing: R(100, 300), height: R(100, 400), root: 'deep',
    timing: {},
    care: { pruning: t('To keep it compact, snap the new "candles" in half in early summer.') },
  }),
  // --- Trees ----------------------------------------------------------------
  woody('prunus-padus', 'Prunus padus', { en: ['Bird cherry'], fi: ['Tuomi'] }, 'Rosaceae', {
    category: 'tree', tags: ['tree', 'fragrant', 'nordic', 'wildlife'], spacing: R(400, 800), height: R(600, 1200), root: 'deep',
    timing: { flowering: LF(2, 5) },
    care: { pests: t('Bird cherry ermine moth webs over the tree in some years; the tree recovers.') },
  }),
  woody('tilia-cordata', 'Tilia cordata', { en: ['Small-leaved lime', 'Linden'], fi: ['Metsälehmus', 'Lehmus'] }, 'Malvaceae', {
    category: 'tree', tags: ['tree', 'pollinators', 'fragrant', 'long-lived'], spacing: R(800, 1500), height: R(1500, 2500), root: 'deep',
    timing: { flowering: LF(8, 11) },
    care: { pruning: t('Tolerates hard pruning and pleaching; honeydew from aphids drips below in summer.') },
  }),
  woody('quercus-robur', 'Quercus robur', { en: ['English oak', 'Pedunculate oak'], fi: ['Metsätammi', 'Tammi'] }, 'Fagaceae', {
    category: 'tree', tags: ['tree', 'wildlife', 'long-lived'], sun: ['full-sun'], sunHours: 6, spacing: R(800, 1500), height: R(1500, 3000), root: 'deep',
    timing: {},
    care: { winter: t('Hardy only in the southern half of Finland (zones I–IV).') },
  }),
  woody('pinus-sylvestris', 'Pinus sylvestris', { en: ['Scots pine'], fi: ['Mänty', 'Metsämänty'] }, 'Pinaceae', {
    category: 'tree', tags: ['tree', 'evergreen', 'nordic', 'drought-tolerant'], sun: ['full-sun'], sunHours: 6, water: 'low', soil: ['sandy'], spacing: R(500, 1000), height: R(1500, 3000), root: 'deep',
    timing: {},
  }),
  woody('picea-abies', 'Picea abies', { en: ['Norway spruce'], fi: ['Kuusi', 'Metsäkuusi'] }, 'Pinaceae', {
    category: 'tree', tags: ['tree', 'evergreen', 'nordic', 'hedging', 'shade-tolerant'], water: 'medium', spacing: R(400, 800), height: R(1500, 4000), root: 'shallow',
    timing: {},
    care: { pruning: t('Makes a dense clipped hedge (planted 60–80 cm apart) if cut every summer.') },
  }),
  woody('larix-sibirica', 'Larix sibirica', { en: ['Siberian larch'], fi: ['Siperianlehtikuusi'] }, 'Pinaceae', {
    category: 'tree', tags: ['tree', 'deciduous-conifer', 'autumn-colour'], sun: ['full-sun'], sunHours: 6, spacing: R(600, 1000), height: R(1500, 3000), root: 'deep',
    timing: {},
  }),
  woody('acer-tataricum-ginnala', 'Acer tataricum subsp. ginnala', { en: ['Amur maple'], fi: ['Mongolianvaahtera', 'Tataarivaahtera'] }, 'Sapindaceae', {
    category: 'tree', tags: ['tree', 'autumn-colour', 'hedging', 'small-tree'], sun: ['full-sun', 'partial-shade'], spacing: R(300, 500), height: R(300, 600), root: 'medium',
    timing: {},
    care: { pruning: t('Multi-stemmed small tree or large shrub; brilliant red autumn colour.') },
  }),
  woody('sorbus-intermedia', 'Sorbus intermedia', { en: ['Swedish whitebeam'], fi: ['Ruotsinpihlaja'] }, 'Rosaceae', {
    category: 'tree', tags: ['tree', 'wildlife', 'street-tree'], sun: ['full-sun', 'partial-shade'], water: 'low', spacing: R(500, 800), height: R(800, 1500), root: 'deep',
    timing: { flowering: LF(4, 7) },
  }),
  woody('malus-domestica-columnar', 'Malus domestica (columnar)', { en: ['Columnar apple'], fi: ['Pylväsomenapuu'] }, 'Rosaceae', {
    category: 'fruit-tree', edible: true, tags: ['fruit-tree', 'container', 'small-space'], sun: ['full-sun'], sunHours: 6, spacing: R(50, 80), height: R(200, 300), width: R(40, 60), root: 'medium', container: true,
    timing: { harvest: FIX('08-20', '10-15'), yearsToFirstHarvest: R(1, 3), flowering: LF(2, 5) },
    care: { pruning: t('Shorten side shoots to 2–3 buds in summer to keep the columnar shape.'), winter: CULTIVAR_HARDINESS, feeding: 'medium' },
    yield: { perPlantKg: R(2, 6), ...MATURE() },
  }),
];
