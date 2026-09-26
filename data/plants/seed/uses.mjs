import { t } from './_helpers.mjs';

/**
 * How plants are used: food and drink, traditional medicinal use, other uses,
 * preserving, and cautions. Applied by scripts/build-plant-data.mjs.
 *
 * Summarised in our own words with the Yrttitarha herb database
 * (yrttitarha.fi) as the reference; no source text is reproduced. Medicinal
 * notes describe traditional use only: no doses, no claims of cure. Every
 * plant with known risks has a `warn` (safety) note.
 *
 *   u(parts, { food, med, other, keep, warn }, tags?)
 *   each text is [english, finnish]
 */
const u = (parts, texts, tags = []) => {
  const key = { food: 'culinary', med: 'medicinal', other: 'other', keep: 'preserving', warn: 'safety' };
  const out = { parts, tags };
  for (const [k, [en, fi]] of Object.entries(texts)) out[key[k]] = t(en, fi);
  return out;
};

const NOT_PREGNANT = [
  'Not for use during pregnancy or breastfeeding.',
  'Ei raskauden eikä imetyksen aikana.',
];
const both = (a, b) => [`${a[0]} ${b[0]}`, `${a[1]} ${b[1]}`];

export const USES = {
  // --- Batch 1 -------------------------------------------------------------
  'artemisia-abrotanum': u(['leaves', 'shoots'], {
    food: ['Bitter; occasionally used in small amounts with fatty meat or to flavour spirits, but not recommended as a food herb.', 'Karvas; käytetty joskus pieninä määrinä rasvaisen lihan tai viinan mausteena, mutta ei suositeltava ruokayrtti.'],
    med: ['Shoot tips were traditionally used to aid digestion and bile flow, and externally as an antiseptic wash.', 'Versojen latvoja on perinteisesti käytetty ruoansulatuksen ja sapen erityksen tueksi sekä ulkoisesti antiseptisenä hauteena.'],
    other: ['Strong scent repels insects: scatter sprigs in the garden or make a steeped spray. The stems give a yellow plant dye; dried sprigs keep moths out of wardrobes.', 'Voimakas tuoksu karkottaa hyönteisiä: ripottele oksia viljelyksille tai tee niistä haudutettu ruiskute. Varsista saa keltaista kasviväriä; kuivatut oksat pitävät koit poissa vaatekaapista.'],
    warn: ['Contains thujone and other toxic compounds; avoid internal use.', 'Sisältää tujonia ja muita myrkyllisiä yhdisteitä; vältä sisäistä käyttöä.'],
  }, ['medicinal', 'toxic']),
  'fragaria-vesca': u(['leaves', 'fruit', 'roots'], {
    food: ['Berries are best fresh and freeze well. Young leaves suit salads; leaves picked in early summer make a good base for herbal tea, especially fermented with rosebay willowherb, raspberry and blackcurrant leaves.', 'Marjat ovat parhaita tuoreina ja säilyvät hyvin pakastettuina. Nuoret lehdet sopivat salaatteihin; alkukesällä poimitut lehdet ovat hyvä yrttiteen pohja etenkin hiostettuina maitohorsman, vadelman ja mustaherukan lehtien kanssa.'],
    med: ['Leaf tea has a long folk use for gout and as a mild diuretic; the tannin-rich rhizome was used against diarrhoea and as a mouthwash.', 'Lehtiteetä on käytetty kansanlääkinnässä kihtiin ja lievästi virtsaneritystä lisäävänä; parkkiainepitoista juurakkoa ripuliin ja suun hoitoon.'],
    keep: ['Dry the leaves in the shade; freeze berries quickly to keep their aroma.', 'Kuivaa lehdet varjossa; pakasta marjat nopeasti, jotta aromi säilyy.'],
    warn: ['Leaf tea is not recommended during pregnancy. The berries can cause allergic reactions, especially in children.', 'Lehtiteetä ei suositella raskauden aikana. Marjat voivat aiheuttaa etenkin lapsille yliherkkyysoireita.'],
  }, ['tea']),
  'prunella-vulgaris': u(['leaves', 'flowers', 'whole-plant'], {
    food: ['Young leaves can be added sparingly to salads, soups and stews.', 'Nuoria lehtiä voi lisätä pieninä määrinä salaatteihin, keittoihin ja muhennoksiin.'],
    med: ['Traditionally a gargle for sore throat and mouth inflammation, and crushed leaves for small wounds (hence "self-heal"); astringent.', 'Perinteisesti kurlausvetenä kurkkukipuun ja suun tulehduksiin sekä murskattuina lehtinä pieniin haavoihin (englanniksi "self-heal"); supistava.'],
    keep: ['Cut the flowering plant at full bloom and dry it.', 'Leikkaa kukkiva kasvi täydessä kukassa ja kuivaa.'],
    warn: ['Use in moderation; large amounts are not advised.', 'Käytä kohtuudella; suuria määriä ei suositella.'],
  }, ['medicinal', 'tea']),
  'nepeta-cataria': u(['leaves', 'flowers'], {
    food: ['Leaves can be rubbed onto meat as a seasoning; makes a mild minty tea.', 'Lehdillä voi hieroa lihaa maustamiseen; lehdistä saa mietoa minttumaista teetä.'],
    med: ['Flowering shoots were used for wind, cramps and colds; nowadays little used.', 'Kukkivia versoja on käytetty ilmavaivoihin, kouristuksiin ja vilustumiseen; nykyään käyttö on vähäistä.'],
    other: ['Cats love it: dried leaves sewn into a cloth make a cat toy.', 'Kissat rakastavat sitä: kankaaseen ommellut kuivatut lehdet ovat kissan lelu.'],
  }, ['medicinal', 'tea']),
  'dracocephalum-moldavica': u(['leaves', 'flowers'], {
    food: ['An excellent tea herb, fresh or dried, with a lemon-balm-like aroma. Leaves and flowers flavour soft drinks, fish dishes and salads.', 'Erinomainen teeyrtti tuoreena ja kuivattuna, aromiltaan sitruunamelissan kaltainen. Lehdet ja kukat sopivat virvoitusjuomiin, kalaruokiin ja salaatteihin.'],
    med: ['Traditionally a calming, digestive tea that eases wind and cramps; used as a substitute for lemon balm.', 'Perinteisesti rauhoittava ja ruoansulatusta edistävä tee, joka lievittää ilmavaivoja ja kouristuksia; käytetty sitruunamelissan korvikkeena.'],
    other: ['Used in perfumery.', 'Käytetään hajusteena.'],
    keep: ['Dry at 35–40 °C.', 'Kuivaa 35–40 °C:ssa.'],
  }, ['tea']),
  'agastache-foeniculum': u(['leaves', 'flowers'], {
    food: ['Anise-mint flavour for desserts, cakes and biscuits, salads, soups and vegetable dishes (carrot, potato, cabbage). Makes an excellent tea; flowers and small leaves decorate dishes and flavour apple sauce or gooseberry jam.', 'Anismintun makuinen mauste jälkiruokiin, kakkuihin ja pikkuleipiin, salaatteihin, keittoihin ja kasvisruokiin (porkkana, peruna, kaalit). Erinomainen teeyrtti; kukat ja pienet lehdet koristeeksi sekä omenasoseen tai karviaishillon mausteeksi.'],
    keep: ['Freeze, dry, or preserve in vinegar or oil.', 'Pakasta, kuivaa tai säilö etikkaan tai öljyyn.'],
  }, ['tea']),
  'pimpinella-anisum': u(['seeds', 'leaves', 'roots'], {
    food: ['Liquorice-flavoured seeds for bread and pastries, pickles and sauerkraut, and aniseed spirits; green shoots for salads, soft cheese and tea; roots in soups and stews.', 'Lakritsimaiset siemenet leivonnaisiin, etikkasäilykkeisiin ja hapankaaliin sekä anisviinoihin; vihreät versot salaatteihin, tuorejuustoihin ja teeksi; juuret keittoihin ja pataruokiin.'],
    med: ['One of the oldest remedies: seed tea for wind, digestive cramps and coughs; loosens mucus.', 'Vanhimpia rohtoja: siemenistä haudutettu tee ilmavaivoihin, vatsan kouristuksiin ja yskään; irrottaa limaa.'],
    warn: ['The seeds are safe in normal use, but the essential oil is toxic in larger amounts and must not be taken internally.', 'Siemenet ovat normaalissa käytössä turvallisia, mutta eteerinen öljy on suurina annoksina myrkyllistä eikä sitä saa nauttia sisäisesti.'],
  }, ['seed-spice']),
  'arnica-montana': u(['flowers', 'roots'], {
    med: ['A classic external remedy: flower preparations on unbroken skin for bruises, sprains, swelling and muscle aches.', 'Perinteinen ulkoinen rohto: kukista tehdyt valmisteet ehjälle iholle mustelmiin, nyrjähdyksiin, turvotukseen ja lihassärkyyn.'],
    keep: ['Dry the flower heads below 40 °C.', 'Kuivaa mykeröt alle 40 °C:ssa.'],
    warn: ['Poisonous if eaten — external use only, and never on broken skin. Can cause contact allergy.', 'Myrkyllinen sisäisesti nautittuna — vain ulkoiseen käyttöön eikä rikkinäiselle iholle. Voi aiheuttaa kosketusallergiaa.'],
  }),
  'echinacea-purpurea': u(['flowers', 'leaves', 'roots'], {
    med: ['Flowering tops and roots are used in herbal preparations for colds and respiratory infections; traditionally also externally for slow-healing wounds and insect bites.', 'Kukkivia versoja ja juuria käytetään rohdosvalmisteissa vilustumiseen ja hengitystieinfektioihin; perinteisesti myös ulkoisesti huonosti paraneviin haavoihin ja hyönteisten pistoihin.'],
    keep: ['Harvest tops in flower; lift roots early in spring or late in autumn and dry them.', 'Korjaa versot kukinnan aikaan; nosta juuret aikaisin keväällä tai myöhään syksyllä ja kuivaa.'],
    warn: ['Not for people with autoimmune or progressive systemic diseases; may cause allergy in people sensitive to daisy-family plants.', 'Ei autoimmuuni- tai eteneviä järjestelmäsairauksia sairastaville; voi aiheuttaa allergiaa asterikasveille herkille.'],
  }, ['medicinal']),
  'ocimum-basilicum': u(['leaves', 'flowers', 'seeds'], {
    food: ['Mild, generous flavour: tomato dishes, garlic, salads, bean, pea, potato, mushroom, fish and meat dishes, and baking. Soaked seeds thicken drinks; sprigs flavour vinegar and oil.', 'Pehmeä, muille mausteille tilaa antava maku: tomaattiruoat, valkosipuli, salaatit, papu-, herne-, peruna-, sieni-, kala- ja liharuoat sekä leivonta. Turvonneet siemenet sakeuttavat juomia; oksat maustavat etikan ja öljyn.'],
    med: ['A digestive and relaxing tea; the essential oil is antiseptic.', 'Ruoansulatusta edistävä ja rentouttava tee; eteerinen öljy on antiseptinen.'],
    other: ['Grown on balconies and by doors to keep flies away; the oil is used in soap and perfume.', 'Parvekkeella ja ovensuussa karkottaa kärpäsiä; öljyä käytetään saippuoissa ja hajuvesissä.'],
    keep: ['Best fresh or frozen as pesto; loses much aroma when dried.', 'Paras tuoreena tai pestona pakastettuna; kuivattuna menettää paljon aromistaan.'],
  }),
  'petasites-hybridus': u(['leaves', 'roots'], {
    med: ['The rhizome and leaves were traditionally used for cramping pains, headache and asthma, and leaves on wounds. Modern extracts are made alkaloid-free.', 'Juurakkoa ja lehtiä on perinteisesti käytetty kouristuskipuihin, päänsärkyyn ja astmaan sekä lehtiä haavoille. Nykyiset uutteet valmistetaan alkaloideista puhdistettuina.'],
    warn: ['Contains pyrrolizidine alkaloids that damage the liver; do not make home remedies from it.', 'Sisältää maksalle haitallisia pyrrolitsidiinialkaloideja; älä valmista siitä kotikonsteja.'],
  }),
  'picea-abies': u(['shoots', 'needles', 'resin'], {
    food: ['Spruce tips (young shoots) are rich in vitamin C: eat fresh, add to salads, make syrup, tea or beer. Use or freeze at once; brew without boiling.', 'Kuusenkerkät ovat C-vitamiinipitoisia: syö tuoreina, lisää salaattiin, tee siirappia, teetä tai olutta. Käytä tai pakasta heti; hauduta keittämättä.'],
    med: ['Tip syrup and needle steam are traditional cough remedies; a needle decoction was added to the bath, and resin salve used on skin sores.', 'Kerkkäsiirappi ja havuhöyry ovat perinteisiä yskänrohtoja; havukeitettä lisättiin kylpyveteen ja pihkasalvaa käytettiin iho-ongelmiin.'],
    other: ['Timber, pulp and musical instruments; roots for basketry; resin for turpentine and incense.', 'Saha- ja kuitupuu sekä soittimet; juuret punontaan; pihkasta tärpättiä ja suitsukkeita.'],
    warn: ['Picking tips and branches from someone else’s forest needs the landowner’s permission in Finland.', 'Kerkkien ja havujen keräämiseen toisen metsästä tarvitaan maanomistajan lupa.'],
  }, ['wild-harvest']),
  'foeniculum-vulgare': u(['seeds', 'leaves'], {
    food: ['Seeds, whole or ground, for bread, biscuits, cakes, sweets, fish, pork, poultry, marinades and preserves; seeds and leaves for egg, cheese, cabbage and swede dishes. Leaves chopped with dill go well with fish.', 'Siemenet kokonaisina tai jauhettuina leipiin, kekseihin, kakkuihin, makeisiin, kalaan, sian- ja siipikarjanlihaan, marinadeihin ja säilykkeisiin; siemenet ja lehdet muna-, juusto-, kaali- ja lanttuoriin. Lehtisilppu tillin kanssa sopii kalalle.'],
    med: ['Seed tea is a traditional remedy for wind, bloating and cramps, and to loosen coughs.', 'Siemenistä haudutettu tee on perinteinen rohto ilmavaivoihin, turvotukseen ja kouristuksiin sekä limaa irrottamaan.'],
    warn: ['Not for continuous use; the essential oil must not be taken internally. Fennel water is no longer recommended for babies.', 'Ei jatkuvaan käyttöön; eteeristä öljyä ei saa nauttia sisäisesti. Fenkolivettä ei enää suositella vauvoille.'],
  }, ['seed-spice']),
  'populus-tremula': u(['buds', 'bark', 'leaves'], {
    med: ['Spring buds and young bark contain salicin-type compounds; traditionally used for fever and inflammation, and in Central Europe for bladder and prostate complaints.', 'Keväällä kerätyt silmut ja nuori kuori sisältävät salisiinin kaltaisia yhdisteitä; perinteisesti kuumeeseen ja tulehduksiin sekä Keski-Euroopassa rakko- ja eturauhasvaivoihin.'],
    other: ['Soft, easily worked wood: sauna benches, matches, dugout boats and utensils.', 'Pehmeä, helposti työstettävä puu: saunan lauteet, tulitikut, haapiot ja taloustavarat.'],
    warn: ['Not for people allergic to aspirin (salicylates).', 'Ei asetyylisalisyylihapolle (aspiriinille) yliherkille.'],
  }, ['medicinal']),
  'monarda-didyma': u(['leaves', 'flowers'], {
    food: ['An excellent tea herb, reminiscent of Earl Grey with an orange scent; leaves also flavour drinks, salads and meat. Flowers are edible.', 'Erinomainen teekasvi, joka muistuttaa Earl Grey -teetä ja tuoksuu appelsiinilta; lehdet maustavat myös juomia, salaatteja ja lihaa. Kukat ovat syötäviä.'],
    med: ['Tea or steam inhalation traditionally for coughs, bronchitis and a hoarse throat; thymol makes it mildly antiseptic.', 'Teenä tai höyryhengityksenä perinteisesti yskään, keuhkoputkentulehdukseen ja käheään kurkkuun; tymolin vuoksi lievästi antiseptinen.'],
    other: ['A good nectar plant for bees.', 'Hyvä mesikasvi mehiläisille.'],
  }, ['tea', 'edible-flowers']),
  'rumex-crispus': u(['leaves', 'seeds', 'roots'], {
    food: ['Young leaves raw in small amounts in salads, or cooked like spinach; rich in carotene and vitamin C. Ripe seeds can be ground into porridge or bread.', 'Nuoria lehtiä pieninä määrinä raakana salaatteihin tai keitettynä pinaatin tapaan; runsaasti karoteenia ja C-vitamiinia. Kypsät siemenet voi jauhaa puuroon tai leipään.'],
    med: ['The root was a traditional mild laxative and "blood cleanser" for liver and skin complaints; the astringent seeds for diarrhoea.', 'Juurta on käytetty perinteisesti miedosti ulostavana ja "verta puhdistavana" maksa- ja ihovaivoihin; supistavia siemeniä ripuliin.'],
    warn: ['Leaves contain oxalic acid — eat in moderation and avoid if prone to kidney stones. Large remedy doses cause nausea.', 'Lehdet sisältävät oksaalihappoa — syö kohtuudella ja vältä munuaiskivitaipumuksessa. Suuret rohtoannokset aiheuttavat pahoinvointia.'],
  }),

  // --- Batch 2 -------------------------------------------------------------
  'betula-pendula': u(['leaves', 'buds', 'sap', 'bark'], {
    food: ['Young leaves are rich in vitamin C (silver birch more than downy birch): add to salads, sandwiches and drinks, dry for herb powders and herb salt, or freeze chopped. Spring sap is a refreshing drink and can be used for juice, tea, baking and porridge.', 'Nuoret lehdet ovat C-vitamiinipitoisia (rauduskoivu enemmän kuin hieskoivu): salaatteihin, voileiville ja juomiin, kuivattuna viherjauheisiin ja yrttisuolaan tai silputtuna pakasteeksi. Kevään mahla on virkistävä juoma, ja sitä voi käyttää mehuihin, teehen, leivontaan ja puuroihin.'],
    med: ['Leaf tea is a mild, well-tolerated traditional diuretic for urinary-tract complaints, gout and rheumatism.', 'Lehtitee on mieto ja hyvin siedetty perinteinen virtsaneritystä lisäävä rohto virtsatievaivoihin, kihtiin ja reumaan.'],
    other: ['Leaf rinses for hair; bath whisks (vihta) of silver birch; bark (tuohi) for crafts; leaves dye yellow and green, bark greyish red.', 'Lehtihuuhde hiuksille; saunavihta rauduskoivusta; tuohi käsitöihin; lehdistä saa keltaista ja vihreää väriä, kuoresta harmaanpunertavaa.'],
    keep: ['Pick leaves for drying in early summer (around midsummer for dyeing) and dry quickly. Sap keeps only 2–5 days in the fridge — freeze it.', 'Kerää kuivattavat lehdet alkukesällä (värjäykseen juhannuksen aikaan) ja kuivaa nopeasti. Mahla säilyy jääkaapissa vain 2–5 vrk — pakasta se.'],
    warn: ['People with diabetes should be careful with large amounts of leaf tea. Tapping sap needs the landowner’s permission.', 'Diabeetikkojen kannattaa olla varovaisia runsaan lehtiteen kanssa. Mahlan juoksuttamiseen tarvitaan maanomistajan lupa.'],
  }, ['tea', 'medicinal']),
  'rubus-chamaemorus': u(['fruit', 'leaves'], {
    food: ['Fresh berries, jams, desserts, pastries and liqueurs. Very rich in vitamins A and C. Leaves make a herbal tea.', 'Tuoreina, hilloissa, jälkiruoissa, leivonnaisissa ja likööreissä. Erittäin runsaasti A- ja C-vitamiinia. Lehdistä saa yrttiteetä.'],
    med: ['Historically valued against scurvy; the sepals left after cleaning were used as a cough remedy.', 'Tunnettu keripukin ehkäisijä; perkauksesta jääviä verholehtiä on käytetty yskänrohtona.'],
    keep: ['Keeps in its own juice in the cold thanks to natural benzoic acid — chill immediately after picking.', 'Säilyy kylmässä omassa mehussaan luontaisen bentsoehapon ansiosta — jäähdytä heti poiminnan jälkeen.'],
  }),
  'humulus-lupulus': u(['shoots', 'flowers'], {
    food: ['Young spring shoots are eaten like asparagus or in salads. Female cones give beer its bitterness and aroma.', 'Nuoret kevätversot syödään parsan tapaan tai salaateissa. Emitähkät antavat oluelle katkeruuden ja aromin.'],
    med: ['Cones are a traditional mild sedative for sleeplessness and restlessness, as tea, in a bath or in a hop pillow; the bitter compounds stimulate appetite.', 'Tähkät ovat perinteinen mieto rauhoittava rohto unettomuuteen ja levottomuuteen teenä, kylvyssä tai humalatyynyssä; karvasaineet lisäävät ruokahalua.'],
    keep: ['Dry cones quickly in the shade and store airtight; they lose aroma in storage.', 'Kuivaa tähkät nopeasti varjossa ja säilytä ilmatiiviisti; ne menettävät aromiaan varastoinnissa.'],
    warn: ['May cause drowsiness; can irritate the skin of pickers.', 'Voi aiheuttaa uneliaisuutta; voi ärsyttää poimijan ihoa.'],
  }, ['tea']),
  'marrubium-vulgare': u(['leaves', 'flowers'], {
    food: ['Dried leaves have flavoured sweets, liqueurs and, in England, beer.', 'Kuivattuja lehtiä on käytetty makeisten, liköörien ja Englannissa oluen mausteena.'],
    med: ['An ancient cough remedy: tea from leaves and flowering tops loosens mucus and soothes coughing; the bitter marrubiin stimulates digestion and appetite.', 'Ikivanha yskänrohto: lehdistä ja kukkivista latvoista tehty tee irrottaa limaa ja lievittää yskää; karvasaine marrubiini edistää ruoansulatusta ja ruokahalua.'],
    keep: ['Cut at full flower and dry.', 'Korjaa täydessä kukassa ja kuivaa.'],
    warn: NOT_PREGNANT,
  }),
  'hyssopus-officinalis': u(['leaves', 'flowers'], {
    food: ['Peppery, slightly bitter and smoky: small amounts in stocks, sauces, game, liver and sausage dishes, stews, cabbage salads and bean, potato and beetroot dishes. Rub onto oily fish before frying. Fresh leaves are milder than dried; flowers decorate dishes and suit lemon drinks.', 'Pippurinen, hieman karvas ja savuinen: pieniä määriä keitinliemiin, kastikkeisiin, riista-, maksa- ja makkararuokiin, muhennoksiin, kaalisalaatteihin sekä papu-, peruna- ja punajuuriruokiin. Hiero rasvaisen kalan pintaan ennen paistamista. Tuore on miedompi kuin kuivattu; kukat koristeeksi ja sitruunajuomiin.'],
    med: ['Flowering tops were long an official remedy for persistent bronchitis and coughs; loosens mucus.', 'Kukkivat latvat olivat pitkään apteekkirohto sitkeään keuhkoputkentulehdukseen ja yskään; irrottaa limaa.'],
    other: ['A bee plant; said to deter cabbage white butterflies when grown near cabbages.', 'Mesikasvi; kaalien lähellä sen sanotaan karkottavan kaaliperhosia.'],
    warn: ['The essential oil can cause seizures in large amounts; not for people with epilepsy or during pregnancy.', 'Eteerinen öljy voi suurina määrinä aiheuttaa kouristuksia; ei epilepsiaa sairastaville eikä raskauden aikana.'],
  }, ['medicinal']),
  'cetraria-islandica': u(['whole-plant'], {
    food: ['Once a famine food: after removing the bitter acids by soaking in ash or soda water and brief boiling, it was dried and ground into flour for bread and porridge.', 'Entinen pula-ajan ruoka: kun kitkerät jäkälähapot oli poistettu liottamalla tuhka- tai soodavedessä ja keittämällä lyhyesti, se kuivattiin ja jauhettiin leipään ja puuroon.'],
    med: ['A traditional soothing remedy for dry coughs and sore throats, and a bitter tonic for poor appetite.', 'Perinteinen limakalvoja rauhoittava rohto kuivaan yskään ja kurkun ärsytykseen sekä ruokahalua lisäävä karvasrohto.'],
    other: ['Dyes wool a warm brownish yellow.', 'Värjää villan kauniin ruskeankeltaiseksi.'],
    warn: ['Raw lichen acids are harmful — always pre-treat. Lichens accumulate lead, cadmium and radioactive fallout; eat only occasionally and in small amounts. Large amounts cause diarrhoea.', 'Käsittelemättömät jäkälähapot ovat haitallisia — esikäsittele aina. Jäkälät keräävät lyijyä, kadmiumia ja radioaktiivista laskeumaa; käytä vain satunnaisesti ja vähän. Suuret määrät aiheuttavat ripulia.'],
  }),
  'inula-helenium': u(['roots'], {
    food: ['The root has flavoured sweets, wines and liqueurs; candied root was eaten as a sweet.', 'Juurta on käytetty makeisten, viinien ja liköörien mausteena; sokeroitua juurta syötiin makeisena.'],
    med: ['A traditional cough and chest remedy (decoction or tincture of the root); rich in inulin.', 'Perinteinen yskän- ja rintarohto (juurikeite tai -uute); runsaasti inuliinia.'],
    keep: ['Dry sliced roots at 40–60 °C and store airtight.', 'Kuivaa viipaloidut juuret 40–60 °C:ssa ja säilytä ilmatiiviisti.'],
    warn: ['Can cause skin allergy; not during pregnancy.', 'Voi aiheuttaa ihoallergiaa; ei raskauden aikana.'],
  }, ['medicinal']),
  'arctium-lappa': u(['roots', 'shoots', 'leaves', 'seeds'], {
    food: ['The root is a vegetable (gobo) cooked like scorzonera; young stalks are eaten raw in salads or cooked. All burdock species have edible roots.', 'Juuri on vihannes (gobo), jota käytetään mustajuuren tapaan; nuoria varsia syödään raakana salaatissa tai keitettynä. Kaikkien takiaislajien juuret ovat syötäviä.'],
    med: ['A traditional "blood-cleansing" root decoction for skin complaints, drunk or used as a wash; leaves as compresses on itchy rashes.', 'Perinteinen "verta puhdistava" juurikeite ihovaivoihin juotuna tai pesuna; lehdet kääreinä kutiseviin ihottumiin.'],
    other: ['Used in hair and skin care products; the burrs once carded wool.', 'Käytetään hius- ja ihonhoitotuotteissa; takiaisilla on karstattu villaa.'],
    keep: ['Slice roots and dry at about 40 °C (never above 70 °C).', 'Viipaloi juuret ja kuivaa noin 40 °C:ssa (ei yli 70 °C:ssa).'],
  }, ['medicinal']),
  'chenopodium-album': u(['leaves', 'shoots', 'seeds'], {
    food: ['Leaves raw in salads or cooked like spinach in stews, soups and omelettes; best in dairy dishes, where the calcium binds oxalic acid. Seeds were eaten as porridge.', 'Lehdet raakana salaateissa tai pinaatin tapaan muhennoksissa, keitoissa ja munakkaissa; parhaita maitoruoissa, joissa kalsium sitoo oksaalihapon. Siemeniä on syöty puurona.'],
    warn: ['High in oxalic acid — not for people with kidney disease. Seeds contain saponins; rinse well.', 'Runsaasti oksaalihappoa — ei munuaissairaille. Siemenissä on saponiineja; huuhtele hyvin.'],
  }),
  'elymus-repens': u(['rhizome'], {
    food: ['Dried, ground rhizomes were added to bread in hard times, roasted as a coffee substitute and used for syrup.', 'Kuivattuja, jauhettuja juurakoita lisättiin pula-aikoina leipään, paahdettiin kahvinkorvikkeeksi ja käytettiin siirapin valmistukseen.'],
    med: ['The rhizome was an official herbal diuretic for urinary-tract complaints, and a mild expectorant.', 'Juurakko oli apteekkirohto virtsaneritystä lisäävänä virtsatievaivoihin ja miedosti limaa irrottavana.'],
    other: ['Good fodder for livestock.', 'Hyvää karjanrehua.'],
    warn: ['Not for people who must limit potassium.', 'Ei henkilöille, joiden on rajoitettava kaliumia.'],
  }),
  'vaccinium-uliginosum': u(['fruit', 'leaves'], {
    food: ['Use like bilberries: fresh, frozen, in jams, purées and juices. Mixing with bilberries improves colour and flavour. Leaves and berries suit herbal tea blends.', 'Käytä mustikan tapaan: tuoreena, pakastettuna, hilloissa, soseissa ja mehuissa. Mustikan kanssa sekoitettuna väri ja maku paranevat. Lehdet ja marjat sopivat yrttijuomasekoituksiin.'],
    med: ['Like bilberries, the tannin-rich berries and leaf tea were used for stomach and bowel upsets.', 'Mustikan tapaan parkkiainepitoisia marjoja ja lehtiteetä on käytetty vatsa- ja suolistovaivoihin.'],
    other: ['The plant before flowering dyes moss green and brown.', 'Ennen kukintaa kerätystä kasvista saa sammaleenvihreää ja ruskeaa väriä.'],
    warn: ['Eating very large amounts has been linked to dizziness and nausea (possibly from a fungus on the berries).', 'Hyvin suurten määrien syöminen on yhdistetty huimaukseen ja pahoinvointiin (mahdollisesti marjojen sienen vuoksi).'],
  }),
  'empetrum-nigrum': u(['fruit'], {
    food: ['Best mixed with bilberry, bog bilberry or blackcurrant in juices, wines and berry dishes; a staple berry of northern peoples, even added to meat soup.', 'Parhaimmillaan mustikan, juolukan tai mustaherukan kanssa mehuissa, viineissä ja marjaruoissa; pohjoisten kansojen perusmarja, jota lisättiin jopa lihakeittoon.'],
    med: ['Its vitamin C made it a traditional scurvy preventive.', 'C-vitamiininsa vuoksi perinteinen keripukin ehkäisijä.'],
    keep: ['Juice or freeze; the berries are watery and seedy for eating fresh.', 'Mehusta tai pakasta; marjat ovat tuoreina vetisiä ja siemenisiä.'],
    warn: ['Honey from the flowers is said to be poisonous.', 'Kukkien mettä pidetään kirjallisuudessa myrkyllisenä.'],
  }),
  'matricaria-chamomilla': u(['flowers'], {
    food: ['Flower heads make a mild, calming tea.', 'Kukkamykeröistä saa mietoa, rauhoittavaa teetä.'],
    med: ['A classic household remedy: tea for stomach cramps, indigestion and restless sleep; compresses, baths and rinses for irritated skin, sore eyes and gums; steam inhalation for colds.', 'Klassinen kotirohto: tee vatsan kouristuksiin, ruoansulatusvaivoihin ja levottomaan uneen; hauteet, kylvyt ja huuhteet ärtyneelle iholle, väsyneille silmille ja ikenille; höyryhengitys vilustumiseen.'],
    other: ['Cosmetics for sensitive skin; a rinse brightens fair hair. Chamomile tea is sprayed on weak garden plants in biodynamic growing.', 'Herkän ihon kosmetiikkaan; huuhde kirkastaa vaaleita hiuksia. Biodynaamisessa viljelyssä kamomillateellä vahvistetaan heikkoja kasveja.'],
    keep: ['Pick flower heads in dry weather as they open fully; dry in the shade.', 'Poimi mykeröt kuivalla säällä täysin avautuneina; kuivaa varjossa.'],
    warn: ['Can cause allergy in people sensitive to daisy-family plants (e.g. mugwort).', 'Voi aiheuttaa allergiaa asterikasveille (esim. pujolle) herkille.'],
  }, ['tea', 'medicinal']),
  'calluna-vulgaris': u(['flowers'], {
    food: ['Flowering tips make a mild herbal tea, often in evening blends.', 'Kukkivista latvoista saa mietoa yrttiteetä, usein iltateesekoituksiin.'],
    med: ['A traditional calming tea to help sleep, a mild diuretic for urinary complaints and an astringent for diarrhoea; tea to wash small wounds.', 'Perinteinen rauhoittava tee unen tueksi, mieto virtsaneritystä lisäävä rohto virtsatievaivoihin ja supistava rohto ripuliin; tee pienten haavojen puhdistukseen.'],
    other: ['A major late-summer bee plant; dyes brown, green and yellow; once used for fodder, thatch, tanning and pipes.', 'Tärkeä loppukesän mesikasvi; värjää ruskeaksi, vihreäksi ja keltaiseksi; ennen käytetty rehuna, katteena, parkitukseen ja piippujen tekoon.'],
  }, ['tea']),
  'thymus-serpyllum': u(['leaves', 'flowers'], {
    food: ['Use like other thymes in meat, fish, egg and pasta dishes; the flowers decorate dishes. Makes a herbal tea and flavours liqueurs.', 'Käytä muiden timjamien tapaan liha-, kala-, muna- ja pastaruoissa; kukat koristeeksi. Siitä saa yrttiteetä ja se maustaa liköörejä.'],
    med: ['Flowering tops (July–August) are a traditional cough remedy that loosens mucus and eases hoarseness and digestive cramps; baths and compresses for itchy or inflamed skin.', 'Kukkivat latvat (heinä–elokuu) ovat perinteinen yskänrohto, joka irrottaa limaa ja lievittää käheyttä ja vatsan kouristuksia; kylvyt ja hauteet kutisevalle tai tulehtuneelle iholle.'],
    other: ['Used in bath oils.', 'Käytetään kylpyöljyissä.'],
    warn: ['Very large doses can cause vomiting.', 'Hyvin suuret annokset voivat aiheuttaa oksentelua.'],
  }),
  'angelica-sylvestris': u(['shoots', 'leaves', 'roots', 'seeds'], {
    food: ['Young shoots and leaves in salads, on sandwiches or boiled like spinach; stems in dishes or jam. A milder version of garden angelica; seeds have flavoured spirits.', 'Nuoret versot ja lehdet salaatteihin, voileiville tai suolavedessä keitettyinä pinaatin tapaan; varret ruokiin tai hilloon. Väinönputken miedompi versio; siemeniä on käytetty viinan mausteena.'],
    med: ['Like garden angelica but weaker: digestive, eases wind and cramps; the steam of the tea opens the airways.', 'Kuten väinönputki mutta heikompi: edistää ruoansulatusta, lievittää ilmavaivoja ja kouristuksia; teen höyry avaa hengitysteitä.'],
    other: ['Dyes golden yellow.', 'Värjää kullankeltaiseksi.'],
    warn: ['The carrot family includes deadly look-alikes (e.g. cowbane, hemlock): never use it without certain identification. The sap can make skin sun-sensitive.', 'Sarjakukkaisissa on tappavan myrkyllisiä näköislajeja (mm. myrkkykeiso, myrkkykatko): käytä vain varmasti tunnistettuna. Kasvineste voi herkistää ihon auringolle.'],
  }),

  // --- Batch 3 -------------------------------------------------------------
  'vaccinium-oxycoccos': u(['fruit', 'leaves'], {
    food: ['Use like lingonberries: juices, jellies, jams, kissel and nectars; excellent in drinks and liqueurs. Berries dipped in egg white and rolled in icing sugar make a sweet.', 'Käytä puolukan tapaan: mehuissa, hyytelöissä, hilloissa, kiisseleissä ja nektareissa; erinomainen juomissa ja likööreissä. Munanvalkuaiseen kastetut ja tomusokerissa kieritetyt marjat ovat makeinen.'],
    med: ['Berries and leaf tea are traditional aids for urinary-tract complaints; the juice was drunk to strengthen people with fever and against scurvy.', 'Marjat ja lehtitee ovat perinteisiä virtsatievaivojen tukia; mehua juotiin kuumepotilaiden vahvistamiseksi ja keripukkia vastaan.'],
    keep: ['Keeps for weeks in the cold; freezes well.', 'Säilyy kylmässä viikkoja; pakastuu hyvin.'],
  }),
  'juniperus-communis': u(['fruit', 'shoots', 'needles'], {
    food: ['Berries flavour gin and genever, juniper beer and sahti, game, marinades, sauerkraut and bread; needles are used in smoking meat and fish. Young shoots are rich in vitamin C for tea or salads.', 'Marjat maustavat giniä ja geneveriä, katajakaljaa ja sahtia, riistaa, marinadeja, hapankaalia ja leipää; havuja käytetään lihan ja kalan savustuksessa. Nuoret versot ovat C-vitamiinipitoisia teeksi tai salaattiin.'],
    med: ['Berries are a traditional diuretic for mild urinary infections and poor appetite; the oil is used externally for rheumatic and muscle pains, and resin and juniper tar on wounds.', 'Marjat ovat perinteinen virtsaneritystä lisäävä rohto lieviin virtsatieinfektioihin ja ruokahaluttomuuteen; öljyä käytetään ulkoisesti reuma- ja lihaskipuihin, pihkaa ja katajatervaa haavoille.'],
    other: ['Durable, fragrant wood for knives, trivets and crafts; juniper water was used to clean dairy vessels.', 'Kestävästä, tuoksuvasta puusta tehdään veitsiä, pannunalusia ja käsitöitä; katajavedellä on pesty maitoastioita.'],
    keep: ['Berries ripen in their second year; pick the blue-black ones and dry them.', 'Marjat kypsyvät toisena vuonna; poimi siniset marjat ja kuivaa ne.'],
    warn: both(['Do not use the berries for more than two weeks at a time; avoid with kidney disease. The essential oil must not be taken internally.', 'Älä käytä marjoja yli kahta viikkoa kerrallaan; vältä munuaissairauksissa. Eteeristä öljyä ei saa nauttia sisäisesti.'], NOT_PREGNANT),
  }),
  'avena-sativa': u(['seeds', 'shoots'], {
    food: ['Groats and flour for porridge and talkkuna; whole cooked oats in salads and warm dishes. Very nutritious; the soluble fibre helps lower cholesterol.', 'Suurimoina ja jauhoina puuroon ja talkkunaan; kokonaisina keitettyinä salaatteihin ja lämpimiin ruokiin. Hyvin ravitseva; liukoinen kuitu auttaa alentamaan kolesterolia.'],
    med: ['Green, flowering "milky" oat tops are a traditional tonic for the nerves and exhaustion; oat gruel soothes the stomach.', 'Maitoasteella olevat kukkivat kauranversot ovat perinteinen hermoja vahvistava rohto uupumukseen; kauralima rauhoittaa vatsaa.'],
    other: ['Ground oats for face masks, scrubs, baths and soap.', 'Jauhettu kaura kasvonaamioihin, kuorintoihin, kylpyihin ja saippuaan.'],
  }),
  'calendula-officinalis': u(['flowers'], {
    food: ['Petals colour and decorate salads, rice, fish, egg dishes, soups and porridge, and replace saffron as a colouring in baking (brief frying in butter or oil brings out the colour). A mild tea.', 'Terälehdet värittävät ja koristavat salaatteja, riisi-, kala- ja munaruokia, keittoja ja puuroa, ja korvaavat sahramin värinä leivonnassa (lyhyt kypsennys voissa tai öljyssä tuo värin esiin). Mieto tee.'],
    med: ['The classic skin herb: flower oil, salve and compresses for small wounds, chapped or itchy skin, burns and insect bites.', 'Klassinen ihoyrtti: kukista tehty öljy, salva ja hauteet pieniin haavoihin, rohtuneelle tai kutisevalle iholle, palovammoihin ja hyönteisten pistoihin.'],
    other: ['Soothing cosmetics for all skin types; a rinse gives fair hair a golden tone. Acts as a trap plant, e.g. drawing pollen beetles away from cauliflower.', 'Rauhoittava kosmetiikka kaikille ihotyypeille; huuhde antaa vaaleille hiuksille kullanvärin. Toimii houkutuskasvina, esim. vetää rapsikuoriaisia kukkakaalista.'],
    keep: ['Dry flowers or petals for winter.', 'Kuivaa kukat tai terälehdet talveksi.'],
    warn: ['Not for internal use during pregnancy; can cause allergy in people sensitive to daisy-family plants.', 'Ei sisäisesti raskauden aikana; voi aiheuttaa allergiaa asterikasveille herkille.'],
  }, ['medicinal', 'edible-flowers']),
  'gentiana-lutea': u(['roots'], {
    food: ['The intensely bitter root flavours aperitifs, bitters and liqueurs.', 'Erittäin karvas juuri maustaa aperitiiveja, katkeroita ja liköörejä.'],
    med: ['One of the best-known bitter tonics: a root decoction or cold infusion stimulates appetite and digestion.', 'Tunnetuimpia karvasrohtoja: juurikeite tai kylmävesiuute lisää ruokahalua ja edistää ruoansulatusta.'],
    warn: ['Overdose irritates the gut. Do not gather wild plants — it resembles the highly poisonous white false hellebore (Veratrum album).', 'Yliannostus ärsyttää suolistoa. Älä kerää luonnosta — se muistuttaa erittäin myrkyllistä valkopärskäjuurta (Veratrum album).'],
  }),
  'galium-verum': u(['flowers', 'roots', 'whole-plant'], {
    food: ['Once used to flavour beer; a strong decoction curdles milk for cheese and colours it yellow.', 'Käytetty ennen oluen mausteena; vahva keite juoksettaa maidon juustoksi ja värjää sen keltaiseksi.'],
    med: ['Flowering stems were a traditional mild diuretic and antispasmodic, and used as a tea or powder on wounds and rashes.', 'Kukkivia varsia on käytetty perinteisesti miedosti virtsaneritystä lisäävänä ja kouristuksia laukaisevana sekä teenä tai jauheena haavoille ja ihottumiin.'],
    other: ['The roots dye brick red (gather before flowering; they keep for years dried). The honey-scented dried plant was used to stuff mattresses.', 'Juurista saa tiilenpunaista väriä (kerää ennen kukintaa; säilyvät kuivattuina vuosia). Hunajantuoksuista kuivattua kasvia käytettiin patjojen täytteenä.'],
  }),
  'sinapis-alba': u(['seeds', 'leaves', 'flowers'], {
    food: ['Ground seeds make mustard: the heat develops only when mixed with cold water, so make it just before use. Whole seeds help preserve pickles. Young leaves and flowers suit salads in early summer; later they turn bitter.', 'Jauhetuista siemenistä tehdään sinappia: polttava maku kehittyy vasta kylmään veteen sekoitettaessa, joten valmista juuri ennen käyttöä. Kokonaiset siemenet parantavat etikkasäilykkeiden säilyvyyttä. Nuoret lehdet ja kukat sopivat alkukesällä salaatteihin; myöhemmin ne kitkeröityvät.'],
    med: ['Mustard aids digestion of fatty food; mustard foot baths and plasters were traditional warming remedies for colds and aches.', 'Sinappi edistää rasvaisen ruoan sulamista; sinappijalkakylvyt ja -kääreet olivat perinteisiä lämmittäviä rohtoja vilustumiseen ja särkyihin.'],
    other: ['A good bee plant and a fast green manure that improves soil structure.', 'Hyvä mesikasvi ja nopea viherlannoituskasvi, joka parantaa maan rakennetta.'],
    warn: ['Mustard plasters can burn sensitive skin — keep them short.', 'Sinappikääreet voivat polttaa herkkää ihoa — pidä ne lyhyinä.'],
  }, ['seed-spice']),
  'viola-tricolor': u(['flowers', 'whole-plant'], {
    food: ['Flowers decorate salads and warm dishes.', 'Kukat koristavat salaatteja ja lämpimiä ruokia.'],
    med: ['Since the Middle Ages a skin herb (cradle cap, eczema, slow-healing wounds) used as tea and compresses; also a cough remedy.', 'Keskiajalta asti ihoyrtti (maitorupi, ihottumat, huonosti paranevat haavat) teenä ja hauteina; myös yskänrohto.'],
    other: ['Petals dye yarn blue; the whole plant gives a dull yellow.', 'Terälehdet värjäävät langan siniseksi; koko kasvista saa himmeänkeltaista.'],
    keep: ['Pick in the morning once the dew is gone and dry quickly; store airtight.', 'Poimi aamulla kasteen haihduttua ja kuivaa nopeasti; säilytä ilmatiiviisti.'],
    warn: ['Large doses over a long time can cause skin reactions; do not use the roots (nausea).', 'Suuret annokset pitkään voivat aiheuttaa iho-oireita; älä käytä juuria (pahoinvointi).'],
  }),
  'potentilla-anserina': u(['roots', 'leaves', 'whole-plant'], {
    food: ['The pencil-thick roots taste like parsnip and carrot: cook as a root vegetable, or dry and grind into porridge and bread. Young leaves are cooked like spinach.', 'Lyijykynän paksuiset juuret maistuvat palsternakalta ja porkkanalta: kypsennä juureksena tai kuivaa ja jauha puuroon ja leipään. Nuoret lehdet keitetään pinaatin tapaan.'],
    med: ['Tannin-rich tea from the flowering plant is a traditional remedy for diarrhoea and a gargle for sore gums; also used for menstrual and intestinal cramps.', 'Kukkivasta kasvista tehty parkkiainepitoinen tee on perinteinen ripulirohto ja kurlausvesi ientulehdukseen; käytetty myös kuukautis- ja suolistokouristuksiin.'],
    other: ['The root was used for tanning leather.', 'Juurakkoa on käytetty nahkojen parkitsemiseen.'],
  }),
  'herniaria-glabra': u(['whole-plant'], {
    med: ['Traditionally a strong diuretic for bladder and urethral complaints; poultices were once laid on hernias (hence the name).', 'Perinteisesti voimakkaasti virtsaneritystä lisäävä rohto rakko- ja virtsaputkivaivoihin; hauteita pantiin ennen tyrän päälle (tästä nimi).'],
    warn: ['Somewhat poisonous; not for people with liver or gallbladder problems.', 'Jossain määrin myrkyllinen; ei maksa- tai sappivaivoja poteville.'],
  }),
  'primula-veris': u(['flowers', 'leaves', 'roots'], {
    food: ['Flowers give a lovely aroma to drinks such as mead and cowslip wine and are dried for tea; young leaves were eaten in salads.', 'Kukat antavat juomille, kuten simalle ja primulaviinille, hyvän aromin ja niitä kuivataan teeksi; nuoria lehtiä on syöty salaatissa.'],
    med: ['Flower tea and especially the saponin-rich root were traditional expectorants for colds with sticky coughs and bronchitis.', 'Kukkatee ja erityisesti saponiinipitoinen juuri olivat perinteisiä limaa irrottavia rohtoja sitkeään yskään ja keuhkoputkentulehdukseen.'],
    warn: ['The root is poisonous and not for home use; the plant can cause skin allergy. Protected or rare in many areas — use garden-grown plants.', 'Juuri on myrkyllinen eikä sovi kotikäyttöön; kasvi voi aiheuttaa ihoallergiaa. Monin paikoin harvinainen tai rauhoitettu — käytä puutarhassa kasvatettuja.'],
  }),
  'drosera-rotundifolia': u(['leaves', 'whole-plant'], {
    med: ['A traditional remedy for dry, irritating and whooping coughs and asthma; still a raw material for cough medicines. Leaves were laid on warts and corns.', 'Perinteinen rohto kuivaan, ärsyttävään yskään, hinkuyskään ja astmaan; edelleen yskänlääkkeiden raaka-aine. Lehtiä on laitettu syylien ja känsien päälle.'],
    other: ['The sticky leaves curdle milk and were used as a starter for the stretchy Finnish soured milk (pitkäpiimä). Leaves dye yarn red.', 'Tahmeat lehdet juoksettavat maidon, ja niitä on käytetty pitkäpiimän siemenenä. Lehdistä saa punaista väriä lankoihin.'],
    warn: ['Wild populations are small and slow-growing; do not strip bogs of them.', 'Luonnonkannat ovat pieniä ja hidaskasvuisia; älä kerää soita tyhjiksi.'],
  }),
  'artemisia-absinthium': u(['leaves', 'flowers'], {
    food: ['Once used to season game and seabirds; the key flavouring of vermouth and absinthe. Extremely bitter.', 'Käytetty ennen riistan ja merilintujen mausteena; vermutin ja absintin tärkein maustaja. Erittäin karvas.'],
    med: ['An ancient bitter tonic for poor appetite and to stimulate digestive juices and bile, used only for a few days at a time.', 'Ikivanha karvasrohto ruokahaluttomuuteen sekä mahanesteiden ja sapen erityksen lisäämiseen, vain muutaman päivän kerrallaan.'],
    other: ['A decoction or scattered sprigs repel garden pests, fleas and bedbugs; used to disinfect cellars.', 'Keitteellä tai ripotelluilla oksilla karkotetaan puutarhan tuholaisia, kirppuja ja luteita; käytetty kellarien desinfiointiin.'],
    warn: both(['Contains thujone, a nerve poison: no prolonged or large use; not for children.', 'Sisältää hermomyrkkyä, tujonia: ei pitkäaikaiseen tai runsaaseen käyttöön eikä lapsille.'], NOT_PREGNANT),
  }),
  'coriandrum-sativum': u(['leaves', 'seeds', 'roots'], {
    food: ['Leaves (cilantro) are added at the end of cooking to salads and Vietnamese, Thai and Mexican dishes. Seeds season lamb, pork, fish, poultry, rice, curries, pulses, beetroot, pickles, herring, bread and gin. The root flavours Thai curry pastes.', 'Lehdet lisätään ruoan loppuvaiheessa salaatteihin sekä vietnamilaisiin, thaimaalaisiin ja meksikolaisiin ruokiin. Siemenet maustavat lammasta, sianlihaa, kalaa, siipikarjaa, riisiä, currya, palkokasveja, punajuurta, pikkelssejä, silliä, leipää ja giniä. Juuri maustaa thaimaalaisia currytahnoja.'],
    med: ['Seeds are a traditional digestive that eases wind and stomach cramps.', 'Siemenet ovat perinteinen ruoansulatusta edistävä mauste, joka lievittää ilmavaivoja ja vatsan kouristuksia.'],
    other: ['Flowers attract hoverflies and parasitic wasps; a bee plant. The oil is used in soap and perfume.', 'Kukat houkuttelevat kukkakärpäsiä ja petopistiäisiä; mesikasvi. Öljyä käytetään saippuassa ja hajuvesissä.'],
    keep: ['Leaves are best fresh or frozen; dry the seeds when brown.', 'Lehdet ovat parhaita tuoreina tai pakastettuina; kuivaa siemenet ruskeina.'],
  }),
  'tropaeolum-majus': u(['flowers', 'leaves', 'buds', 'seeds'], {
    food: ['Flowers, buds, leaves and green seeds all have a peppery taste: decorate and spice salads, drinks and warm dishes. Pickled buds or briefly salted green seeds are a caper substitute.', 'Kukissa, nupuissa, lehdissä ja raaoissa siemenissä on pippurinen maku: niillä koristetaan ja maustetaan salaatteja, juomia ja lämpimiä ruokia. Etikkaan säilötyt nuput tai suolavedessä kiehautetut raa’at siemenet korvaavat kapriksen.'],
    med: ['Its mustard oils are antibacterial; traditionally used for urinary and respiratory infections.', 'Sen sinappiöljyt ovat bakteereja tuhoavia; perinteisesti virtsatie- ja hengitystieinfektioihin.'],
    other: ['A trap plant that draws aphids away from cabbages and apple trees.', 'Houkutuskasvi, joka vetää kirvoja pois kaaleista ja omenapuista.'],
  }, ['edible-flowers']),
  'frangula-alnus': u(['bark'], {
    med: ['Dried, aged bark is a traditional strong laxative for occasional constipation; now an official medicinal plant sold only as pharmacy products.', 'Kuivattu ja vanhennettu kuori on perinteinen voimakas ulostuslääke satunnaiseen ummetukseen; nykyään virallinen lääkekasvi, jota myydään vain apteekkivalmisteina.'],
    other: ['The bark dyes yellow and the berries greenish; the soft wood was used for gunpowder charcoal.', 'Kuoresta saa keltaista ja marjoista vihertävää väriä; pehmeää puuta käytettiin ruudin hiileen.'],
    warn: ['Fresh bark and the berries are poisonous. Even dried bark must not be used continuously (dependence, potassium loss); not during pregnancy or for children.', 'Tuore kuori ja marjat ovat myrkyllisiä. Kuivattuakaan kuorta ei saa käyttää jatkuvasti (riippuvuus, kaliumin menetys); ei raskauden aikana eikä lapsille.'],
  }),

  // --- Batch 4 -------------------------------------------------------------
  'sorbus-aucuparia': u(['fruit', 'leaves', 'buds'], {
    food: ['Berries (rich in vitamin C and carotene) for juice, wine, jelly, purée and bread; nectar keeps most of their goodness. Freezing or drying reduces bitterness — pick sweet-berried trees. Young leaves in salads, older leaves (especially fermented) for tea; buds give a bitter-almond note.', 'Marjat (runsaasti C-vitamiinia ja karoteenia) mehuun, viiniin, hyytelöön, soseeseen ja leipään; nektarissa hyvät aineet säilyvät parhaiten. Pakastus ja kuivaus vähentävät kitkeryyttä — suosi makeamarjaisia puita. Nuoret lehdet salaattiin, vanhemmat lehdet (etenkin hiostettuina) teeksi; silmut antavat karvasmantelin maun.'],
    med: ['Berries were a traditional remedy for kidney and bladder complaints, gout and rheumatism; mildly laxative.', 'Marjoja on käytetty perinteisesti munuais- ja rakkovaivoihin, kihtiin ja reumaan; lievästi ulostavia.'],
    other: ['Tough wood for furniture, tool handles and rake teeth.', 'Sitkeä puu huonekaluihin, varsiin ja haravan piikkeihin.'],
    warn: ['Raw berries in quantity can upset the stomach (parasorbic acid); cooking or freezing makes them safe.', 'Raakoina suurina määrinä marjat voivat ärsyttää vatsaa (parasorbiinihappo); kypsennys tai pakastus poistaa haitan.'],
  }),
  'linum-usitatissimum': u(['seeds'], {
    food: ['Seeds soaked, toasted, or added to porridge and dough; cold-pressed linseed oil for the kitchen.', 'Siemenet liotettuina, paahdettuina tai puuroon ja taikinaan; kylmäpuristettu pellavaöljy keittiöön.'],
    med: ['Swelling seeds are a gentle traditional remedy for constipation; linseed gruel soothes the stomach.', 'Turpoavat siemenet ovat hellävarainen perinteinen ummetusrohto; pellavalima rauhoittaa vatsaa.'],
    other: ['Linen fibre for cloth and paper; linseed oil for wood finishes, paint and putty; seeds in soothing skin masks.', 'Pellavakuitu kankaaseen ja paperiin; pellavaöljy puun pintakäsittelyyn, maaleihin ja kittiin; siemenet ihoa rauhoittaviin naamioihin.'],
    warn: ['Drink plenty of water with the seeds and do not eat large amounts of raw crushed seed daily (cyanogenic glycosides); separate from medicines by a couple of hours.', 'Juo siementen kanssa runsaasti vettä äläkä syö päivittäin suuria määriä raakoja murskattuja siemeniä (syanogeeniset glykosidit); ota eri aikaan kuin lääkkeet.'],
  }),
  'solidago-virgaurea': u(['flowers', 'leaves'], {
    med: ['An old urinary-tract herb: tea from the flowering tops increases urine flow and was used for kidney and bladder infections and rheumatism; also astringent.', 'Vanha virtsatieyrtti: kukkivista latvoista tehty tee lisää virtsaneritystä, ja sitä on käytetty munuais- ja virtsatietulehduksiin sekä reumaan; myös supistava.'],
    other: ['Dyes wool golden yellow even without a mordant.', 'Värjää villan kullankeltaiseksi jopa ilman purettamista.'],
    warn: ['Not for people with heart or kidney failure who must limit fluids; may cause allergy in people sensitive to daisy-family plants.', 'Ei sydämen tai munuaisten vajaatoiminnassa, kun nesteitä on rajoitettava; voi aiheuttaa allergiaa asterikasveille herkille.'],
  }),
  'carum-carvi': u(['seeds', 'leaves', 'roots'], {
    food: ['Seeds for cabbage dishes, sauerkraut, bread, cheese, sausage, pickles and aquavit. Spring leaves in salads, stews and with potatoes; the root was once a common soup vegetable (like carrot or parsnip).', 'Siemenet kaaliruokiin, hapankaaliin, leipään, juustoon, makkaraan, säilykkeisiin ja akvaviittiin. Kevään lehdet salaattiin, pataruokiin ja perunoiden kanssa; juuri oli ennen yleinen keittojuures (kuten porkkana tai palsternakka).'],
    med: ['A traditional digestive: seeds or seed tea ease wind and cramps and stimulate appetite.', 'Perinteinen ruoansulatusmauste: siemenet tai siementee lievittävät ilmavaivoja ja kouristuksia sekä lisäävät ruokahalua.'],
    warn: ['Do not take the essential oil internally.', 'Eteeristä öljyä ei pidä nauttia sisäisesti.'],
  }, ['medicinal']),
  'borago-officinalis': u(['leaves', 'flowers', 'seeds'], {
    food: ['Young leaves, finely chopped, in salads or cooked like spinach with potatoes, cabbage, beans, fish and omelettes. The blue flowers (without the hairy calyx) decorate salads, cakes and drinks, freeze into ice cubes or can be candied.', 'Nuoret lehdet hienoksi silputtuina salaattiin tai pinaatin tapaan peruna-, kaali-, papu- ja kalaruokiin ja munakkaisiin. Siniset kukat (ilman karvaista verhiötä) koristavat salaatteja, kakkuja ja juomia, jäädytetään jääkuutioihin tai kandeerataan.'],
    med: ['Traditionally a cheering herb, used as a mild diuretic; the seed oil is rich in gamma-linolenic acid.', 'Perinteisesti mieltä ilahduttava yrtti ja mieto virtsaneritystä lisäävä rohto; siemenöljyssä on runsaasti gammalinoleenihappoa.'],
    other: ['An outstanding bee plant.', 'Erinomainen mesikasvi.'],
    warn: ['Leaves contain small amounts of liver-harming pyrrolizidine alkaloids: eat occasionally, not as a daily remedy; not during pregnancy.', 'Lehdissä on pieniä määriä maksalle haitallisia pyrrolitsidiinialkaloideja: syö satunnaisesti, ei päivittäisenä rohtona; ei raskauden aikana.'],
  }, ['edible-flowers']),
  'allium-sativum': u(['bulbs', 'leaves'], {
    food: ['The strongest-flavoured allium: meat, vegetable soups and stews (add late), dressings, pickles and fermented vegetables. Green shoots and bulbils are used too; cloves in a pot give winter greens.', 'Sipuleista voimakkain: liharuokiin, kasviskeittoihin ja -patoihin (lisää lopuksi), kastikkeisiin, säilykkeisiin ja hapatteisiin. Myös vihreät varret ja itusilmut käyvät; ruukkuun istutetut kynnet antavat talvella vihreää.'],
    med: ['Raw garlic is a traditional remedy for colds and infections; it helps keep blood lipids and pressure in check and eases wind.', 'Raaka valkosipuli on perinteinen rohto vilustumiseen ja tulehduksiin; se auttaa pitämään veren rasva-arvot ja verenpaineen kurissa ja lievittää ilmavaivoja.'],
    other: ['Garlic sprays and interplanting are used against garden pests.', 'Valkosipuliuutteita ja välikasvatusta käytetään puutarhan tuholaisia vastaan.'],
    warn: ['Large amounts thin the blood — take care with anticoagulants and before surgery.', 'Suuret määrät ohentavat verta — varovaisuutta verenohennuslääkkeiden kanssa ja ennen leikkausta.'],
  }),
  'satureja-hortensis': u(['leaves', 'shoots'], {
    food: ['Peppery, thyme-like; dried it tastes of marjoram. The classic "bean herb" for beans, peas and lentils; also sausages, liver, lamb, minced meat, game, cabbage, mushrooms and potatoes. Pairs with rosemary and chervil and replaces salt and pepper.', 'Pippurinen ja timjamimainen; kuivattuna meiramin makuinen. Klassinen "papuyrtti" papu-, herne- ja linssiruokiin; myös makkaraan, maksaan, lampaaseen, jauhelihaan, riistaan, kaaliin, sieniin ja perunaan. Sopii rosmariinin ja kirvelin kanssa ja korvaa suolaa ja pippuria.'],
    med: ['Eases wind and aids digestion; a mild expectorant.', 'Lievittää ilmavaivoja ja edistää ruoansulatusta; lievästi limaa irrottava.'],
    keep: ['Dry the flowering shoots.', 'Kuivaa kukkivat versot.'],
  }),
  'lavandula-angustifolia': u(['flowers', 'leaves'], {
    food: ['Strong and bitter — use sparingly: young leaves with lamb, game and fish, in herbes de Provence; flowers in baking, syrups, sugar and drinks.', 'Voimakas ja karvas — käytä säästeliäästi: nuoret lehdet lampaan, riistan ja kalan kanssa sekä provencelaisessa mausteseoksessa; kukat leivontaan, siirappeihin, sokeriin ja juomiin.'],
    med: ['Flower tea or the oil in a bath is a traditional relaxant for sleeplessness, tension headache and indigestion; diluted oil on small burns and insect bites.', 'Kukkatee tai öljy kylpyvedessä on perinteinen rentouttava rohto unettomuuteen, jännityspäänsärkyyn ja ruoansulatusvaivoihin; laimennettu öljy pieniin palovammoihin ja hyönteisten pistoihin.'],
    other: ['Soap and perfume; sachets scent wardrobes and deter clothes moths; diluted oil repels mosquitoes.', 'Saippuat ja hajuvedet; laventelipussit tuoksuttavat vaatekaapin ja karkottavat koita; laimennettu öljy karkottaa hyttysiä.'],
    keep: ['Cut flower spikes as the first flowers open and dry them in bunches.', 'Leikkaa kukkatähkät ensimmäisten kukkien auetessa ja kuivaa kimppuina.'],
    warn: ['Do not take the essential oil internally.', 'Eteeristä öljyä ei saa nauttia sisäisesti.'],
  }, ['medicinal']),
  'stachys-officinalis': u(['leaves', 'roots', 'flowers'], {
    med: ['Once one of the most esteemed remedies (partly for its magical reputation): tannin-rich leaves as a wound and diarrhoea herb and tea for headache; the root is emetic and purgative.', 'Aikoinaan arvostetuimpia rohtoja (osin taikamaineensa vuoksi): parkkiainepitoiset lehdet haava- ja ripulirohtona ja teenä päänsärkyyn; juuri on oksettava ja ulostava.'],
    other: ['Fresh betony dyes yellow. Hedge woundwort leaves rubbed on skin keep mosquitoes away; field woundwort forms edible tubers.', 'Tuoreesta rohtopähkämöstä saa keltaista väriä. Iholle hierotut lehtopähkämön lehdet karkottavat hyttysiä; peltopähkämö muodostaa syötäviä mukuloita.'],
    warn: ['Do not use the root: overdoses cause vomiting.', 'Älä käytä juurta: yliannokset aiheuttavat oksentelua.'],
  }),
  'polemonium-caeruleum': u(['roots', 'leaves', 'flowers'], {
    med: ['A forgotten sedative herb: a root decoction was used to calm nerves; research suggests its saponins are markedly calming and ease coughs.', 'Unohdettu rauhoittava rohto: juurikeitettä on käytetty hermojen rauhoittamiseen; tutkimusten mukaan sen saponiinit rauhoittavat selvästi ja lievittävät yskää.'],
    keep: ['Lift roots in autumn, wash and dry at 50–60 °C (100 g fresh gives about 30 g dry).', 'Nosta juuret syksyllä, pese ja kuivaa 50–60 °C:ssa (100 g tuoretta antaa noin 30 g kuivattua).'],
    warn: ['Saponins irritate the gut in large amounts; use only occasionally.', 'Saponiinit ärsyttävät suolistoa suurina määrinä; käytä vain satunnaisesti.'],
  }),
  'tussilago-farfara': u(['flowers', 'leaves'], {
    food: ['Flowers have been used for country wine, though dandelion is a better choice.', 'Kukista on tehty viiniä, mutta voikukka on siihen parempi.'],
    med: ['A traditional cough herb (flower or leaf tea) and a poultice for wounds.', 'Perinteinen yskänyrtti (kukka- tai lehtitee) ja haude haavoille.'],
    warn: ['Contains liver-damaging, carcinogenic pyrrolizidine alkaloids — at most very occasional use; safer alternatives such as plantain exist. Not during pregnancy or for children.', 'Sisältää maksalle haitallisia, syöpää aiheuttavia pyrrolitsidiinialkaloideja — korkeintaan aivan tilapäisesti; turvallisempia vaihtoehtoja on, esim. ratamo. Ei raskauden aikana eikä lapsille.'],
  }),
  'rubus-saxatilis': u(['leaves', 'fruit'], {
    food: ['An excellent, productive tea herb, especially fermented leaves. Berries make jelly or jam once the stones are sieved out.', 'Erinomainen ja satoisa teeyrtti, etenkin hiostetut lehdet. Marjoista saa hyytelöä tai hilloa, kun kivet siivilöidään pois.'],
    keep: ['Collect leaves in summer and dry or ferment them for winter.', 'Kerää lehdet kesällä ja kuivaa tai hiosta talven varalle.'],
  }, ['tea']),
  'levisticum-officinale': u(['leaves', 'roots', 'seeds', 'shoots'], {
    food: ['A strong celery flavour with notes of parsnip, leek and parsley: soups, sauces, stews, rice and pasta, swede, cabbage, pumpkin and potato, cheese and bread. Add early in cooking; drying mellows it. The original flavour of stock cubes ("Maggi herb"). Young spring shoots in salads.', 'Voimakas sellerin maku, jossa palsternakan, purjon ja persiljan vivahteita: keittoihin, kastikkeisiin, patoihin, riisi- ja pastaruokiin, lanttuun, kaaliin, kurpitsaan ja perunaan, juustoon ja leipään. Lisää ruokaan alkuvaiheessa; kuivaus miedontaa. Lihaliemikuutioiden alkuperäinen mauste ("Maggikraut"). Nuoret kevätversot salaattiin.'],
    med: ['Root and leaves were popular 18th-century remedies: diuretic, antispasmodic, appetising; chewing seeds eases indigestion.', 'Juuri ja lehdet olivat 1700-luvulla suosittuja rohtoja: virtsaneritystä lisäävä, kouristuksia laukaiseva ja ruokahalua parantava; siementen pureskelu auttaa ruoansulatusvaivoihin.'],
    keep: ['Dry or freeze the leaves.', 'Kuivaa tai pakasta lehdet.'],
    warn: both(['Not with kidney disease; can make skin sun-sensitive.', 'Ei munuaissairauksissa; voi herkistää ihon auringolle.'], NOT_PREGNANT),
  }),
  'capsella-bursa-pastoris': u(['leaves', 'shoots', 'whole-plant'], {
    food: ['Spring shoots and overwintered rosettes in salads, stews, soups and on bread, and in herbal tea blends. Rich in potassium.', 'Kevään versot ja talvehtineet ruusukkeet salaatteihin, muhennoksiin, keittoihin ja leivän päälle sekä yrttiteesekoituksiin. Runsaasti kaliumia.'],
    med: ['A traditional styptic: used on wounds (even in World War I) and as a tea for heavy menstrual bleeding.', 'Perinteinen verenvuotoa tyrehdyttävä rohto: haavoille (jopa ensimmäisessä maailmansodassa) ja teenä runsaisiin kuukautisiin.'],
    warn: both(['Leave out leaves infected with white rust (Albugo), considered poisonous.', 'Jätä pois valkoruosteen (Albugo) saastuttamat lehdet, joita pidetään myrkyllisinä.'], NOT_PREGNANT),
  }),
  'glechoma-hederacea': u(['leaves', 'flowers'], {
    food: ['Pungent, aromatic leaves flavour dressings, soups and stews; it cleared and flavoured beer until hops replaced it.', 'Kirpeän aromikkaat lehdet maustavat salaatinkastikkeita, keittoja ja muhennoksia; se kirkasti ja maustoi olutta, kunnes humala syrjäytti sen.'],
    med: ['Flowering tops are a traditional cough remedy that loosens mucus and a bitter that aids appetite; compresses for wounds and bruises.', 'Kukkivat latvat ovat perinteinen limaa irrottava yskänrohto ja ruokahalua lisäävä karvasrohto; hauteet haavoille ja mustelmille.'],
    warn: ['Its essential oil is toxic in large doses — use sparingly internally. Poisonous to horses.', 'Eteerinen öljy on suurina annoksina myrkyllistä — käytä sisäisesti säästeliäästi. Myrkyllinen hevosille.'],
  }),
  'silybum-marianum': u(['seeds', 'leaves', 'shoots'], {
    food: ['Young leaves (despined), shoots, peeled stems and flower bases are cooked as vegetables; roasted seeds were a coffee substitute.', 'Nuoret lehdet (piikit poistettuina), versot, kuoritut varret ja kukkapohjukset kypsennetään vihanneksina; paahdetuista siemenistä tehtiin kahvinkorviketta.'],
    med: ['The best-known liver herb: the ripe seeds contain silymarin, which supports and protects the liver.', 'Tunnetuin maksayrtti: kypsät siemenet sisältävät silymariinia, joka tukee ja suojaa maksaa.'],
    warn: ['Liver disease must be treated under medical supervision, not with home remedies. Can cause allergy in people sensitive to daisy-family plants.', 'Maksasairauksia on hoidettava lääkärin valvonnassa, ei kotikonstein. Voi aiheuttaa allergiaa asterikasveille herkille.'],
  }, ['medicinal']),

  // --- Batch 5 -------------------------------------------------------------
  'chamaenerion-angustifolium': u(['leaves', 'shoots', 'roots', 'flowers'], {
    food: ['Young shoots are cooked like asparagus or stir-fried; leaves (rich in protein, vitamin C and carotene) in salads, bakes and above all tea — fermented leaves make the traditional "Koporye tea". Roots were made into flour and coffee substitute.', 'Nuoret versot kypsennetään parsan tapaan tai wokataan; lehdet (runsaasti valkuaista, C-vitamiinia ja karoteenia) salaatteihin, laatikoihin ja ennen kaikkea teeksi — hiostetuista lehdistä tehdään perinteistä koporjeteetä. Juurista on tehty jauhoja ja kahvinkorviketta.'],
    med: ['Astringent tea from leaves and flowers was used as a gargle for mouth and throat inflammation and for stomach upsets.', 'Lehdistä ja kukista tehtyä supistavaa teetä on käytetty kurlausvetenä suun ja nielun tulehduksiin sekä vatsavaivoihin.'],
    other: ['Seed fluff was used to stuff quilts and pillows and even spun into lamp wicks.', 'Siemenhaituvia käytettiin peittojen ja tyynyjen täytteenä ja jopa kehrättiin lampunsydämiksi.'],
    keep: ['Ferment (wilt, roll, let oxidise) and dry the leaves for tea.', 'Hiosta (nuutuneet lehdet kieritellään ja annetaan hapettua) ja kuivaa lehdet teeksi.'],
  }),
  'malva-sylvestris': u(['flowers', 'leaves', 'seeds'], {
    food: ['Green seed heads ("cheeses") and young leaves are eaten raw or cooked; flowers colour drinks and make tea.', 'Raakoja hedelmiä ("katinjuustoja") ja nuoria lehtiä syödään raakoina tai kypsennettyinä; kukat värjäävät juomia ja niistä saa teetä.'],
    med: ['Mucilage-rich flowers and leaves soothe irritated airways and throats (tea, gargle) and dry or inflamed skin.', 'Lima-ainepitoiset kukat ja lehdet rauhoittavat ärtyneitä hengitysteitä ja kurkkua (tee, kurlausvesi) sekä kuivaa tai tulehtunutta ihoa.'],
    warn: ['Large amounts of the leaves may stimulate uterine contractions — avoid during pregnancy.', 'Suuret lehtimäärät voivat supistaa kohtua — vältä raskauden aikana.'],
  }),
  'rhaponticum-carthamoides': u(['roots', 'leaves'], {
    med: ['A Siberian "adaptogen" said to improve stamina and resistance to stress; the root is used by the herbal industry, leaves as tea.', 'Siperialainen "adaptogeeni", jonka sanotaan lisäävän jaksamista ja stressinsietoa; juurta käytetään rohdosteollisuudessa, lehtiä teenä.'],
    warn: ['Evidence is limited; avoid during pregnancy, with high blood pressure or with hormone-sensitive conditions.', 'Näyttö on vähäistä; vältä raskauden aikana, korkeassa verenpaineessa ja hormoniherkissä sairauksissa.'],
  }),
  'artemisia-vulgaris': u(['leaves', 'flowers', 'roots'], {
    food: ['Once used instead of hops in beer and to season fatty poultry and goose (blanched first); bitter — use sparingly.', 'Käytetty humalan sijasta oluessa ja rasvaisen linnunlihan mausteena (ryöpättynä); karvas — käytä säästeliäästi.'],
    med: ['Leaves and flowering tops are a traditional bitter for poor appetite and indigestion, and for menstrual complaints.', 'Lehdet ja kukkivat latvat ovat perinteinen karvasrohto ruokahaluttomuuteen, ruoansulatusvaivoihin ja kuukautishäiriöihin.'],
    other: ['Repels insects like wormwood.', 'Karkottaa hyönteisiä koiruohon tapaan.'],
    warn: both(['Contains thujone; its pollen is a major late-summer allergen.', 'Sisältää tujonia; siitepöly on merkittävä loppukesän allergeeni.'], NOT_PREGNANT),
  }),
  'anthriscus-cerefolium': u(['leaves', 'flowers'], {
    food: ['A delicate anise-parsley herb for almost anything: vegetables and mushrooms, potatoes, soups, beans, herb butter and cheese, omelettes, fish (like dill); part of fines herbes with parsley, tarragon and chives. Add at the end of cooking.', 'Hienostunut anis-persiljainen yrtti lähes kaikkeen: kasvikset ja sienet, perunat, keitot, pavut, yrttivoi ja -juusto, munakkaat, kala (tillin tapaan); osa fines herbes -seosta persiljan, rakuunan ja ruohosipulin kanssa. Lisää ruoan loppuvaiheessa.'],
    med: ['Traditionally eaten as a spring "cleansing" tonic.', 'Perinteisesti syöty keväisin "puhdistavana" kuurina.'],
    other: ['Used in cleansing skin masks and compresses.', 'Käytetty ihoa puhdistavissa naamioissa ja hauteissa.'],
    keep: ['Best fresh; freezing keeps more flavour than drying.', 'Paras tuoreena; pakastaminen säilyttää maun paremmin kuin kuivaus.'],
  }),
  'origanum-majorana': u(['leaves', 'flowers'], {
    food: ['One of Finland’s most used herbs: pasta sauces, minced meat, lamb, blood and liver dishes, potatoes, mushrooms, cabbage and pea soup. Goes with basil, savory and thyme.', 'Suomen käytetyimpiä mausteyrttejä: spagettikastikkeet, jauheliha, lammas, veri- ja maksaruoat, peruna, sienet, kaali ja hernekeitto. Sopii basilikan, kyntelin ja timjamin kanssa.'],
    med: ['A calming, antispasmodic tea for indigestion, mild bronchitis and sleeplessness.', 'Rauhoittava ja kouristuksia laukaiseva tee ruoansulatusvaivoihin, lievään keuhkoputkentulehdukseen ja unettomuuteen.'],
    other: ['Used in steams, face tonics and baths for tired, oily skin.', 'Käytetään höyrytyksissä, kasvovesissä ja kylvyissä väsyneelle ja rasvaiselle iholle.'],
    keep: ['Dry, freeze, or preserve in vinegar or oil.', 'Kuivaa, pakasta tai säilö etikkaan tai öljyyn.'],
  }),
  'filipendula-ulmaria': u(['flowers', 'leaves'], {
    food: ['Honey-scented flowers flavour wine, mead and beer; leaves (fermented) make tea. Use occasionally, not continuously.', 'Hunajantuoksuiset kukat maustavat viiniä, simaa ja olutta; lehdistä (hiostettuina) saa teetä. Käytä satunnaisesti, ei jatkuvasti.'],
    med: ['The plant that gave aspirin its name: flower and leaf tea (steeped, not boiled) was used for fever, colds, gout and rheumatic pain.', 'Kasvi, josta aspiriini sai nimensä: kukista ja lehdistä haudutettua (ei keitettyä) teetä on käytetty kuumeeseen, vilustumiseen, kihtiin ja reumakipuihin.'],
    other: ['Dyes yellow or green; hair rinse. Beekeepers lined hives with it.', 'Värjää keltaiseksi tai vihreäksi; hiushuuhde. Mehiläistarhaajat vuorasivat sillä pesiä.'],
    warn: ['Not for people allergic to aspirin or salicylates, children with fever, or during pregnancy.', 'Ei asetyylisalisyylihapolle yliherkille, kuumeisille lapsille eikä raskauden aikana.'],
  }),
  'rubus-arcticus': u(['fruit', 'leaves'], {
    food: ['Exquisitely aromatic berries for liqueur, jam and desserts; even a little arctic bramble juice gives other berries a wine-like depth. Leaves and berry hulls make tea, fresh or fermented.', 'Erittäin aromikkaat marjat likööreihin, hilloihin ja jälkiruokiin; pienikin määrä mesimarjamehua antaa muille marjoille viinimäisen syvyyden. Lehdistä ja marjojen kannoista saa teetä tuoreena tai hiostettuna.'],
    keep: ['Pick with the hulls on and clean just before use — hulled berries leak and spoil quickly.', 'Poimi kantoineen ja perkaa juuri ennen käyttöä — peratut marjat vuotavat ja pilaantuvat nopeasti.'],
  }, ['tea']),
  'ribes-nigrum': u(['fruit', 'leaves', 'flowers'], {
    food: ['Berries very rich in vitamin C: juice, jelly, purée, liqueur and wine (crush them to use the seeds’ gamma-linolenic acid). Leaves flavour pickled cucumbers, sauerkraut and mead, and make an excellent tea, especially fermented; flowers can be dried for tea.', 'Marjoissa on paljon C-vitamiinia: mehu, hyytelö, sose, likööri ja viini (murskaa, jotta siementen gammalinoleenihappo hyödyntyy). Lehdet maustavat suolakurkkuja, hapankaalia ja simaa ja tekevät erinomaista teetä etenkin hiostettuina; kukat voi kuivata teeksi.'],
    med: ['Leaf tea is a traditional diuretic for gout and rheumatism; berries and leaves promote sweating in colds; the berries’ flavonoids support veins.', 'Lehtitee on perinteinen virtsaneritystä lisäävä rohto kihtiin ja reumaan; marjat ja lehdet hikoiluttavat vilustuessa; marjojen flavonoidit tukevat laskimoita.'],
    keep: ['Do not strip many leaves from one bush — it weakens it.', 'Älä kerää paljon lehtiä samasta pensaasta — se heikentää pensasta.'],
    warn: ['Leave out leaves with powdery mildew.', 'Jätä pois härmäsienen saastuttamat lehdet.'],
  }, ['tea']),
  'vaccinium-myrtillus': u(['fruit', 'leaves'], {
    food: ['Sweet, low-acid berries keep poorly — freeze, dry or preserve quickly. Eat fresh or in drinks, purées, desserts, porridge and baking. Rich in vitamin A and manganese.', 'Makeat ja vähähappoiset marjat säilyvät huonosti — pakasta, kuivaa tai säilö nopeasti. Syö tuoreina tai juomissa, soseissa, jälkiruoissa, puuroissa ja leivonnaisissa. Runsaasti A-vitamiinia ja mangaania.'],
    med: ['Dried berries are a traditional (and still pharmacy-sold) remedy for diarrhoea, especially in children; berry or leaf decoction as a mouthwash; juice for people with fever.', 'Kuivatut marjat ovat perinteinen (yhä apteekissa myytävä) ripulirohto etenkin lapsille; marja- tai lehtikeite suuvetenä; mehu kuumepotilaille.'],
    warn: ['Leaves contain oxalic acid — not for people with kidney disease; leaf tea may lower blood sugar, so take care with diabetes medication.', 'Lehdissä on oksaalihappoa — ei munuaissairaille; lehtitee voi alentaa verensokeria, joten varovaisuutta diabeteslääkkeiden kanssa.'],
  }),
  'hypericum-perforatum': u(['flowers', 'leaves'], {
    med: ['A folk cure-all: flowering tops steeped in spirits ("Pirkum balsam") or in oil (red St John’s wort oil) for wounds, burns and aches; the plant is used in herbal products for mild low mood.', 'Kansan yleislääke: kukkivia latvoja uutettiin viinaan (Pirkumin palsami) tai öljyyn (punainen juhannusöljy) haavoihin, palovammoihin ja särkyihin; kasvia käytetään rohdosvalmisteissa lievään alakuloon.'],
    other: ['Dyes wool yellow and red.', 'Värjää villan keltaiseksi ja punaiseksi.'],
    keep: ['Pick flowering tops around midsummer and dry, or steep fresh in oil in the sun for a couple of weeks.', 'Kerää kukkivat latvat juhannuksen aikaan ja kuivaa, tai uuta tuoreena öljyyn aurinkoisessa paikassa pari viikkoa.'],
    warn: ['Interacts with many medicines (including contraceptive pills, anticoagulants, antidepressants and HIV drugs) and makes skin sensitive to sunlight. Check with a doctor or pharmacist before internal use.', 'Yhteisvaikutuksia monien lääkkeiden kanssa (mm. ehkäisypillerit, verenohennuslääkkeet, masennuslääkkeet ja HIV-lääkkeet) ja herkistää ihon auringolle. Tarkista lääkäriltä tai apteekista ennen sisäistä käyttöä.'],
  }, ['medicinal']),
  'origanum-vulgare': u(['leaves', 'flowers', 'buds'], {
    food: ['Add fresh at the end of cooking; dried it is milder and sweeter. Pizza, pasta and tomato dishes, meat, fish, chicken, sauces, salads, beans, cheese and aubergine; in the Finnish archipelago a traditional herb for Baltic herring. Flavours vinegar and home-brewed beer.', 'Lisää tuoreena ruoan loppuvaiheessa; kuivattuna miedompi ja makeampi. Pizzat, pasta- ja tomaattiruoat, liha, kala, kana, kastikkeet, salaatit, pavut, juusto ja munakoiso; lounaissaaristossa perinteinen silakkaruokien mauste. Maustaa etikkaa ja kaljaa.'],
    med: ['An old pharmacy herb: flowering tops for coughs, sore throat and wind; antiseptic mouthwash; externally on wounds and insect bites.', 'Vanha apteekkirohdos: kukkivat latvat yskään, kurkkukipuun ja ilmavaivoihin; antiseptinen suuvesi; ulkoisesti haavoihin ja hyönteisten pistoihin.'],
    other: ['Skin care for oily skin; dyes red; said to keep ants away.', 'Rasvaisen ihon hoitoon; värjää punaiseksi; sen sanotaan karkottavan muurahaisia.'],
    keep: ['Pick leaves, tips and buds all summer; dry bunches at the start of flowering.', 'Nypi lehtiä, latvoja ja nuppuja koko kesän; kuivaa kimput kukinnan alussa.'],
  }),
  'pinus-sylvestris': u(['needles', 'shoots', 'resin', 'bark'], {
    food: ['Needles are very rich in vitamin C: an occasional refreshing tea or cordial. The inner bark (phloem) was dried and ground into famine bread (pettu).', 'Neulasissa on erittäin paljon C-vitamiinia: satunnainen virkistävä tee tai mehu. Nilasta kuivattiin ja jauhettiin pula-ajan pettuleipää.'],
    med: ['Shoot-tip tea and a decoction of young cones are traditional cough remedies, also inhaled as steam; pine resin salve for festering wounds and nail infections; needle oil in massage and bath oils.', 'Kerkkätee ja nuorista kävyistä tehty keite ovat perinteisiä yskänrohtoja myös höyryhengitettynä; pihkasalva märkiviin haavoihin ja kynsivallin tulehduksiin; neulasöljy hieronta- ja kylpyöljyissä.'],
    warn: ['Not for long-term internal use (volatile oils). Picking needs the landowner’s permission.', 'Ei pitkäaikaiseen sisäiseen käyttöön (haihtuvat öljyt). Keräämiseen tarvitaan maanomistajan lupa.'],
  }, ['wild-harvest']),
  'urtica-dioica': u(['leaves', 'shoots', 'roots', 'seeds'], {
    food: ['One of the most nutritious greens: very rich in minerals (iron, silica), vitamin C and chlorophyll. Soup, omelette, fish soup, stuffing, bread, pancakes, tea and green powder. Pick 10–15 cm tops in spring before flowering, ideally after sunny days (less nitrate); cut plants regrow for new crops.', 'Ravitsevimpia vihanneksia: erittäin runsaasti kivennäisaineita (rauta, pii), C-vitamiinia ja lehtivihreää. Keitot, munakas, kalakeitto, täytteet, leivät, letut, tee ja viherjauhe. Poimi 10–15 cm:n latvat keväällä ennen kukintaa, mieluiten aurinkoisen jakson jälkeen (vähemmän nitraattia); niitetty kasvusto uusiutuu uusiksi sadoiksi.'],
    med: ['A traditional tonic for tiredness and a diuretic to flush the urinary tract; root preparations for benign prostate enlargement; old "nettle whipping" for gout and rheumatism.', 'Perinteinen voimistava rohto väsymykseen ja virtsateitä huuhteleva virtsaneritystä lisäävä rohto; juurivalmisteet eturauhasen liikakasvuun; vanha nokkospiiskaus kihtiin ja reumaan.'],
    other: ['Hair rinse against dandruff; nettle "tea" (fermented extract) is a classic organic fertiliser and pest spray.', 'Hiushuuhde hilseeseen; nokkoskäyte on klassinen luomulannoite ja torjunta-aine.'],
    keep: ['Blanch and freeze, or dry quickly for powder and tea.', 'Ryöppää ja pakasta tai kuivaa nopeasti jauheeksi ja teeksi.'],
    warn: ['Wear gloves; heat or drying removes the sting. Not for people who must limit fluids (heart or kidney failure).', 'Käytä hanskoja; kuumennus tai kuivaus poistaa polttavuuden. Ei sydämen tai munuaisten vajaatoiminnassa, kun nesteitä on rajoitettava.'],
  }, ['medicinal', 'tea']),
  'leonurus-cardiaca': u(['leaves', 'flowers'], {
    med: ['Flowering tops are a traditional calming remedy for nervous heart palpitations and tension — stronger than valerian — and for menopausal complaints.', 'Kukkivat latvat ovat perinteinen rauhoittava rohto hermostolliseen sydämentykytykseen ja jännitykseen — valeriaanaa voimakkaampi — sekä vaihdevuosivaivoihin.'],
    warn: both(['An official medicinal plant; do not combine with heart or blood-pressure medicines without advice.', 'Virallinen lääkekasvi; älä yhdistä sydän- tai verenpainelääkkeisiin neuvottelematta lääkärin kanssa.'], NOT_PREGNANT),
  }),
  'crataegus-monogyna': u(['flowers', 'leaves', 'fruit'], {
    food: ['Haws of some species are sweet and rich in vitamin C; those of the hawthorns common in Finnish gardens are mealy and bland but harmless.', 'Joidenkin lajien marjat ovat makeita ja C-vitamiinipitoisia; Suomen puutarhojen tavallisten orapihlajien marjat ovat jauhoisia ja mauttomia mutta vaarattomia.'],
    med: ['Flowers, leaves and haws are a classic herbal heart tonic used for a weakening heart, mild high blood pressure and nervous restlessness.', 'Kukat, lehdet ja marjat ovat klassinen sydäntä vahvistava rohto heikentyneeseen sydämeen, lievään verenpaineeseen ja hermostuneisuuteen.'],
    warn: ['Heart problems need medical care; hawthorn can interact with heart and blood-pressure medicines.', 'Sydänvaivat vaativat lääkärin hoitoa; orapihlajalla voi olla yhteisvaikutuksia sydän- ja verenpainelääkkeiden kanssa.'],
  }),

  // --- Batch 6 -------------------------------------------------------------
  'salix-purpurea': u(['bark'], {
    med: ['Bark from 2–3-year-old shoots, collected in spring, is the original salicin remedy: a decoction for fever, headache and rheumatic or gouty pain; externally on slow-healing wounds.', 'Keväällä 2–3-vuotiaista versoista kerätty kuori on alkuperäinen salisiinirohto: keite kuumeeseen, päänsärkyyn sekä reuma- ja kihtikipuihin; ulkoisesti huonosti paraneviin haavoihin.'],
    other: ['Rods for baskets, fish traps and furniture; inner bark for rope and mats; bark for tanning. Willows are grown for energy and to clean polluted soil.', 'Vitsat koreihin, mertoihin ja huonekaluihin; nila köysiin ja mattoihin; kuori parkitukseen. Pajuja kasvatetaan energiaksi ja saastuneen maan puhdistukseen.'],
    warn: ['Not for people allergic to aspirin (salicylates), children with fever, or during pregnancy.', 'Ei asetyylisalisyylihapolle yliherkille, kuumeisille lapsille eikä raskauden aikana.'],
  }),
  'fumaria-officinalis': u(['whole-plant'], {
    med: ['The flowering plant regulates bile flow and was used for digestive complaints, skin conditions and as a diuretic.', 'Kukkiva kasvi tasaa sapen eritystä, ja sitä on käytetty ruoansulatusvaivoihin, ihosairauksiin ja virtsaneritystä lisäämään.'],
    warn: ['Contains toxic alkaloids: only short courses (at most 10 days, then an equal break), never for children or during pregnancy.', 'Sisältää myrkyllisiä alkaloideja: vain lyhyinä kuureina (enintään 10 päivää, sitten yhtä pitkä tauko), ei lapsille eikä raskauden aikana.'],
  }),
  'barbarea-vulgaris': u(['leaves', 'seeds'], {
    food: ['Overwintered rosettes taste like cress: very rich in vitamin C, for salads or cooked like spinach.', 'Talvehtineet ruusukkeet maistuvat krassilta: erittäin runsaasti C-vitamiinia, salaatteihin tai pinaatin tapaan kypsennettyinä.'],
    med: ['Fresh leaves and seeds stimulate appetite and urine flow; leaves were laid on wounds ("St Barbara’s herb").', 'Tuoreet lehdet ja siemenet lisäävät ruokahalua ja virtsaneritystä; lehtiä laitettiin haavoille ("Pyhän Barbaran yrtti").'],
    warn: ['Bitter older leaves are best cooked; do not eat large amounts raw.', 'Karvaat vanhat lehdet on paras kypsentää; älä syö suuria määriä raakana.'],
  }),
  'equisetum-arvense': u(['shoots', 'whole-plant'], {
    med: ['Green summer shoots, boiled to release their abundant silica, are a traditional diuretic for urinary complaints and a tonic for skin, nails and connective tissue; compresses for slow-healing wounds.', 'Vihreät kesäversot, jotka keitetään runsaan piin irrottamiseksi, ovat perinteinen virtsaneritystä lisäävä rohto virtsatievaivoihin ja ihon, kynsien ja sidekudoksen hoitoon; kääreet huonosti paraneviin haavoihin.'],
    other: ['Rough stems scoured pots and polished wood. Face tonics, nail baths and hair rinses. A horsetail decoction strengthens garden plants against grey mould, mildew, late blight and rust.', 'Karheilla varsilla on hangattu kattiloita ja kiillotettu puuta. Kasvovedet, kynsikylvyt ja hiushuuhteet. Peltokortekeite vahvistaa puutarhakasveja harmaahometta, härmää, perunaruttoa ja ruosteita vastaan.'],
    warn: ['Not for long-term use or with heart or kidney problems; can lower vitamin B1. Marsh horsetail (E. palustre) is poisonous.', 'Ei pitkäaikaiseen käyttöön eikä sydän- tai munuaisvaivoissa; voi vähentää B1-vitamiinia. Suokorte (E. palustre) on myrkyllinen.'],
  }),
  'mentha-arvensis': u(['leaves'], {
    food: ['Fresh or dried in purées, jams and kissels, apple dishes and meat. Wild corn mint tea can be even better than cultivated mint, though flavour varies between strains.', 'Tuoreena tai kuivattuna soseisiin, hilloihin, kiisseleihin, omenaruokiin ja lihaan. Rantamintusta saa jopa viljeltyä minttua parempaa teetä, mutta maku vaihtelee kannoittain.'],
    med: ['Menthol-rich: loosens mucus, soothes mouth and throat, cools and eases itching.', 'Mentolipitoinen: irrottaa limaa, rauhoittaa suuta ja kurkkua, viilentää ja lievittää kutinaa.'],
    other: ['Traditionally used to dry up milk after weaning; cows eating much of it give less milk.', 'Perinteisesti käytetty maidontulon ehdyttämiseen imetyksen päätyttyä; paljon sitä syövät lehmät lypsävät vähemmän.'],
  }, ['tea']),
  'perilla-frutescens': u(['leaves', 'seeds'], {
    food: ['Leaves (shiso) are eaten fresh with fish and rice in East Asia; the seeds give a high-quality cooking oil.', 'Lehtiä (shiso) syödään Itä-Aasiassa tuoreina kalan ja riisin kanssa; siemenistä puristetaan laadukasta ruokaöljyä.'],
    med: ['A traditional Chinese medicine herb, used for coughs and nausea and now mainly for allergy symptoms.', 'Perinteisen kiinalaisen lääketieteen yrtti, jota on käytetty yskään ja pahoinvointiin ja nykyään lähinnä allergiaoireisiin.'],
    other: ['The fast-drying seed oil is used in paints and printing inks.', 'Nopeasti kuivuvaa siemenöljyä käytetään maaleissa ja painomusteissa.'],
    warn: ['Large amounts can cause skin sensitivity.', 'Suuret määrät voivat aiheuttaa ihon yliherkkyyttä.'],
  }),
  'petroselinum-crispum': u(['leaves', 'roots'], {
    food: ['Very rich in vitamins A and C, iron and calcium — use fresh, as heat destroys the vitamins. Suits almost everything: soups, fish, meat, eggs, pasta, rice, salads and vegetables. Root parsley’s roots go in soups and stews.', 'Erittäin runsaasti A- ja C-vitamiinia, rautaa ja kalsiumia — käytä tuoreena, sillä kuumennus tuhoaa vitamiineja. Sopii lähes kaikkeen: keitot, kala, liha, munat, pasta, riisi, salaatit ja kasvikset. Juuripersiljan juuret keittoihin ja patoihin.'],
    med: ['Leaves and root are traditional diuretics for urinary complaints and aids for wind.', 'Lehdet ja juuri ovat perinteisiä virtsaneritystä lisääviä rohtoja virtsatievaivoihin sekä ilmavaivoihin.'],
    other: ['Fresh leaves rubbed on skin were used against mosquitoes; dried stems dye green.', 'Iholle hierottuja tuoreita lehtiä käytettiin hyttysiä vastaan; kuivatuista varsista saa vihreää väriä.'],
    keep: ['Freeze chopped leaves; dried parsley is much weaker.', 'Pakasta silputut lehdet; kuivattu persilja on paljon miedompaa.'],
    warn: ['Normal kitchen use is safe, but seeds and large medicinal amounts can contract the uterus — avoid during pregnancy and with kidney disease.', 'Tavallinen keittiökäyttö on turvallista, mutta siemenet ja suuret rohtomäärät voivat supistaa kohtua — vältä raskauden aikana ja munuaissairauksissa.'],
  }),
  'tanacetum-vulgare': u(['flowers', 'leaves'], {
    food: ['Once a bitter flavouring for beer, spirits and Easter pancakes; no longer recommended because of its toxicity.', 'Ennen karvas mauste oluessa, viinassa ja pääsiäisen pannukakuissa; ei enää suositella myrkyllisyyden vuoksi.'],
    med: ['Formerly sold as a worming remedy (thujone); externally for rheumatic pain.', 'Myytiin ennen matolääkkeenä (tujoni); ulkoisesti reumakipuihin.'],
    other: ['An insect repellent: dried bunches against flies, moths and fleas, and a garden spray against pests. Keeps its colour as a dried flower; dyes yellow and green.', 'Hyönteiskarkote: kuivatut kimput kärpäsiä, koita ja kirppuja vastaan sekä ruiskute puutarhan tuholaisille. Säilyttää värinsä kuivakukkana; värjää keltaiseksi ja vihreäksi.'],
    warn: ['Poisonous (thujone): cramps, dizziness, even death; abortifacient. Do not use internally.', 'Myrkyllinen (tujoni): kouristuksia, huimausta, jopa kuoleman; abortoiva. Älä käytä sisäisesti.'],
  }),
  'plantago-major': u(['leaves', 'seeds'], {
    food: ['Young leaves in soups, salads and stews, or blanched and chopped like spinach.', 'Nuoret lehdet keittoihin, salaatteihin ja muhennoksiin tai ryöpättyinä ja hienonnettuina pinaatin tapaan.'],
    med: ['The classic wound plaster: bruised leaves on scrapes, blisters, insect bites and itchy rashes (use clean leaves). Leaf tea or syrup for coughs.', 'Klassinen haavalaastari: hierotut lehdet naarmuihin, rakkoihin, hyönteisten pistoihin ja kutiseviin ihottumiin (käytä puhtaita lehtiä). Lehtitee tai -siirappi yskään.'],
    other: ['Skin care for irritated or blemished skin and foot baths; boiled seeds once made hair-setting gel.', 'Ärtyneen tai epäpuhtaan ihon hoitoon ja jalkakylpyihin; keitetyistä siemenistä tehtiin ennen kampausnestettä.'],
  }, ['tea']),
  'stellaria-media': u(['leaves', 'shoots'], {
    food: ['A mild salad green, also for vegetable stews and dried into green powder; fairly rich in iron.', 'Mieto salaattikasvi myös kasvismuhennoksiin ja kuivattuna viherjauheeseen; melko runsaasti rautaa.'],
    med: ['Traditionally used internally for coughs, rheumatism and urinary complaints, and externally (juice or crushed plant) on wounds, chapped skin and rashes.', 'Perinteisesti sisäisesti yskään, reumaan ja virtsatievaivoihin sekä ulkoisesti (mehu tai murskattu kasvi) haavoihin, rohtumiin ja ihottumiin.'],
    other: ['Soothing compresses and masks for irritated skin and tired eyes; chickens and pigs love it.', 'Rauhoittavat hauteet ja naamiot ärtyneelle iholle ja väsyneille silmille; kanat ja siat rakastavat sitä.'],
  }),
  'armoracia-rusticana': u(['roots', 'leaves'], {
    food: ['Grated raw root with fish (horseradish pike), sauces, butter, soft cheese, beetroot and cabbage salads; pairs with lemon and mustard. Never cook it — stir into the finished dish. Young leaves in stews and salads. Keeps pickles from moulding.', 'Raastettu raaka juuri kalan kanssa (piparjuurihauki), kastikkeisiin, voihin, tuorejuustoon, punajuuri- ja kaalisalaatteihin; sopii sitruunan ja sinapin kanssa. Älä koskaan keitä — sekoita valmiiseen ruokaan. Nuoret lehdet muhennoksiin ja salaatteihin. Estää säilykkeiden homehtumista.'],
    med: ['Rich in vitamin C and an old scurvy remedy; stimulates digestion; used for colds, sinus and throat inflammation, and externally for gout and joint pain.', 'Runsaasti C-vitamiinia ja vanha keripukkilääke; edistää ruoansulatusta; käytetty vilustumiseen, poskiontelo- ja kurkkutulehduksiin sekä ulkoisesti kihtiin ja nivelkipuihin.'],
    other: ['Said to help neighbouring plants and deter pests, e.g. at the corners of a potato patch.', 'Sen sanotaan auttavan naapurikasveja ja karkottavan tuholaisia, esim. perunamaan kulmissa.'],
    keep: ['Peeled roots freeze well; grate small batches when frozen.', 'Kuoritut juuret säilyvät hyvin pakastettuina; raasta pieniä eriä jäisenä.'],
    warn: ['Very pungent: large amounts irritate the stomach and kidneys, and it can blister skin. Not for people with stomach ulcers or kidney disease, or for small children.', 'Hyvin polttava: suuret määrät ärsyttävät vatsaa ja munuaisia, ja se voi rakkuloida ihoa. Ei mahahaava- tai munuaispotilaille eikä pienille lapsille.'],
  }),
  'mentha-x-piperita': u(['leaves'], {
    food: ['The strongest mint: lamb (mint jelly), game, marinades, cooking water for beans, potatoes, carrots and peas, salads, desserts, baking, apple sauce and gooseberry jam, and drinks hot or cold.', 'Voimakkain minttu: lammas (minttuhyytelö), riista, marinadit, papujen, perunoiden, porkkanoiden ja herneiden keitinliemi, salaatit, jälkiruoat, leivonnaiset, omenasose ja karviaishillo sekä juomat kuumina tai kylminä.'],
    med: ['Peppermint tea is a classic for indigestion and wind, and for tension headache; menthol loosens mucus and cools itchy skin.', 'Piparminttutee on klassikko ruoansulatus- ja ilmavaivoihin sekä jännityspäänsärkyyn; mentoli irrottaa limaa ja viilentää kutisevaa ihoa.'],
    other: ['Used in cosmetics and toothpaste for its cooling menthol.', 'Käytetään kosmetiikassa ja hammastahnoissa viilentävän mentolin vuoksi.'],
    keep: ['Dry leaves before flowering; freeze in ice cubes.', 'Kuivaa lehdet ennen kukintaa; pakasta jääkuutioihin.'],
    warn: ['Not for long-term use. Menthol and peppermint oil must never be put on the face of babies or small children (breathing spasm risk); may worsen heartburn.', 'Ei pitkäaikaiseen käyttöön. Mentolia tai piparminttuöljyä ei saa koskaan laittaa vauvojen tai pienten lasten kasvoille (hengityskouristuksen vaara); voi pahentaa närästystä.'],
  }, ['tea']),
  'lythrum-salicaria': u(['flowers', 'shoots'], {
    food: ['Young shoots and the stem pith were eaten as a vegetable.', 'Nuoria versoja ja varren ydintä on syöty vihanneksena.'],
    med: ['Flowering tops are a traditional astringent, notably a gentle remedy for diarrhoea in children, and used for varicose problems and leg ulcers.', 'Kukkivat latvat ovat perinteinen supistava rohto, erityisesti lempeä ripulirohto lapsille, ja niitä on käytetty verisuonivaivoihin ja säärihaavoihin.'],
    other: ['Rich in tannins; used for tanning leather.', 'Runsaasti parkkiaineita; käytetty nahkojen parkitsemiseen.'],
  }),
  'rhodiola-rosea': u(['rhizome', 'leaves'], {
    food: ['Leaves can be eaten as a vegetable or made into tea; the root flavours liqueurs.', 'Lehtiä voi syödä vihanneksena tai hauduttaa teeksi; juuri maustaa liköörejä.'],
    med: ['A well-known adaptogen: the rose-scented rhizome is used in herbal products for fatigue and stress.', 'Tunnettu adaptogeeni: ruusuntuoksuista juurakkoa käytetään rohdosvalmisteissa väsymykseen ja stressiin.'],
    other: ['The root adds a rose note to potpourri.', 'Juuri antaa ruusun tuoksun tuoksusekoituksiin.'],
    warn: ['Can be stimulating (take in the morning); not with bipolar disorder or during pregnancy. Wild plants are protected in places — grow your own.', 'Voi piristää (ota aamulla); ei kaksisuuntaisessa mielialahäiriössä eikä raskauden aikana. Luonnonkannat ovat paikoin rauhoitettuja — kasvata omat.'],
  }),
  'alchemilla-vulgaris': u(['leaves', 'flowers', 'seeds', 'whole-plant'], {
    food: ['Young leaves in salads, on bread, cooked like spinach (as in Norway) or dried for tea and small amounts in baking. Best from light shade in early summer.', 'Nuoret lehdet salaattiin, leivän päälle, pinaatin tapaan kypsennettyinä (kuten Norjassa) tai kuivattuina teeksi ja pieninä määrinä leivonnaisiin. Parhaita puolivarjosta alkukesällä.'],
    med: ['Tannin-rich leaves are a traditional astringent for diarrhoea (also in children), and a long-term tea for menstrual and menopausal complaints; fresh leaves on wounds.', 'Parkkiainepitoiset lehdet ovat perinteinen supistava rohto ripuliin (myös lapsille) ja pitkäaikaisena teenä kuukautis- ja vaihdevuosivaivoihin; tuoreet lehdet haavoille.'],
    other: ['Cleansing, softening skin care for chapped hands and feet; dyes yellow and pale green.', 'Puhdistava ja pehmentävä ihonhoito rohtuneille käsille ja jaloille; värjää keltaiseksi ja vaaleanvihreäksi.'],
  }, ['tea']),
  'portulaca-oleracea': u(['leaves', 'shoots'], {
    food: ['Juicy, tangy, slightly salty leaves and tips before flowering: salads, soft cheese, herb butter, dips and sandwiches. Older leaves are better cooked like spinach; stems and thick leaves can be pickled. Picking keeps plants bushy.', 'Mehevät, kirpeät ja hieman suolaiset lehdet ja latvat ennen kukintaa: salaatit, tuorejuusto, yrttivoi, dipit ja voileivät. Vanhemmat lehdet on parempi kypsentää pinaatin tapaan; varret ja paksut lehdet voi säilöä pikkelssiksi. Nyppiminen tuuhentaa kasvia.'],
    med: ['Wild purslane is extremely rich in vitamin C and was used against scurvy and as a mild diuretic; the garden form is milder.', 'Villi portulakka on erittäin C-vitamiinipitoinen, ja sitä on käytetty keripukkiin ja miedosti virtsaneritystä lisäävänä; viljelty muoto on miedompi.'],
    warn: ['Contains oxalic acid — eat in moderation with kidney-stone tendency.', 'Sisältää oksaalihappoa — kohtuudella munuaiskivitaipumuksessa.'],
  }),
  'trifolium-pratense': u(['flowers', 'leaves'], {
    food: ['Young leaves (rich in protein and vitamin C) for salads, soups and stews. Flowers make a safe everyday tea and even wine; dried, ground flowers were added to bread in hard times.', 'Nuoret lehdet (runsaasti valkuaista ja C-vitamiinia) salaatteihin, keittoihin ja muhennoksiin. Kukista saa turvallista arkiteetä ja jopa viiniä; kuivattuja jauhettuja kukkia lisättiin pula-aikoina leipään.'],
    med: ['Flower tea is a traditional expectorant for coughs and a mild diuretic; externally for wounds and skin.', 'Kukkatee on perinteinen limaa irrottava yskänrohto ja mieto virtsaneritystä lisäävä rohto; ulkoisesti haavoihin ja iholle.'],
    other: ['Face tonics, skin oils and baths; fresh leaves dye pale yellow-green.', 'Kasvovedet, ihoöljyt ja kylvyt; tuoreista lehdistä saa vaalean kellanvihreää väriä.'],
    warn: ['Its isoflavones act like weak oestrogens — avoid concentrated preparations during pregnancy or with hormone-sensitive conditions.', 'Sen isoflavonit toimivat heikkojen estrogeenien tapaan — vältä väkeviä valmisteita raskauden aikana ja hormoniherkissä sairauksissa.'],
  }, ['tea']),

  // --- Batch 7 -------------------------------------------------------------
  'ribes-rubrum': u(['fruit', 'leaves'], {
    food: ['Acidic berries for juice, jam, jelly and freezing; pick firm in July for jelly. The leaves are very rich in vitamin C — use fresh or dried in tea blends, or finely chopped in salads.', 'Happamat marjat mehuun, hilloon, hyytelöön ja pakasteeksi; hyytelöä varten poimi kovina heinäkuussa. Lehdissä on erittäin paljon C-vitamiinia — käytä tuoreina tai kuivattuina teesekoituksissa tai hienoksi silputtuina salaateissa.'],
    med: ['Berries aid digestion and are mildly diuretic.', 'Marjat edistävät ruoansulatusta ja lisäävät lievästi virtsaneritystä.'],
  }, ['tea']),
  'vaccinium-vitis-idaea': u(['fruit', 'leaves'], {
    food: ['Tart berries keep as a raw crush without sugar thanks to natural benzoic acid (unripe berries spoil quickly). Mellow the crush with carrot, kohlrabi or courgette; make nectar, jelly, jam, wine, or dried berries for baking. Apple-lingonberry jam suits many dishes.', 'Kirpeät marjat säilyvät raakasurvoksena ilman sokeria luontaisen bentsoehapon ansiosta (raa’at marjat pilaantuvat nopeasti). Miedonna survosta porkkanalla, kyssäkaalilla tai kesäkurpitsalla; tee nektaria, hyytelöä, hilloa, viiniä tai kuivaa marjoja leivontaan. Omena-puolukkahillo sopii moneen ruokaan.'],
    med: ['Leaves gathered in early spring or late autumn are a traditional urinary antiseptic (arbutin), like bearberry.', 'Varhain keväällä tai myöhään syksyllä kerätyt lehdet ovat perinteinen virtsateiden antiseptinen rohto (arbutiini) sianpuolukan tapaan.'],
    warn: ['Leaf remedies only for short periods (about a week), not during pregnancy or for children.', 'Lehtirohtoja vain lyhytaikaisesti (noin viikko), ei raskauden aikana eikä lapsille.'],
  }),
  'artemisia-dracunculus': u(['leaves', 'shoots'], {
    food: ['Strong and distinctive — use carefully or it dominates and turns bitter. A French classic (fines herbes, béarnaise, hollandaise, tartare, tarragon vinegar) for chicken, fish, meat and eggs; also cauliflower and cabbages, root vegetables, asparagus, tomato, mushrooms, cheese and herb butter. Best fresh.', 'Voimakas ja omalaatuinen — käytä varoen, ettei se hallitse ja kitkeröitä ruokaa. Ranskalainen klassikko (fines herbes, bearnaise, hollandaise, tartar, rakuunaetikka) kanaan, kalaan, lihaan ja munaruokiin; myös kukkakaaliin ja kaaleihin, juureksiin, parsaan, tomaattiin, sieniin, juustoon ja yrttivoihin. Paras tuoreena.'],
    med: ['Stimulates appetite and digestion.', 'Lisää ruokahalua ja edistää ruoansulatusta.'],
    keep: ['Freeze or preserve in vinegar; dried tarragon loses much aroma.', 'Pakasta tai säilö etikkaan; kuivattu rakuuna menettää paljon aromistaan.'],
    warn: ['Its pollen can cause reactions in people allergic to mugwort (dried leaves harvested before flowering are usually fine).', 'Siitepöly voi aiheuttaa oireita pujoallergisille (ennen kukintaa korjattu kuivattu rakuuna on yleensä ongelmaton).'],
  }),
  'lysimachia-vulgaris': u(['leaves', 'flowers', 'roots'], {
    med: ['Little used in Finland; in Central Europe the late-summer leaves and flowers were used as an astringent for wounds and bleeding, and as an eyewash.', 'Suomessa vähän käytetty; Keski-Euroopassa loppukesän lehtiä ja kukkia on käytetty supistavana rohtona haavoihin ja verenvuotoihin sekä silmävetenä.'],
    other: ['Roots dye brown and leaves yellow; a flower decoction lightens hair; burnt as a mosquito smudge.', 'Juurista saa ruskeaa ja lehdistä keltaista väriä; kukkakeitteellä on vaalennettu hiuksia; poltettu hyttyssavuna.'],
  }),
  'tanacetum-parthenium': u(['leaves', 'flowers'], {
    med: ['Leaves are a traditional preventive for migraine and used for arthritic pain.', 'Lehdet ovat perinteinen migreenin ennaltaehkäisyn rohto, ja niitä on käytetty nivelkipuihin.'],
    warn: both(['Can cause allergy (daisy family); chewing fresh leaves for long periods often causes mouth ulcers. Do not combine with anticoagulants.', 'Voi aiheuttaa allergiaa (asterikasvi); tuoreiden lehtien pitkäaikainen pureskelu aiheuttaa usein suun haavaumia. Ei verenohennuslääkkeiden kanssa.'], NOT_PREGNANT),
  }, ['medicinal']),
  'symphytum-officinale': u(['roots', 'leaves'], {
    med: ['The classic "knitbone": root and leaf compresses and ointments (allantoin, mucilage) for bruises, sprains, fractures and slow wounds, and rheumatic pain.', 'Klassinen luunmurtumien yrtti: juuri- ja lehtihauteet ja -voiteet (allantoiini, lima-aineet) mustelmiin, nyrjähdyksiin, murtumiin, huonosti paraneviin haavoihin ja reumakipuihin.'],
    other: ['Protein- and potassium-rich leaves make excellent mulch, compost activator and liquid feed — especially for tomatoes and potatoes. Once used as fodder.', 'Valkuais- ja kaliumpitoiset lehdet ovat erinomaista katetta, kompostin tehostetta ja nestelannoitetta — etenkin tomaatille ja perunalle. Käytetty ennen rehuna.'],
    warn: ['Contains liver-damaging pyrrolizidine alkaloids: do not eat or drink it; external use on unbroken skin only, for short periods. Not during pregnancy or for children.', 'Sisältää maksalle haitallisia pyrrolitsidiinialkaloideja: älä syö tai juo sitä; vain ulkoisesti ehjälle iholle lyhytaikaisesti. Ei raskauden aikana eikä lapsille.'],
  }),
  'althaea-officinalis': u(['roots', 'leaves', 'flowers'], {
    food: ['Stems in salads; roots fried in butter; dried ground root once made the original marshmallow sweets.', 'Varret salaattiin; juuret voissa paistettuina; kuivatusta jauhetusta juuresta tehtiin alkuperäiset vaahtokarkit.'],
    med: ['Mucilage-rich root (a cold-water extract) and flower-leaf tea soothe irritating coughs, hoarseness and an irritated gut.', 'Lima-ainepitoinen juuri (kylmävesiuute) sekä kukka- ja lehtitee rauhoittavat ärsytysyskää, käheyttä ja ärtynyttä suolistoa.'],
    keep: ['Pick flowers at the start of flowering (early July), leaves after; lift and peel roots of two-year-old plants in autumn.', 'Kerää kukat kukinnan alkaessa (heinäkuun alussa) ja lehdet sen jälkeen; nosta ja kuori kaksivuotiaiden kasvien juuret syksyllä.'],
    warn: ['Take a couple of hours apart from other medicines (mucilage can slow their absorption).', 'Ota parin tunnin erolla muista lääkkeistä (lima-aineet voivat hidastaa niiden imeytymistä).'],
  }, ['medicinal']),
  'valeriana-officinalis': u(['roots'], {
    med: ['The classic calming herb: the root of 2–3-year-old plants is used for sleeplessness, anxiety, tension headache and cramps.', 'Klassinen rauhoittava yrtti: 2–3-vuotiaiden kasvien juurta käytetään unettomuuteen, levottomuuteen, jännityspäänsärkyyn ja kouristuksiin.'],
    other: ['Cats are attracted to the smell.', 'Tuoksu houkuttelee kissoja.'],
    keep: ['Lift roots in autumn, wash and dry gently; the strong smell develops as they dry.', 'Nosta juuret syksyllä, pese ja kuivaa miedossa lämmössä; voimakas haju kehittyy kuivuessa.'],
    warn: ['Causes drowsiness — do not drive; do not combine with alcohol or sleeping pills.', 'Aiheuttaa uneliaisuutta — älä aja autoa; älä yhdistä alkoholiin tai unilääkkeisiin.'],
  }, ['medicinal']),
  'salvia-rosmarinus': u(['leaves', 'flowers'], {
    food: ['Above all for meat and marinades — lamb and game — and potatoes, mushrooms, pasta, tomato and pea soup, dressings, pickling liquids and even white wine. Strongest at flowering; keeps its aroma well dried. Goes with parsley, chervil and onions.', 'Ennen kaikkea liharuokiin ja marinadeihin — lammas ja riista — sekä perunaan, sieniin, pastaan, tomaattiin ja hernekeittoon, kastikkeisiin, säilöntäliemiin ja jopa valkoviiniin. Voimakkain kukinnan aikaan; säilyttää aromin hyvin kuivattuna. Sopii persiljan, kirvelin ja sipulien kanssa.'],
    med: ['In baths and ointments it warms and stimulates circulation, easing rheumatic and nerve pain ("Hungary water").', 'Kylvyissä ja voiteissa se lämmittää ja vilkastuttaa verenkiertoa, lievittäen reuma- ja hermosärkyjä ("Unkarin kuningattaren vesi").'],
    other: ['Oil for perfume and soap; woody stems as barbecue skewers, and burnt to repel insects.', 'Öljy hajuvesiin ja saippuaan; puutuneet varret grillivartaiksi ja poltettuina hyönteiskarkotteeksi.'],
    warn: ['Kitchen amounts are safe, but large amounts can cause cramps and miscarriage — no medicinal use for children or during pregnancy.', 'Ruoanlaittomäärät ovat turvallisia, mutta suuret määrät voivat aiheuttaa kouristuksia ja keskenmenon — ei rohtokäyttöä lapsille eikä raskauden aikana.'],
  }),
  'allium-schoenoprasum': u(['leaves', 'flowers'], {
    food: ['Mild onion flavour for salads, soups, sauces, omelettes, sandwiches and herring; part of fines herbes. Add to finished dishes to keep its vitamin C, iron and carotene. Flowers decorate the table.', 'Mieto sipulin maku salaatteihin, keittoihin, kastikkeisiin, munakkaisiin, voileipiin ja sillin kanssa; osa fines herbes -seosta. Lisää valmiiseen ruokaan, jotta C-vitamiini, rauta ja karoteeni säilyvät. Kukat koristeeksi.'],
    med: ['Once used for breathlessness and coughs.', 'Käytetty ennen hengenahdistukseen ja yskään.'],
    keep: ['Freezing is better than drying.', 'Pakastaminen on parempi kuin kuivaus.'],
  }, ['edible-flowers']),
  'rosa-rugosa': u(['fruit', 'flowers', 'leaves', 'seeds'], {
    food: ['Pick hips fully ripe but still firm; remove stalk, calyx and seeds (hairy seeds irritate). For kissel, soup, purée and wine; dried hips, leaves and petals make tea; roasted seeds a coffee substitute. Fresh petals in salads, pies and on cakes.', 'Poimi kiulukat täysin kypsinä mutta vielä kovina; poista kanta, verholehdet ja siemenet (karvaiset siemenet ärsyttävät). Kiisseliin, keittoon, soseeseen ja viiniin; kuivatuista kiulukoista, lehdistä ja terälehdistä saa teetä; paahdetuista siemenistä kahvinkorviketta. Tuoreet terälehdet salaattiin, piirakoihin ja kakkujen päälle.'],
    med: ['Vitamin C-rich hips are a traditional tonic for fevers and spring tiredness; astringent against diarrhoea.', 'C-vitamiinipitoiset kiulukat ovat perinteinen voimistava rohto kuumetauteihin ja kevätväsymykseen; supistavina ripuliin.'],
    other: ['Petals and hips in soothing skin care, baths and potpourri.', 'Terälehdet ja kiulukat ihoa rauhoittavaan kosmetiikkaan, kylpyihin ja tuoksusekoituksiin.'],
    warn: ['Rugosa rose is an invasive alien species in Finland: do not plant new stands, and do not let hips spread seed.', 'Kurtturuusu on Suomessa haitallinen vieraslaji: älä istuta uusia kasvustoja äläkä anna kiulukoiden levittää siemeniä.'],
  }, ['rose-hips']),
  'ruta-graveolens': u(['leaves', 'shoots'], {
    food: ['Dried leaves and shoot tips were used very sparingly with meat, eggs, mushrooms and salads; safer herbs such as savory or oregano can replace it.', 'Kuivattuja lehtiä ja versojen latvoja käytettiin hyvin säästeliäästi lihan, munien, sienten ja salaattien kanssa; turvallisemmat yrtit, kuten kynteli tai mäkimeirami, korvaavat sen.'],
    med: ['An ancient remedy for rheumatism, gout and nervous complaints; today not for home use.', 'Ikivanha rohto reumaan, kihtiin ja hermostollisiin vaivoihin; nykyään ei kotikäyttöön.'],
    warn: both(['Poisonous in larger amounts and abortifacient. The sap makes skin burn and blister in sunlight (phytophotodermatitis).', 'Suurina määrinä myrkyllinen ja abortoiva. Kasvineste saa ihon palamaan ja rakkuloimaan auringonvalossa (valoihottuma).'], NOT_PREGNANT),
  }),
  'potentilla-erecta': u(['roots'], {
    food: ['The root has flavoured spirits.', 'Juurella on maustettu viinaa.'],
    med: ['One of the strongest tannin remedies: a root decoction for diarrhoea, as a gargle for inflamed gums and throat, and for haemorrhoids.', 'Voimakkaimpia parkkiainerohtoja: juurikeite ripuliin, kurlausvetenä ien- ja kurkkutulehduksiin sekä peräpukamiin.'],
    other: ['Used to tan and dye leather red; stems and leaves dye yellow and brown.', 'Käytetty nahan parkitsemiseen ja punaiseksi värjäämiseen; varsista ja lehdistä saa keltaista ja ruskeaa väriä.'],
    warn: ['Very astringent — only for short periods; can upset a sensitive stomach.', 'Hyvin supistava — vain lyhytaikaisesti; voi ärsyttää herkkää vatsaa.'],
  }),
  'myrrhis-odorata': u(['leaves', 'roots', 'seeds'], {
    food: ['Sweet anise flavour: young leaves in salads, sauces, soups, vegetable, egg, mushroom and fish dishes and cabbage water; the sweet root raw or in stews; green seeds in salads, tea or chewed as a sweet. Reduces the sugar needed in desserts, pies and preserves.', 'Makea anismainen maku: nuoret lehdet salaatteihin, kastikkeisiin, keittoihin, kasvis-, muna-, sieni- ja kalaruokiin sekä kaalin keitinveteen; makea juuri raakana tai muhennoksiin; vihreät siemenet salaattiin, teeksi tai pureskeltaviksi makeisina. Vähentää sokerin tarvetta jälkiruoissa, piirakoissa ja säilykkeissä.'],
    med: ['A gentle digestive, mildly antiseptic and diuretic; suits sensitive stomachs.', 'Hellävarainen ruoansulatusta edistävä yrtti, lievästi antiseptinen ja virtsaneritystä lisäävä; sopii herkälle vatsalle.'],
    keep: ['Use fresh or freeze — it loses flavour quickly when dried.', 'Käytä tuoreena tai pakasta — kuivattuna maku katoaa nopeasti.'],
  }),
  'salvia-officinalis': u(['leaves', 'flowers'], {
    food: ['Cuts the fattiness of food and brings out its own flavour: sauces, chops, soups, stocks, minced meat, pasta and risotto, cabbage, onion and bean dishes. Pairs with rosemary; parsley softens it.', 'Poistaa ruoasta rasvaisen maun ja korostaa sen omaa makua: kastikkeet, kyljykset, keitot, lihaliemet, jauheliha, pasta ja risotto, kaali-, sipuli- ja papuruoat. Sopii rosmariinin kanssa; persilja miedontaa.'],
    med: ['Leaf tea or gargle for sore throat and inflamed gums; a traditional remedy for excessive sweating and menopausal hot flushes, and to dry up milk when weaning.', 'Lehtitee tai kurlausvesi kurkkukipuun ja ientulehdukseen; perinteinen rohto liikahikoiluun ja vaihdevuosien kuumiin aaltoihin sekä maidontulon ehdyttämiseen imetyksen loppuessa.'],
    other: ['Face tonics and baths for irritated skin; darkens hair; a natural deodorant.', 'Kasvovedet ja kylvyt ärtyneelle iholle; tummentaa hiuksia; luonnondeodorantti.'],
    keep: ['Dry leaves before flowering; they keep their aroma well.', 'Kuivaa lehdet ennen kukintaa; ne säilyttävät aromin hyvin.'],
    warn: ['Contains thujone: fine in cooking, but no long-term medicinal use; not during pregnancy or breastfeeding, or with epilepsy.', 'Sisältää tujonia: ruoanlaitossa ongelmaton, mutta ei pitkäaikaiseen rohtokäyttöön; ei raskauden tai imetyksen aikana eikä epilepsiassa.'],
  }, ['medicinal']),
  'achillea-millefolium': u(['leaves', 'flowers', 'shoots'], {
    food: ['Leaves add a sharp, bitter note to salads, sauces, soups, stews and herb salt, and help digest fatty food. Young shoots and buds flavour cheese and drinks; once used in beer before hops.', 'Lehdet antavat kirpeän karvaan vivahteen salaatteihin, kastikkeisiin, keittoihin, patoihin ja yrttisuolaan ja auttavat rasvaisen ruoan sulamista. Nuoret versot ja nuput maustavat juustoja ja juomia; käytetty oluessa ennen humalaa.'],
    med: ['A "cure-all" alongside chamomile and the classic wound herb that stops bleeding; tea for indigestion, menstrual cramps and colds.', 'Kamomillan ohella "yleislääke" ja klassinen verenvuotoa tyrehdyttävä haavayrtti; tee ruoansulatusvaivoihin, kuukautiskipuihin ja vilustumiseen.'],
    other: ['Skin care for oily, blemished skin and hair; a compost activator and biodynamic preparation plant.', 'Rasvaisen ja näppyläisen ihon ja hiusten hoitoon; kompostin tehostaja ja biodynaaminen preparaattikasvi.'],
    warn: both(['Can cause allergy and sun sensitivity in people sensitive to daisy-family plants.', 'Voi aiheuttaa allergiaa ja valoherkkyyttä asterikasveille herkille.'], NOT_PREGNANT),
  }, ['medicinal']),

  // --- Batch 8 -------------------------------------------------------------
  'arctostaphylos-uva-ursi': u(['leaves', 'fruit'], {
    food: ['Mealy berries were boiled, mashed and added to bread in hard times, or made into vinegar and syrup.', 'Jauhoisia marjoja keitettiin, survottiin ja lisättiin pula-aikoina leipään tai niistä tehtiin etikkaa ja siirappia.'],
    med: ['Leaves (gathered in early summer) are the classic urinary antiseptic (arbutin) for bladder infections; most effective with plenty of fluids and vegetables.', 'Alkukesällä kerätyt lehdet ovat klassinen virtsateiden antiseptinen rohto (arbutiini) rakkotulehduksiin; tehokkain runsaan nesteen ja kasvisten kanssa.'],
    other: ['Tannin-rich shoots tanned leather ("kangasparkki"); leaves dye dark grey.', 'Parkkiainepitoisilla versoilla parkittiin nahkaa ("kangasparkki"); lehdistä saa tummanharmaata väriä.'],
    warn: ['At most one week at a time and a few times a year; not during pregnancy or breastfeeding, for children, or with kidney disease.', 'Enintään viikko kerrallaan ja muutaman kerran vuodessa; ei raskauden tai imetyksen aikana, lapsille eikä munuaissairauksissa.'],
  }),
  'melissa-officinalis': u(['leaves'], {
    food: ['A herb for salads and drinks and anything that suits lemon: vegetables, fish, meat, game, poultry, omelettes, beans, peas and asparagus; fruit salad, yoghurt, kissel, marmalade, jelly and apple sauce. Especially good in rhubarb drinks.', 'Salaattien ja juomien yrtti ja mauste kaikkeen, mihin sopii sitruuna: kasvikset, kala, liha, riista, linnut, munakkaat, pavut, herneet ja parsa; hedelmäsalaatti, jogurtti, kiisselit, marmeladit, hyytelöt ja omenasose. Erityisen hyvä raparperijuomissa.'],
    med: ['A calming tea for nervous stomach, cramps, menstrual pain and sleeplessness, often in evening blends; fresh leaves soothe insect bites.', 'Rauhoittava tee hermostuneeseen vatsaan, kouristuksiin, kuukautiskipuihin ja unettomuuteen, usein iltateesekoituksissa; tuoreet lehdet lievittävät hyönteisten pistoja.'],
    other: ['Clarifying skin care for oily skin; potpourri. Rubbing hives with it calms bees.', 'Kirkastava ihonhoito rasvaiselle iholle; tuoksusekoitukset. Pesän hankaaminen sillä rauhoittaa mehiläisiä.'],
    keep: ['Freezing, oil or vinegar keeps the flavour best — drying weakens it quickly.', 'Pakastus, öljy tai etikka säilyttää maun parhaiten — kuivaus laimentaa sen nopeasti.'],
    warn: ['Not in large amounts with an underactive thyroid or thyroid medication.', 'Ei suuria määriä kilpirauhasen vajaatoiminnassa tai kilpirauhaslääkityksen kanssa.'],
  }, ['tea']),
  'rumex-acetosa': u(['leaves', 'roots'], {
    food: ['Sour-salty leaves in small amounts raw in salads, or blanched in greater amounts (the oxalic acid goes into the water); famous in French sorrel soup. Best in early summer before flowering. Dairy on the same plate neutralises the oxalic acid. The Sámi soured milk with it.', 'Happamen suolaiset lehdet pieninä määrinä raakana salaatteihin tai ryöpättyinä runsaammin (oksaalihappo liukenee veteen); kuuluisa ranskalainen suolaheinäkeitto. Parhaimmillaan alkukesällä ennen kukintaa. Samalla aterialla nautitut maitotuotteet neutraloivat oksaalihappoa. Saamelaiset hapattivat sillä maitoa.'],
    med: ['Mildly laxative and diuretic, stimulates appetite; its vitamin C was used against scurvy.', 'Miedosti ulostava ja virtsaneritystä lisäävä, lisää ruokahalua; C-vitamiininsa vuoksi käytetty keripukkiin.'],
    other: ['Roots dye yellow; the acid leaves clean wicker, polish silver and lift ink stains.', 'Juurista saa keltaista väriä; happamilla lehdillä puhdistetaan korihuonekaluja, kiillotetaan hopeaa ja poistetaan mustetahroja.'],
    warn: ['Oxalic acid binds calcium: not for children or people with rheumatism, gout or kidney disease; large amounts can cause kidney stones.', 'Oksaalihappo sitoo kalsiumia: ei lapsille eikä reumaa, kihtiä tai munuaistautia sairastaville; suuret määrät voivat aiheuttaa munuaiskiviä.'],
  }),
  'myrica-gale': u(['leaves', 'shoots'], {
    food: ['Flavoured beer before hops (with a notorious headache afterwards) and liqueurs, e.g. Riga Black Balsam.', 'Maustoi olutta ennen humalaa (pahamaineisella päänsäryllä) ja liköörejä, esim. Riian mustaa balsamia.'],
    med: ['Once an apothecary herb for stomach and heart complaints; no longer recommended.', 'Aikoinaan apteekkirohto vatsa- ja sydänvaivoihin; ei enää suositella.'],
    other: ['A leaf decoction repels clothes moths and vermin; bark for tanning; fresh leaves dye yellow with alum.', 'Lehtikeitteellä karkotetaan koita ja syöpäläisiä; kuori parkitukseen; tuoreista lehdistä saa alunan kanssa keltaista väriä.'],
    warn: ['Poisonous — do not use internally.', 'Myrkyllinen — älä käytä sisäisesti.'],
  }),
  'rhododendron-tomentosum': u(['shoots', 'leaves'], {
    food: ['Once added to beer for extra potency — with confusion and a severe hangover as the result.', 'Lisättiin ennen olueen tehoa antamaan — seurauksena sekavuus ja kova krapula.'],
    med: ['Traditionally used for coughs and rheumatism; today only cautious external use (baths, compresses, oil) for aches is considered acceptable.', 'Perinteisesti käytetty yskään ja reumaan; nykyään vain varovainen ulkoinen käyttö (kylvyt, hauteet, öljy) kolotuksiin katsotaan hyväksyttäväksi.'],
    other: ['Branches kept moths out of storehouses and wardrobes; a decoction washed vermin from animals; dyes green, yellow and brown.', 'Oksilla on torjuttu koita aitoissa ja vaatekaapeissa; keitteellä on pesty syöpäläisiä kotieläimistä; värjää vihreäksi, keltaiseksi ja ruskeaksi.'],
    warn: ['All parts are poisonous (a nerve toxin): never use internally; the strong scent causes headache.', 'Kaikki osat ovat myrkyllisiä (hermomyrkky): älä koskaan käytä sisäisesti; voimakas tuoksu aiheuttaa päänsärkyä.'],
  }),
  'thymus-vulgaris': u(['leaves', 'flowers'], {
    food: ['Keeps its flavour through long cooking: meat, poultry, fish, eggs, pasta, cabbage rolls, pea soup, sauces, marinades and vegetable stews — especially dishes with wine. Flowers decorate salads. Makes a herbal tea (soften with blackcurrant leaves or clover flowers).', 'Säilyttää makunsa pitkässäkin kypsennyksessä: liha, siipikarja, kala, munat, pasta, kaalikääryleet, hernekeitto, kastikkeet, marinadit ja kasvispadat — etenkin viiniruoat. Kukat koristavat salaatteja. Yrttitee (miedonna mustaherukan lehdillä tai apilan kukilla).'],
    med: ['Flowering-shoot tea or thyme syrup is a classic remedy for coughs, bronchitis and laryngitis; strongly antiseptic (thymol); steam opens the airways; eases digestive cramps.', 'Kukkivista versoista tehty tee tai timjamisiirappi on klassinen rohto yskään, keuhkoputken- ja kurkunpääntulehdukseen; voimakkaasti antiseptinen (tymoli); höyry avaa hengitysteitä; lievittää vatsan kouristuksia.'],
    other: ['Face tonics and steams that cleanse skin; thymol is used in mouthwash and toothpaste.', 'Ihoa puhdistavat kasvovedet ja höyrytykset; tymolia käytetään suuvesissä ja hammastahnoissa.'],
    warn: ['Very large doses can cause vomiting; do not take the essential oil internally.', 'Hyvin suuret annokset voivat aiheuttaa oksentelua; eteeristä öljyä ei saa nauttia sisäisesti.'],
  }, ['medicinal']),
  'anethum-graveolens': u(['leaves', 'flowers', 'seeds'], {
    food: ['Leaves fresh, dried or frozen with boiled potatoes, fish, salads, sauces and soups; the aroma peaks in seedlings under 10 cm and again in flowering "crown dill", used for cucumber pickles. Seeds for preserves, marinades, bread, meat and Baltic herring dishes.', 'Lehdet tuoreina, kuivattuina tai pakastettuina keitettyjen perunoiden, kalan, salaattien, kastikkeiden ja keittojen kanssa; aromia on eniten alle 10-senttisissä taimissa ja jälleen kukkivassa kruunutillissä, jota käytetään kurkkusäilykkeisiin. Siemenet säilykkeisiin, marinadeihin, leipään, lihaan ja silakkaruokiin.'],
    med: ['Seeds are a traditional digestive that eases wind and cramps; dill tea is believed to increase milk supply.', 'Siemenet ovat perinteinen ruoansulatusta edistävä ja ilmavaivoja ja kouristuksia lievittävä rohto; tilliteen uskotaan lisäävän maidoneritystä.'],
    keep: ['Freeze chopped leaves; dry seed heads when brown.', 'Pakasta silputut lehdet; kuivaa siemenhuiskilot ruskeina.'],
  }),
  'hippophae-rhamnoides': u(['fruit', 'leaves', 'seeds'], {
    food: ['Juice, jelly, jam and liqueurs. Extremely rich in vitamin C and carotenoids, which keep well in preserves; the seed oil is rich in vitamin E. A slightly rancid note comes from the fatty acids.', 'Mehut, hyytelöt, hillot ja liköörit. Erittäin runsaasti C-vitamiinia ja karotenoideja, jotka säilyvät hyvin säilykkeissä; siemenöljyssä on runsaasti E-vitamiinia. Hieman härski vivahde johtuu rasvahapoista.'],
    med: ['Berries against scurvy and, being astringent, diarrhoea; sea-buckthorn oil is used for burns, bedsores and irritated mucous membranes, notably in Russian and Chinese tradition.', 'Marjat keripukkiin ja supistavina ripuliin; tyrniöljyä käytetään palovammoihin, makuuhaavoihin ja ärtyneille limakalvoille, etenkin venäläisessä ja kiinalaisessa perinteessä.'],
    other: ['The berries dye linen and wool yellow.', 'Marjoilla on värjätty pellavaa ja villaa keltaiseksi.'],
    keep: ['Freeze whole branches and knock the frozen berries off.', 'Pakasta kokonaisia oksia ja karista jäiset marjat irti.'],
  }),
  'verbascum-thapsus': u(['flowers', 'leaves'], {
    med: ['Flower tea is a traditional remedy for coughs, hoarseness and chest complaints (folk names "cough herb"); flowers steeped in olive oil made an ear-ache oil.', 'Kukkatee on perinteinen rohto yskään, käheyteen ja rintavaivoihin (kansanomaisesti "köhäruoho"); oliiviöljyyn uutetuista kukista tehtiin korvasärkyöljyä.'],
    other: ['Roman women dyed hair golden with the flowers; the dried plant deters mice.', 'Roomalaiset naiset värjäsivät kukilla hiuksensa kullankeltaisiksi; kuivattu kasvi karkottaa hiiriä.'],
    keep: ['Strain tea through a fine cloth — the tiny hairs irritate the throat.', 'Siivilöi tee tiheän liinan läpi — pienet karvat ärsyttävät kurkkua.'],
    warn: ['The seeds are poisonous (once used to stun fish).', 'Siemenet ovat myrkyllisiä (niillä on tainnutettu kaloja).'],
  }),
  'rubus-idaeus': u(['fruit', 'leaves', 'shoots'], {
    food: ['Berries fresh, as juice and jam, syrup, wine, liqueur and vinegar. Young leaves and buds in spring salads; leaves (very rich in vitamin C) make an excellent tea, best fermented. Pick from first-year canes all summer.', 'Marjat tuoreina, mehuina ja hilloina, siirappina, viininä, likööreinä ja etikkana. Nuoret lehdet ja nuput keväällä salaattiin; lehdistä (erittäin runsaasti C-vitamiinia) saa erinomaista teetä, parhaiten hiostettuna. Kerää ensimmäisen vuoden versoista koko kesän.'],
    med: ['Astringent leaf tea for diarrhoea; dried berry tea or syrup promotes sweating in colds and fever. Leaf tea is traditionally taken late in pregnancy.', 'Supistava lehtitee ripuliin; kuivatuista marjoista tehty tee tai siirappi hikoiluttaa vilustuessa ja kuumeessa. Lehtiteetä on perinteisesti juotu loppuraskaudessa.'],
    warn: ['Leaf tea in pregnancy only late and after checking with a midwife.', 'Lehtiteetä raskauden aikana vasta loppuvaiheessa ja kätilön kanssa sovittuna.'],
  }, ['tea']),
  'trifolium-repens': u(['leaves', 'flowers', 'roots'], {
    food: ['Young leaves (rich in vitamin C and protein) for salads, soups and stews; flowers for a mild tea; the tap root was steamed and eaten with butter.', 'Nuoret lehdet (runsaasti C-vitamiinia ja valkuaista) salaatteihin, keittoihin ja muhennoksiin; kukista mietoa teetä; pääjuurta on höyrytetty ja syöty voin kanssa.'],
    med: ['Flower tea was used as a diuretic for rheumatism and gout, and as a general tonic.', 'Kukkateetä on käytetty virtsaneritystä lisäävänä rohtona reumaan ja kihtiin sekä yleiskuntoa kohentavana.'],
    other: ['Fresh leaves dye pale yellow-green; a major bee plant.', 'Tuoreista lehdistä saa vaalean kellanvihreää väriä; tärkeä mesikasvi.'],
  }, ['tea']),
  'lamium-album': u(['shoots', 'flowers', 'leaves'], {
    food: ['Young shoots are cooked like nettle in soups and stews (milder, and without the sting).', 'Nuoret versot kypsennetään nokkosen tapaan keittoihin ja muhennoksiin (miedompi, eikä polta).'],
    med: ['Flowers or flowering shoots are a traditional astringent women’s herb (menstrual problems, discharge) and a "blood-cleansing" tea; compresses for wounds.', 'Kukat tai kukkivat versot ovat perinteinen supistava naistenyrtti (kuukautisvaivat, valkovuoto) ja "verta puhdistava" tee; hauteet haavoille.'],
    other: ['Dyes yellow.', 'Värjää keltaiseksi.'],
    keep: ['Dry the flowers so they stay white; store dry to prevent mould.', 'Kuivaa kukat niin, että ne pysyvät valkoisina; säilytä kuivana homeen estämiseksi.'],
  }),
  'mentha-spicata': u(['leaves'], {
    food: ['Milder than peppermint, so good fresh: mint sauce and jelly for lamb, salads, sauces, warm potato and vegetable dishes; decorates desserts and baking; an excellent tea hot or iced.', 'Piparminttua miedompi, joten sopii tuoreena: minttukastike ja -hyytelö lampaalle, salaatit, kastikkeet, lämpimät peruna- ja kasvisruoat; koristaa jälkiruokia ja leivonnaisia; erinomainen tee kuumana tai jäisenä.'],
    med: ['Like peppermint: eases wind and digestive cramps and stimulates appetite.', 'Kuten piparminttu: lievittää ilmavaivoja ja vatsan kouristuksia ja lisää ruokahalua.'],
    other: ['The oil scents cosmetics and flavours medicines.', 'Öljy tuoksuttaa kosmetiikkaa ja maustaa lääkkeitä.'],
  }, ['tea']),
  'taraxacum-officinale': u(['leaves', 'flowers', 'roots'], {
    food: ['Leaves in salads, soups and stews; flowers for mead, beer and wine, cooked or fermented; roots boiled as a vegetable, or roasted as a coffee substitute. Some bitterness is part of its value — and it makes drinks more thirst-quenching.', 'Lehdet salaatteihin, keittoihin ja muhennoksiin; kukista simaa, kaljaa ja viiniä tai kiehautettuina ja hapatettuina; juuret keitettyinä lisäkkeenä tai paahdettuina kahvinkorvikkeena. Pieni kitkeryys kuuluu asiaan — ja tekee juomista janoa sammuttavampia.'],
    med: ['A classic bile and liver herb (root) and a diuretic (leaves) that does not deplete potassium; a bitter for poor appetite and digestion.', 'Klassinen sappi- ja maksayrtti (juuri) ja virtsaneritystä lisäävä rohto (lehdet), joka ei köyhdytä kaliumia; karvasrohto ruokahaluttomuuteen ja ruoansulatukseen.'],
    other: ['Cleansing skin care for oily, large-pored skin.', 'Puhdistava ihonhoito rasvaiselle, suurihuokoiselle iholle.'],
    warn: ['Not with gallstones or blocked bile ducts; can cause allergy in people sensitive to daisy-family plants.', 'Ei sappikivissä tai sappiteiden tukoksissa; voi aiheuttaa allergiaa asterikasveille herkille.'],
  }, ['tea']),
  'aegopodium-podagraria': u(['leaves', 'shoots'], {
    food: ['One of the first wild greens of spring: pale, still-folded leaves chopped into salads and soups, or cooked like spinach or cabbage. Freeze or dry for green powder; the dried herb is a seasoning. Contains iron and vitamin C.', 'Kevään ensimmäisiä villivihanneksia: vaaleat, vielä suppuiset lehdet silputtuina salaatteihin ja keittoihin tai pinaatin tai kaalin tapaan kypsennettyinä. Pakasta tai kuivaa viherjauheeksi; kuivattu yrtti on mauste. Sisältää rautaa ja C-vitamiinia.'],
    med: ['Its name "goutweed" comes from its old use: crushed leaves wrapped around gouty toes and compresses for joint pain.', 'Nimi "goutweed" tulee vanhasta käytöstä: murskatut lehdet käärittiin kihtisen varpaan ympärille ja hauteita käytettiin nivelkipuihin.'],
    warn: ['Make sure of identification — some white-flowered carrot-family relatives are deadly. Pick young leaves only.', 'Varmista tunnistus — jotkin valkokukkaiset sarjakukkaiset sukulaiset ovat tappavia. Poimi vain nuoria lehtiä.'],
  }),
  'angelica-archangelica': u(['shoots', 'leaves', 'roots', 'seeds', 'flowers'], {
    food: ['Stems picked before flowering are eaten raw, cooked, candied, or with rhubarb in jams, kissel and pies; leaves stuff baked pike and season salads, soups and fish; seeds flavour soups, sauces and bread; flowers can be fried in batter. The original ingredient of Sámi "kombo" milk.', 'Ennen kukintaa kerätyt varret syödään raakoina, keitettyinä, sokeroituina tai raparperin kanssa hilloissa, kiisseleissä ja piirakoissa; lehdet uunihauen täytteeksi ja salaattien, keittojen ja kalan mausteeksi; siemenet keittoihin, kastikkeisiin ja leipään; kukat voi paistaa taikinassa. Saamelaisen kombo-maidon alkuperäinen aines.'],
    med: ['Root and seeds were official remedies: they aid digestion, ease wind and cramps and loosen mucus in bronchitis. Chewing the root was believed to protect from contagion.', 'Juuri ja siemenet olivat apteekkirohtoja: ne edistävät ruoansulatusta, lievittävät ilmavaivoja ja kouristuksia ja irrottavat limaa keuhkoputkentulehduksessa. Juuren pureskelun uskottiin suojaavan tartunnoilta.'],
    other: ['The root was chewed or smoked to quit tobacco; hollow stems made flutes; the umbels dry well.', 'Juurta on pureskeltu tai poltettu tupakasta eroon pääsemiseksi; ontoista varsista on tehty huiluja; kukinnot kuivuvat hyvin.'],
    warn: both(['Furocoumarins make skin burn in sunlight — wear gloves when harvesting. Confirm identification: deadly relatives look similar.', 'Furokumariinit saavat ihon palamaan auringossa — käytä hanskoja korjatessa. Varmista tunnistus: tappavat sukulaiset näyttävät samanlaisilta.'], NOT_PREGNANT),
  }, ['medicinal']),
};
