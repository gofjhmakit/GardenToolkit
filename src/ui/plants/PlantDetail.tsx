import { Star } from 'lucide-react';
import type { Plant, Confidence } from '../../plants/schema';
import { localizedText, plantDisplayName } from '../../plants/names';
import { usePlants } from '../../app/plantStore';
import { useEditor } from '../../editor/store';
import { formatRange, type Range } from '../../domain/range';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../plantColors';
import { SUN_LABEL } from '../../engine/suitability';
import { anchorsFor, formatMonthSpan, plantSeasons } from '../../engine/plantSeasons';
import { relationsForPlant, EVIDENCE_LABEL, matchesEndpoint } from '../../engine/companions';
import { ConfidenceBadge, METHOD_LABELS } from '../panels/PlantingCard';
import { defaultLocation } from '../../domain/projectFactory';

const r = (x: Range | null | undefined, unit = '', digits = 1) => (x ? formatRange(x, digits, unit) : null);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function PlantDetail({ plant }: { plant: Plant }) {
  const { favourites, toggleFavourite, catalog } = usePlants();
  const loc = useEditor((s) => s.doc?.location) ?? defaultLocation();
  const season = useEditor((s) => s.doc?.settings.activeSeason) ?? new Date().getFullYear();
  const anchors = anchorsFor(loc, season);
  const seasons = plantSeasons(plant, anchors);
  const names = Object.entries(plant.names.common).filter(([lang]) => lang !== 'en');
  const g = plant.growing;
  const p = plant.planting;
  const t = plant.timing;
  const care = plant.care;
  const y = plant.yield;
  const relations = relationsForPlant(plant, catalog.companions);
  const fav = favourites.has(plant.id);
  const careRows: [string, Record<string, string> | null | undefined][] = [
    ['Watering', care.watering],
    ['Feeding', care.fertilizing],
    ['Pruning', care.pruning],
    ['Support', care.support],
    ['Thinning', care.thinning],
    ['Mulching', care.mulching],
    ['Pests', care.pests],
    ['Diseases', care.diseases],
    ['Winter', care.winter],
    ['Harvesting', care.harvesting],
    ['Storage', care.storage],
  ];
  const other = (id: string) => {
    if (id.startsWith('genus:')) return `${id.slice(6)} (genus)`;
    if (id.startsWith('family:')) return `${id.slice(7)} (family)`;
    const q = catalog.get(id);
    return q ? plantDisplayName(q) : id;
  };
  return (
    <article className="col" style={{ gap: 0 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18 }}>{plantDisplayName(plant)}</h2>
          <div style={{ fontStyle: 'italic' }} className="muted">
            {plant.names.scientific}
            {plant.taxonomy.family ? <span style={{ fontStyle: 'normal' }}> · {plant.taxonomy.family}</span> : null}
          </div>
        </div>
        <button className="icon-btn" aria-pressed={fav} aria-label={fav ? 'Remove from favourites' : 'Add to favourites'} onClick={() => toggleFavourite(plant.id)}>
          <Star size={16} fill={fav ? 'var(--warn)' : 'none'} color={fav ? 'var(--warn)' : 'currentColor'} />
        </button>
      </div>
      <div className="row wrap" style={{ margin: '8px 0', gap: 4 }}>
        <span className="badge" style={{ borderColor: CATEGORY_COLORS[plant.category], color: CATEGORY_COLORS[plant.category] }}>{CATEGORY_LABELS[plant.category]}</span>
        {plant.lifecycle && <span className="badge">{plant.lifecycle}</span>}
        {plant.edible != null && <span className="badge">{plant.edible ? 'edible' : 'not edible'}</span>}
        {plant.tags.slice(0, 6).map((tag) => (
          <span key={tag} className="badge">
            {tag}
          </span>
        ))}
      </div>
      {(names.length > 0 || plant.names.common.en?.length > 1 || plant.names.synonyms.length > 0) && (
        <dl className="kv">
          {plant.names.common.en?.length > 1 && <Row label="Also called" value={plant.names.common.en.slice(1).join(', ')} />}
          {names.map(([lang, list]) => (
            <Row key={lang} label={`Name (${lang})`} value={list.join(', ')} />
          ))}
          {plant.names.synonyms.length > 0 && <Row label="Synonyms" value={<i>{plant.names.synonyms.join(', ')}</i>} />}
        </dl>
      )}

      <section className="detail-section">
        <h4>Growing conditions</h4>
        <dl className="kv">
          <Row label="Light" value={g.sun?.map((s) => SUN_LABEL[s]).join(', ')} />
          <Row label="Min. direct sun" value={g.sunHoursMin != null ? `${g.sunHoursMin} h/day` : null} />
          <Row label="Water" value={g.water} />
          <Row label="Soil" value={g.soil?.join(', ')} />
          <Row label="Soil pH" value={r(g.ph)} />
          <Row label="Drainage" value={g.drainage} />
          <Row label="Frost" value={g.frostTolerance} />
          <Row label="Finnish zones" value={g.finnishZones ? `${formatRange(g.finnishZones)}` : null} />
          <Row label="USDA zones" value={g.usdaZones ? formatRange(g.usdaZones) : null} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>Planting</h4>
        <dl className="kv">
          <Row label="Methods" value={p.methods.map((m) => METHOD_LABELS[m]).join(', ')} />
          <Row label="In-row spacing" value={r(p.inRowSpacingCm, 'cm')} />
          <Row label="Row spacing" value={r(p.rowSpacingCm, 'cm')} />
          <Row label="Grid spacing" value={r(p.gridSpacingCm, 'cm')} />
          <Row label="Seed spacing" value={r(p.seedSpacingCm, 'cm')} />
          <Row label="Seed depth" value={r(p.seedDepthCm, 'cm')} />
          <Row label="Planting depth" value={r(p.plantingDepthCm, 'cm')} />
          <Row label="Germination" value={p.germinationDays ? `${formatRange(p.germinationDays)} days${p.germinationTempC ? ` at ${formatRange(p.germinationTempC)} °C` : ''}` : null} />
          <Row label="Sowing rate" value={r(p.seedRateGPerM2, 'g/m²')} />
          <Row label="Mature height" value={r(p.matureHeightCm, 'cm', 0)} />
          <Row label="Mature width" value={r(p.matureWidthCm, 'cm', 0)} />
          <Row label="Containers" value={p.containerSuitable == null ? null : p.containerSuitable ? `Suitable${p.containerVolumeL ? ` (${formatRange(p.containerVolumeL)} L)` : ''}` : 'Not recommended'} />
          <Row label="Transplanting" value={localizedText(p.transplanting)} />
          <Row label="Direct sowing" value={localizedText(p.directSowing)} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>Timing {loc.lastFrost ? '(for this garden)' : '(placeholder frost dates)'}</h4>
        <dl className="kv">
          <Row label="Sow" value={formatMonthSpan(seasons.sow)} />
          <Row label="Plant out" value={formatMonthSpan(seasons.plant)} />
          <Row label="Harvest" value={formatMonthSpan(seasons.harvest)} />
          <Row label="Days to maturity" value={t.daysToMaturity ? `${formatRange(t.daysToMaturity)} from ${t.maturityFrom ?? 'sowing'}` : null} />
          <Row label="First harvest" value={t.yearsToFirstHarvest ? `${formatRange(t.yearsToFirstHarvest)} year(s) after planting` : null} />
          <Row label="Succession" value={t.successionIntervalDays ? `every ${formatRange(t.successionIntervalDays)} days` : null} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>Care</h4>
        <dl className="kv">
          {careRows.map(([label, text]) => (
            <Row key={label} label={label} value={localizedText(text)} />
          ))}
          <Row label="Feeding need" value={care.feeding} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>Yield</h4>
        {y && (y.perPlantKg || y.perM2Kg) ? (
          <div className="col" style={{ gap: 4 }}>
            <div>
              {y.perPlantKg && <span className="num">{formatRange(y.perPlantKg, 2)} kg/plant </span>}
              {y.perM2Kg && <span className="num">{formatRange(y.perM2Kg, 1)} kg/m² </span>}
              <ConfidenceBadge c={y.confidence} />
            </div>
            {y.assumptions && <div className="small muted">{localizedText(y.assumptions)}</div>}
          </div>
        ) : (
          <p className="muted small">Yield estimate unavailable — no reliable data.</p>
        )}
      </section>

      <section className="detail-section">
        <h4>Rotation & companions</h4>
        <dl className="kv">
          <Row label="Rotation group" value={plant.rotation?.group} />
          <Row label="Fixes nitrogen" value={plant.rotation?.nitrogenFixer ? 'Yes' : null} />
        </dl>
        {relations.length > 0 ? (
          <ul style={{ paddingLeft: 16, margin: '6px 0' }} className="small">
            {relations.map((rel, i) => {
              const otherEnd = matchesEndpoint(rel.a, plant) ? rel.b : rel.a;
              return (
                <li key={i}>
                  {rel.kind === 'antagonistic' ? 'Avoid near' : 'Good with'} <strong>{other(otherEnd)}</strong> <span className="badge">{EVIDENCE_LABEL[rel.evidence]}</span>
                  <div className="tiny muted">{localizedText(rel.mechanism)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">No companion relationships recorded.</p>
        )}
      </section>

      <section className="detail-section">
        <h4>Data source</h4>
        <p className="small">
          Record confidence: <ConfidenceBadge c={plant.provenance.confidence as Confidence} /> · dataset <code>{plant.dataset}</code>
          {plant.provenance.updated ? ` · updated ${plant.provenance.updated}` : ''}
        </p>
        {plant.provenance.sources.map((s) => {
          const src = catalog.sources.get(s.id);
          return (
            <div key={s.id} className="small" style={{ marginBottom: 4 }}>
              <strong>{src?.title ?? s.id}</strong> {src?.license && <span className="badge">{src.license}</span>}
              {src?.url && (
                <>
                  {' '}
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    source
                  </a>
                </>
              )}
              {s.note && <div className="tiny">{s.note}</div>}
              {src?.notes && <div className="tiny muted">{src.notes}</div>}
            </div>
          );
        })}
      </section>
    </article>
  );
}
