import { plant, R, LF, FF, t } from './_helpers.mjs';

// Annual, biennial and tender flowers commonly grown from seed or bought as
// bedding plants.

const DEADHEAD = t('Deadhead regularly to keep it flowering.');

/** Compact helper for bedding and cut flowers. */
function flower(id, scientific, common, family, o) {
  return plant(id, scientific, common, {
    family,
    category: 'flower',
    lifecycle: o.lifecycle ?? 'annual',
    edible: o.edible ?? false,
    tags: o.tags ?? ['annual-flower'],
    growing: { sun: o.sun ?? ['full-sun'], sunHoursMin: o.sunHours ?? 6, water: o.water ?? 'medium', frostTolerance: o.frost ?? 'tender', ...(o.soil ? { soil: o.soil } : {}) },
    planting: {
      methods: ['spaced'],
      inRowSpacingCm: o.spacing,
      rowSpacingCm: o.rows ?? o.spacing,
      ...(o.depth ? { seedDepthCm: o.depth } : {}),
      ...(o.germDays ? { germinationDays: o.germDays } : {}),
      ...(o.germTemp ? { germinationTempC: o.germTemp } : {}),
      containerSuitable: o.container ?? true,
      matureHeightCm: o.height,
      ...(o.width ? { matureWidthCm: o.width } : {}),
      ...(o.directSowing ? { directSowing: o.directSowing } : {}),
      ...(o.transplanting ? { transplanting: o.transplanting } : {}),
    },
    timing: o.timing,
    care: { ...(o.deadhead === false ? {} : { pruning: DEADHEAD }), ...(o.care ?? {}) },
    conf: o.conf ?? 'medium',
  });
}

export default [
  flower('antirrhinum-majus', 'Antirrhinum majus', { en: ['Snapdragon'], fi: ['Leijonankita'] }, 'Plantaginaceae', {
    tags: ['annual-flower', 'cut-flower', 'pollinators'], frost: 'half-hardy', spacing: R(20, 30), height: R(20, 90), depth: R(0, 0.2), germDays: R(7, 14),
    timing: { sowIndoors: LF(-10, -8), transplant: LF(-1, 2), flowering: LF(8, 18) },
    care: { support: t('Stake tall cut-flower types.') },
  }),
  flower('petunia-atkinsiana', 'Petunia × atkinsiana', { en: ['Petunia'], fi: ['Tarhapetunia', 'Petunia'] }, 'Solanaceae', {
    tags: ['annual-flower', 'bedding', 'container', 'hanging-basket'], spacing: R(20, 30), height: R(20, 40), depth: R(0, 0.1), germDays: R(7, 14), germTemp: R(20, 25),
    directSowing: t('Tiny seed that needs light: press onto the surface, do not cover.'),
    timing: { sowIndoors: LF(-12, -10), transplant: LF(1, 3), flowering: LF(4, 18) },
    care: { fertilizing: t('Feed weekly in containers; petunias are hungry.'), diseases: t('Grey mould in wet weather — choose rain-tolerant series for exposed spots.') },
  }),
  flower('pelargonium-hortorum', 'Pelargonium × hortorum', { en: ['Geranium (zonal pelargonium)', 'Pelargonium'], fi: ['Pelargoni', 'Vyöhykepelargoni'] }, 'Geraniaceae', {
    lifecycle: 'perennial', tags: ['bedding', 'container', 'tender-perennial'], water: 'low', spacing: R(25, 35), height: R(25, 50),
    transplanting: t('Usually bought as plants or grown from cuttings taken in late summer.'),
    timing: { plantOut: LF(2, 4), flowering: LF(2, 20) },
    care: { winter: t('Overwinter indoors in a cool (8–12 °C), bright room with little water; cut back in late winter.') },
  }),
  flower('lobelia-erinus', 'Lobelia erinus', { en: ['Edging lobelia', 'Trailing lobelia'], fi: ['Kesälobelia', 'Lobelia'] }, 'Campanulaceae', {
    tags: ['annual-flower', 'bedding', 'container', 'hanging-basket', 'edging'], frost: 'half-hardy', sun: ['full-sun', 'partial-shade'], sunHours: 4, spacing: R(10, 15), height: R(10, 20), depth: R(0, 0.1), germDays: R(10, 21), deadhead: false,
    directSowing: t('Sow a pinch of seed per cell on the surface and grow on as a clump.'),
    timing: { sowIndoors: LF(-12, -10), transplant: LF(1, 3), flowering: LF(4, 16) },
    care: { pruning: t('Shear back by half if it stops flowering in midsummer.'), watering: t('Never let containers dry out.') },
  }),
  flower('begonia-semperflorens', 'Begonia Semperflorens-Cultorum Group', { en: ['Wax begonia', 'Bedding begonia'], fi: ['Jääbegonia'] }, 'Begoniaceae', {
    tags: ['annual-flower', 'bedding', 'shade', 'container'], sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(15, 25), height: R(15, 30), deadhead: false,
    transplanting: t('Usually bought as plug plants; seed is dust-fine and slow.'),
    timing: { sowIndoors: LF(-14, -12), transplant: LF(2, 4), flowering: LF(4, 18) },
  }),
  flower('impatiens-walleriana', 'Impatiens walleriana', { en: ['Busy Lizzie', 'Impatiens'], fi: ['Liisanpalsami', 'Ahkeraliisa'] }, 'Balsaminaceae', {
    tags: ['annual-flower', 'bedding', 'shade', 'container'], sun: ['partial-shade', 'shade'], sunHours: 2, water: 'high', spacing: R(20, 30), height: R(15, 40), deadhead: false,
    timing: { sowIndoors: LF(-10, -8), transplant: LF(2, 4), flowering: LF(4, 18) },
    care: { diseases: t('Impatiens downy mildew kills plants quickly — New Guinea types are resistant.') },
  }),
  flower('tagetes-erecta', 'Tagetes erecta', { en: ['African marigold', 'Mexican marigold'], fi: ['Kookossamettikukka'] }, 'Asteraceae', {
    tags: ['annual-flower', 'companion', 'cut-flower'], spacing: R(30, 40), height: R(30, 90), depth: R(0.5, 1), germDays: R(4, 10),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(1, 3), flowering: LF(8, 18) },
  }),
  flower('tagetes-tenuifolia', 'Tagetes tenuifolia', { en: ['Signet marigold'], fi: ['Pikkusamettikukka'] }, 'Asteraceae', {
    edible: true, tags: ['annual-flower', 'edible-flowers', 'edging'], spacing: R(20, 30), height: R(20, 30), depth: R(0.5, 0.5), germDays: R(4, 10),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(1, 3), flowering: LF(6, 18) },
  }),
  flower('callistephus-chinensis', 'Callistephus chinensis', { en: ['China aster'], fi: ['Kesäasteri'] }, 'Asteraceae', {
    tags: ['annual-flower', 'cut-flower'], frost: 'half-hardy', spacing: R(20, 30), height: R(20, 80), depth: R(0.3, 0.5), germDays: R(7, 14),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(0, 2), flowering: LF(12, 20) },
    care: { diseases: t('Aster wilt — do not grow in the same spot two years running.') },
  }),
  flower('consolida-ajacis', 'Consolida ajacis', { en: ['Larkspur', 'Annual delphinium'], fi: ['Kesäritarinkannus'] }, 'Ranunculaceae', {
    tags: ['annual-flower', 'cut-flower', 'pollinators', 'toxic'], frost: 'hardy', spacing: R(20, 30), height: R(60, 120), depth: R(0.5, 1), germDays: R(10, 20), container: false,
    directSowing: t('Sow where it is to flower — dislikes transplanting. Seed germinates best cool.'),
    timing: { directSow: LF(-4, 0), flowering: LF(10, 16) },
    care: { support: t('Support with twiggy sticks.'), harvesting: t('All parts are poisonous.') },
  }),
  flower('nigella-damascena', 'Nigella damascena', { en: ['Love-in-a-mist'], fi: ['Neidonkukka'] }, 'Ranunculaceae', {
    tags: ['annual-flower', 'cut-flower', 'self-seeds', 'seed-heads'], frost: 'hardy', spacing: R(15, 20), height: R(30, 50), depth: R(0.5, 0.5), germDays: R(10, 15), deadhead: false,
    directSowing: t('Sow direct in spring or autumn; resents transplanting.'),
    timing: { directSow: LF(-4, 0), flowering: LF(8, 14) },
    care: { harvesting: t('Leave some seed pods for decoration and next year\'s self-sown plants.') },
  }),
  flower('eschscholzia-californica', 'Eschscholzia californica', { en: ['California poppy'], fi: ['Kaliforniankultaunikko'] }, 'Papaveraceae', {
    tags: ['annual-flower', 'drought-tolerant', 'self-seeds'], water: 'low', frost: 'hardy', soil: ['sandy', 'well-drained'], spacing: R(15, 20), height: R(20, 40), depth: R(0.2, 0.5), germDays: R(10, 20), container: true,
    directSowing: t('Sow direct in poor, sunny soil; taproot resents moving.'),
    timing: { directSow: LF(-3, 1), flowering: LF(8, 18) },
  }),
  flower('papaver-rhoeas', 'Papaver rhoeas', { en: ['Corn poppy', 'Field poppy'], fi: ['Peltounikko', 'Silkkiunikko'] }, 'Papaveraceae', {
    tags: ['annual-flower', 'wildflower', 'pollinators', 'self-seeds'], frost: 'hardy', spacing: R(15, 25), height: R(30, 70), depth: R(0, 0.1), germDays: R(10, 20), container: false,
    directSowing: t('Scatter on bare, disturbed soil in autumn or early spring; needs light to germinate.'),
    timing: { directSow: LF(-4, 0), flowering: LF(8, 14) },
  }),
  flower('ipomoea-purpurea', 'Ipomoea purpurea', { en: ['Morning glory'], fi: ['Purppurakierrokki'] }, 'Convolvulaceae', {
    tags: ['annual-flower', 'climber', 'toxic'], spacing: R(20, 30), height: R(150, 300), depth: R(1, 1.5), germDays: R(5, 14), germTemp: R(20, 25), deadhead: false,
    directSowing: t('Nick or soak the seed overnight before sowing.'),
    timing: { sowIndoors: LF(-4, -2), transplant: LF(2, 3), flowering: LF(8, 18) },
    care: { support: t('Twines up strings, netting or a fence.'), harvesting: t('Seeds are toxic.') },
  }),
  flower('cleome-hassleriana', 'Cleome hassleriana', { en: ['Spider flower', 'Cleome'], fi: ['Hämähäkinkukka', 'Hämähäkkikukka'] }, 'Cleomaceae', {
    tags: ['annual-flower', 'tall', 'pollinators'], spacing: R(40, 50), height: R(90, 150), depth: R(0.2, 0.5), germDays: R(10, 14), germTemp: R(20, 30), container: false,
    timing: { sowIndoors: LF(-8, -6), transplant: LF(2, 3), flowering: LF(10, 18) },
  }),
  flower('salvia-farinacea', 'Salvia farinacea', { en: ['Mealycup sage', 'Blue salvia'], fi: ['Jauhosalvia'] }, 'Lamiaceae', {
    tags: ['annual-flower', 'pollinators', 'cut-flower', 'tender-perennial'], spacing: R(25, 30), height: R(40, 60), depth: R(0.2, 0.2), germDays: R(10, 15),
    timing: { sowIndoors: LF(-10, -8), transplant: LF(2, 3), flowering: LF(8, 18) },
  }),
  flower('verbena-bonariensis', 'Verbena bonariensis', { en: ['Purpletop vervain', 'Tall verbena'], fi: ['Argentiinanrautayrtti'] }, 'Verbenaceae', {
    tags: ['annual-flower', 'pollinators', 'tall', 'self-seeds'], frost: 'half-hardy', water: 'low', spacing: R(30, 45), height: R(90, 180), depth: R(0, 0.2), germDays: R(14, 28), deadhead: false,
    directSowing: t('Chill the seed in the fridge for 1–2 weeks before sowing.'),
    timing: { sowIndoors: LF(-10, -8), transplant: LF(1, 3), flowering: LF(10, 20) },
  }),
  flower('ageratum-houstonianum', 'Ageratum houstonianum', { en: ['Floss flower', 'Ageratum'] }, 'Asteraceae', {
    tags: ['annual-flower', 'bedding', 'edging', 'pollinators'], spacing: R(15, 25), height: R(15, 60), depth: R(0, 0.1), germDays: R(7, 10),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(2, 3), flowering: LF(6, 18) },
  }),
  flower('dahlia-hortensis', 'Dahlia × hortensis', { en: ['Dahlia'], fi: ['Daalia', 'Jalodaalia'] }, 'Asteraceae', {
    lifecycle: 'perennial', tags: ['cut-flower', 'tuber', 'tender-perennial', 'pollinators'], water: 'medium', soil: ['compost-rich'], spacing: R(45, 90), height: R(30, 150), container: true,
    transplanting: t('Start tubers in pots indoors 4–6 weeks before the last frost; plant out when frost is over.'),
    timing: { plantOut: LF(1, 3), flowering: LF(10, 20) },
    care: {
      support: t('Stake tall varieties at planting time.'),
      winter: t('Lift tubers after the first frost blackens the foliage; dry and store frost-free at 4–8 °C.'),
      pests: t('Slugs on young shoots, earwigs in flowers.'),
    },
  }),
  flower('gladiolus-hortulanus', 'Gladiolus × hortulanus', { en: ['Gladiolus'], fi: ['Miekkalilja', 'Gladiolus'] }, 'Iridaceae', {
    lifecycle: 'perennial', tags: ['cut-flower', 'corm', 'tender-perennial'], spacing: R(10, 15), rows: R(30, 45), height: R(60, 150), container: false, deadhead: false,
    transplanting: t('Plant corms 10–15 cm deep; plant in batches two weeks apart for a longer season.'),
    timing: { plantOut: LF(0, 6), flowering: LF(10, 18) },
    care: { support: t('Stake in windy places.'), winter: t('Lift corms in autumn, dry and store frost-free.') },
  }),
  flower('matthiola-incana', 'Matthiola incana', { en: ['Stock', 'Gillyflower'], fi: ['Kesäleukoija'] }, 'Brassicaceae', {
    tags: ['annual-flower', 'cut-flower', 'fragrant'], frost: 'half-hardy', spacing: R(20, 30), height: R(30, 80), depth: R(0.2, 0.5), germDays: R(7, 14),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(-1, 1), flowering: LF(8, 14) },
  }),
  flower('matthiola-longipetala', 'Matthiola longipetala', { en: ['Night-scented stock'], fi: ['Iltaleukoija'] }, 'Brassicaceae', {
    tags: ['annual-flower', 'fragrant', 'evening-scent'], frost: 'hardy', spacing: R(10, 15), height: R(20, 40), depth: R(0.2, 0.5), germDays: R(7, 14), deadhead: false,
    directSowing: t('Sow direct near a path or window; plain by day, strongly scented in the evening.'),
    timing: { directSow: LF(-2, 6), flowering: LF(8, 16) },
  }),
  flower('dianthus-barbatus', 'Dianthus barbatus', { en: ["Sweet William"], fi: ['Harjaneilikka'] }, 'Caryophyllaceae', {
    lifecycle: 'biennial', tags: ['biennial', 'cut-flower', 'fragrant', 'pollinators'], frost: 'hardy', spacing: R(20, 30), height: R(30, 60), depth: R(0.5, 0.5), germDays: R(7, 14),
    directSowing: t('Sow in early summer for flowers the following year.'),
    timing: { directSow: LF(4, 8), flowering: LF(54, 60) },
  }),
  flower('viola-wittrockiana', 'Viola × wittrockiana', { en: ['Pansy', 'Garden pansy'], fi: ['Tarhaorvokki'] }, 'Violaceae', {
    lifecycle: 'biennial', edible: true, tags: ['bedding', 'edible-flowers', 'container', 'early'], frost: 'hardy', sun: ['full-sun', 'partial-shade'], sunHours: 4, spacing: R(15, 20), height: R(15, 25), depth: R(0.3, 0.5), germDays: R(10, 20), germTemp: R(15, 20),
    timing: { sowIndoors: LF(-12, -10), transplant: LF(-4, -1), flowering: LF(-2, 12) },
  }),
  flower('viola-cornuta', 'Viola cornuta', { en: ['Horned violet', 'Viola'], fi: ['Sarviorvokki'] }, 'Violaceae', {
    lifecycle: 'perennial', edible: true, tags: ['bedding', 'edible-flowers', 'container', 'edging'], frost: 'hardy', sun: ['full-sun', 'partial-shade'], sunHours: 4, spacing: R(15, 20), height: R(10, 20), depth: R(0.3, 0.5), germDays: R(10, 20),
    timing: { sowIndoors: LF(-12, -10), transplant: LF(-3, 0), flowering: LF(-1, 16) },
  }),
  flower('myosotis-sylvatica', 'Myosotis sylvatica', { en: ['Forget-me-not'], fi: ['Metsälemmikki', 'Lemmikki'] }, 'Boraginaceae', {
    lifecycle: 'biennial', tags: ['biennial', 'spring', 'self-seeds', 'shade'], frost: 'hardy', sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(15, 20), height: R(15, 30), depth: R(0.3, 0.5), germDays: R(8, 14), deadhead: false,
    directSowing: t('Sow in early summer for flowers next spring; self-seeds freely afterwards.'),
    timing: { directSow: LF(4, 10), flowering: LF(-2, 4) },
  }),
  flower('digitalis-purpurea', 'Digitalis purpurea', { en: ['Foxglove'], fi: ['Rohtosormustinkukka', 'Sormustinkukka'] }, 'Plantaginaceae', {
    lifecycle: 'biennial', tags: ['biennial', 'pollinators', 'tall', 'shade', 'toxic', 'self-seeds'], frost: 'hardy', sun: ['partial-shade', 'full-sun'], sunHours: 3, spacing: R(30, 45), height: R(90, 150), depth: R(0, 0.1), germDays: R(14, 21), container: false, deadhead: false,
    directSowing: t('Sow on the surface in early summer; flowers the following year.'),
    timing: { sowIndoors: LF(2, 6), transplant: LF(8, 12), flowering: LF(56, 62) },
    care: { harvesting: t('All parts are highly poisonous — keep away from children and pets.') },
  }),
  flower('alcea-rosea', 'Alcea rosea', { en: ['Hollyhock'], fi: ['Salkoruusu'] }, 'Malvaceae', {
    lifecycle: 'biennial', tags: ['biennial', 'tall', 'pollinators', 'cottage'], frost: 'hardy', spacing: R(45, 60), height: R(150, 250), depth: R(0.5, 1), germDays: R(10, 14), container: false, deadhead: false,
    timing: { directSow: LF(2, 8), flowering: LF(58, 66) },
    care: { support: t('Stake in exposed gardens; grows best against a sunny wall.'), diseases: t('Hollyhock rust — remove spotted leaves.') },
  }),
  flower('xerochrysum-bracteatum', 'Xerochrysum bracteatum', { en: ['Strawflower', 'Everlasting daisy'], fi: ['Olkikukka'] }, 'Asteraceae', {
    tags: ['annual-flower', 'dried-flower', 'cut-flower'], water: 'low', spacing: R(25, 30), height: R(40, 100), depth: R(0, 0.1), germDays: R(7, 10),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(1, 2), flowering: LF(10, 18) },
    care: { harvesting: t('For drying, cut when the outer bracts are open and the centre is still closed; hang upside down.') },
  }),
  flower('limonium-sinuatum', 'Limonium sinuatum', { en: ['Statice', 'Sea lavender'], fi: ['Rikkalimonium', 'Limonium'] }, 'Plumbaginaceae', {
    tags: ['annual-flower', 'dried-flower', 'cut-flower'], water: 'low', frost: 'half-hardy', spacing: R(25, 30), height: R(40, 60), depth: R(0.2, 0.3), germDays: R(10, 20), deadhead: false,
    timing: { sowIndoors: LF(-10, -8), transplant: LF(0, 2), flowering: LF(10, 18) },
  }),
  flower('scabiosa-atropurpurea', 'Scabiosa atropurpurea', { en: ['Sweet scabious', 'Pincushion flower'] }, 'Caprifoliaceae', {
    tags: ['annual-flower', 'cut-flower', 'pollinators'], frost: 'half-hardy', spacing: R(25, 30), height: R(60, 90), depth: R(0.5, 1), germDays: R(10, 14),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(0, 2), flowering: LF(10, 18) },
  }),
  flower('phlox-drummondii', 'Phlox drummondii', { en: ['Annual phlox'], fi: ['Kesäleimu'] }, 'Polemoniaceae', {
    tags: ['annual-flower', 'bedding', 'fragrant'], frost: 'half-hardy', spacing: R(15, 25), height: R(15, 45), depth: R(0.3, 0.5), germDays: R(10, 20),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(0, 2), flowering: LF(8, 16) },
  }),
  flower('gazania-rigens', 'Gazania rigens', { en: ['Gazania', 'Treasure flower'], fi: ['Gatsania'] }, 'Asteraceae', {
    tags: ['annual-flower', 'drought-tolerant', 'container'], water: 'low', sunHours: 7, soil: ['sandy', 'well-drained'], spacing: R(20, 30), height: R(15, 30), depth: R(0.3, 0.5), germDays: R(7, 14), germTemp: R(20, 25),
    timing: { sowIndoors: LF(-10, -8), transplant: LF(2, 3), flowering: LF(6, 18) },
    care: { watering: t('Flowers open only in sun.') },
  }),
  flower('portulaca-grandiflora', 'Portulaca grandiflora', { en: ['Moss rose', 'Rose moss'], fi: ['Kesäportulakka', 'Loistoportulakka'] }, 'Portulacaceae', {
    tags: ['annual-flower', 'drought-tolerant', 'container', 'groundcover'], water: 'low', sunHours: 7, soil: ['sandy', 'well-drained'], spacing: R(15, 20), height: R(10, 20), depth: R(0, 0.1), germDays: R(7, 14), germTemp: R(20, 30), deadhead: false,
    timing: { sowIndoors: LF(-8, -6), transplant: LF(2, 4), flowering: LF(6, 16) },
  }),
  flower('celosia-argentea', 'Celosia argentea', { en: ['Celosia', 'Cockscomb'], fi: ['Kukonharja'] }, 'Amaranthaceae', {
    tags: ['annual-flower', 'cut-flower', 'dried-flower', 'heat-loving'], sunHours: 7, spacing: R(20, 30), height: R(20, 90), depth: R(0.2, 0.3), germDays: R(7, 14), germTemp: R(21, 27), deadhead: false,
    timing: { sowIndoors: LF(-8, -6), transplant: LF(2, 4), flowering: LF(10, 18) },
  }),
  flower('amaranthus-caudatus', 'Amaranthus caudatus', { en: ['Love-lies-bleeding'], fi: ['Riipparevonhäntä'] }, 'Amaranthaceae', {
    edible: true, tags: ['annual-flower', 'cut-flower', 'dried-flower', 'tall'], spacing: R(45, 60), height: R(90, 150), depth: R(0.3, 0.5), germDays: R(7, 14), germTemp: R(20, 25), deadhead: false, container: false,
    timing: { sowIndoors: LF(-6, -4), transplant: LF(2, 3), flowering: LF(10, 18) },
  }),
  flower('rudbeckia-hirta', 'Rudbeckia hirta', { en: ['Black-eyed Susan', 'Gloriosa daisy'], fi: ['Kesäpäivänhattu'] }, 'Asteraceae', {
    lifecycle: 'biennial', tags: ['annual-flower', 'cut-flower', 'pollinators'], frost: 'hardy', spacing: R(30, 45), height: R(30, 90), depth: R(0, 0.2), germDays: R(7, 21),
    timing: { sowIndoors: LF(-8, -6), transplant: LF(0, 2), flowering: LF(10, 18) },
  }),
  flower('tithonia-rotundifolia', 'Tithonia rotundifolia', { en: ['Mexican sunflower'], fi: ['Meksikonauringonkukka', 'Titonia'] }, 'Asteraceae', {
    tags: ['annual-flower', 'pollinators', 'tall', 'heat-loving'], sunHours: 7, spacing: R(45, 60), height: R(90, 180), depth: R(0.5, 1), germDays: R(5, 10), container: false,
    timing: { sowIndoors: LF(-6, -4), transplant: LF(2, 3), flowering: LF(10, 18) },
  }),
  flower('fuchsia-hybrida', 'Fuchsia × hybrida', { en: ['Fuchsia'], fi: ['Verenpisara', 'Fuksia'] }, 'Onagraceae', {
    lifecycle: 'perennial', tags: ['container', 'hanging-basket', 'shade', 'tender-perennial'], sun: ['partial-shade'], sunHours: 3, water: 'high', spacing: R(30, 45), height: R(30, 90),
    transplanting: t('Bought as plants or grown from cuttings.'),
    timing: { plantOut: LF(2, 4), flowering: LF(4, 20) },
    care: { winter: t('Overwinter in a cool (5–10 °C), fairly dark place, barely moist; prune hard in spring.') },
  }),
  flower('cosmos-sulphureus', 'Cosmos sulphureus', { en: ['Sulphur cosmos', 'Yellow cosmos'] }, 'Asteraceae', {
    tags: ['annual-flower', 'pollinators', 'cut-flower', 'heat-loving'], water: 'low', spacing: R(25, 40), height: R(40, 90), depth: R(0.5, 1), germDays: R(5, 10),
    timing: { sowIndoors: LF(-6, -4), transplant: LF(2, 3), flowering: LF(8, 18) },
  }),
  flower('helichrysum-petiolare', 'Helichrysum petiolare', { en: ['Licorice plant'] }, 'Asteraceae', {
    lifecycle: 'perennial', tags: ['container', 'foliage', 'hanging-basket', 'tender-perennial'], water: 'low', spacing: R(30, 45), height: R(20, 50), width: R(60, 90), deadhead: false,
    transplanting: t('Bought as plants; grown for its silver foliage.'),
    timing: { plantOut: LF(2, 3) },
  }),
];
