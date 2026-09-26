import { Star } from 'lucide-react';
import type { Plant, Confidence } from '../../plants/schema';
import { localizedText, plantDisplayName } from '../../plants/names';
import { usePlants } from '../../app/plantStore';
import { useEditor } from '../../editor/store';
import { formatRange, type Range } from '../../domain/range';
import { CATEGORY_LABELS, CATEGORY_COLORS, LIFECYCLE_LABELS } from '../plantColors';
import { tagLabel } from '../../plants/tags';
import { SUN_LABEL } from '../../engine/suitability';
import { anchorsFor, formatMonthSpan, plantSeasons } from '../../engine/plantSeasons';
import { relationsForPlant, EVIDENCE_LABEL, matchesEndpoint } from '../../engine/companions';
import { ConfidenceBadge, METHOD_LABELS } from '../panels/PlantingCard';
import { defaultLocation } from '../../domain/projectFactory';
import { language, t } from '../../i18n';
import { formatDate } from '../../lib/dates';

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
  const names = Object.entries(plant.names.common).filter(([lang]) => lang !== language());
  const g = plant.growing;
  const p = plant.planting;
  const item = plant.timing;
  const care = plant.care;
  const y = plant.yield;
  const relations = relationsForPlant(plant, catalog.companions);
  const fav = favourites.has(plant.id);
  const careRows: [string, Record<string, string> | null | undefined][] = [
    [t('Watering'), care.watering],
    [t('Feeding'), care.fertilizing],
    [t('Pruning'), care.pruning],
    [t('Support'), care.support],
    [t('Thinning'), care.thinning],
    [t('Mulching'), care.mulching],
    [t('Pests'), care.pests],
    [t('Diseases'), care.diseases],
    [t('Winter'), care.winter],
    [t('Harvesting'), care.harvesting],
    [t('Storage'), care.storage],
  ];
  const other = (id: string) => {
    if (id.startsWith('genus:')) return t('{{name}} (genus)', { name: id.slice(6) });
    if (id.startsWith('family:')) return t('{{name}} (family)', { name: id.slice(7) });
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
        <button className="icon-btn" aria-pressed={fav} aria-label={fav ? t('Remove from favourites') : t('Add to favourites')} onClick={() => toggleFavourite(plant.id)}>
          <Star size={16} fill={fav ? 'var(--warn)' : 'none'} color={fav ? 'var(--warn)' : 'currentColor'} />
        </button>
      </div>
      <div className="row wrap" style={{ margin: '8px 0', gap: 4 }}>
        <span className="badge" style={{ borderColor: CATEGORY_COLORS[plant.category], color: CATEGORY_COLORS[plant.category] }}>{CATEGORY_LABELS[plant.category]}</span>
        {plant.lifecycle && <span className="badge">{LIFECYCLE_LABELS[plant.lifecycle]}</span>}
        {plant.edible != null && <span className="badge">{plant.edible ? t('edible') : t('not edible')}</span>}
        {plant.tags.slice(0, 6).map((tag) => (
          <span key={tag} className="badge">
            {tagLabel(tag)}
          </span>
        ))}
      </div>
      {(names.length > 0 || plant.names.common.en?.length > 1 || plant.names.synonyms.length > 0) && (
        <dl className="kv">
          {(plant.names.common[language()]?.length ?? 0) > 1 && <Row label={t('Also called')} value={plant.names.common[language()].slice(1).join(', ')} />}
          {names.map(([lang, list]) => (
            <Row key={lang} label={t('Name ({{lang}})', { lang })} value={list.join(', ')} />
          ))}
          {plant.names.synonyms.length > 0 && <Row label={t('Synonyms')} value={<i>{plant.names.synonyms.join(', ')}</i>} />}
        </dl>
      )}

      <section className="detail-section">
        <h4>{t('Growing conditions')}</h4>
        <dl className="kv">
          <Row label={t('Light')} value={g.sun?.map((s) => SUN_LABEL[s]).join(', ')} />
          <Row label={t('Min. direct sun')} value={g.sunHoursMin != null ? t('{{hours}} h/day', { hours: g.sunHoursMin }) : null} />
          <Row label={t('Water')} value={g.water ? t(g.water) : null} />
          <Row label={t('Soil')} value={g.soil?.map((s) => t(s)).join(', ')} />
          <Row label={t('Soil pH')} value={r(g.ph)} />
          <Row label={t('Drainage')} value={g.drainage} />
          <Row label={t('Frost')} value={g.frostTolerance ? t(g.frostTolerance) : null} />
          <Row label={t('Finnish zones')} value={g.finnishZones ? `${formatRange(g.finnishZones)}` : null} />
          <Row label={t('USDA zones')} value={g.usdaZones ? formatRange(g.usdaZones) : null} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>{t('Planting')}</h4>
        <dl className="kv">
          <Row label={t('Methods')} value={p.methods.map((m) => METHOD_LABELS[m]).join(', ')} />
          <Row label={t('In-row spacing')} value={r(p.inRowSpacingCm, 'cm')} />
          <Row label={t('Row spacing')} value={r(p.rowSpacingCm, 'cm')} />
          <Row label={t('Grid spacing')} value={r(p.gridSpacingCm, 'cm')} />
          <Row label={t('Seed spacing')} value={r(p.seedSpacingCm, 'cm')} />
          <Row label={t('Seed depth')} value={r(p.seedDepthCm, 'cm')} />
          <Row label={t('Planting depth')} value={r(p.plantingDepthCm, 'cm')} />
          <Row label={t('Germination')} value={p.germinationDays ? (p.germinationTempC ? t('{{days}} days at {{temp}} °C', { days: formatRange(p.germinationDays), temp: formatRange(p.germinationTempC) }) : t('{{days}} days', { days: formatRange(p.germinationDays) })) : null} />
          <Row label={t('Sowing rate')} value={r(p.seedRateGPerM2, 'g/m²')} />
          <Row label={t('Mature height')} value={r(p.matureHeightCm, 'cm', 0)} />
          <Row label={t('Mature width')} value={r(p.matureWidthCm, 'cm', 0)} />
          <Row label={t('Containers')} value={p.containerSuitable == null ? null : p.containerSuitable ? (p.containerVolumeL ? t('Suitable ({{volume}} L)', { volume: formatRange(p.containerVolumeL) }) : t('Suitable')) : t('Not recommended')} />
          <Row label={t('Transplanting')} value={localizedText(p.transplanting)} />
          <Row label={t('Direct sowing')} value={localizedText(p.directSowing)} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>{t('Timing')} {loc.lastFrost ? t('(for this garden)') : t('(placeholder frost dates)')}</h4>
        <dl className="kv">
          <Row label={t('Sow')} value={formatMonthSpan(seasons.sow)} />
          <Row label={t('Plant out')} value={formatMonthSpan(seasons.plant)} />
          <Row label={t('Harvest')} value={formatMonthSpan(seasons.harvest)} />
          <Row label={t('Days to maturity')} value={item.daysToMaturity ? (item.maturityFrom === 'transplant' ? t('{{days}} from transplanting', { days: formatRange(item.daysToMaturity) }) : t('{{days}} from sowing', { days: formatRange(item.daysToMaturity) })) : null} />
          <Row label={t('First harvest')} value={item.yearsToFirstHarvest ? t('{{years}} year(s) after planting', { years: formatRange(item.yearsToFirstHarvest) }) : null} />
          <Row label={t('Succession')} value={item.successionIntervalDays ? t('every {{days}} days', { days: formatRange(item.successionIntervalDays) }) : null} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>{t('Care')}</h4>
        <dl className="kv">
          {careRows.map(([label, text]) => (
            <Row key={label} label={label} value={localizedText(text)} />
          ))}
          <Row label={t('Feeding need')} value={care.feeding ? t(care.feeding) : null} />
        </dl>
      </section>

      <section className="detail-section">
        <h4>{t('Yield')}</h4>
        {y && (y.perPlantKg || y.perM2Kg) ? (
          <div className="col" style={{ gap: 4 }}>
            <div>
              {y.perPlantKg && <span className="num">{formatRange(y.perPlantKg, 2)} {t('kg/plant')} </span>}
              {y.perM2Kg && <span className="num">{formatRange(y.perM2Kg, 1)} kg/m² </span>}
              <ConfidenceBadge c={y.confidence} />
            </div>
            {y.assumptions && <div className="small muted">{localizedText(y.assumptions)}</div>}
          </div>
        ) : (
          <p className="muted small">{t('Yield estimate unavailable — no reliable data.')}</p>
        )}
      </section>

      <section className="detail-section">
        <h4>{t('Rotation & companions')}</h4>
        <dl className="kv">
          <Row label={t('Rotation group')} value={plant.rotation?.group} />
          <Row label={t('Fixes nitrogen')} value={plant.rotation?.nitrogenFixer ? 'Yes' : null} />
        </dl>
        {relations.length > 0 ? (
          <ul style={{ paddingLeft: 16, margin: '6px 0' }} className="small">
            {relations.map((rel, i) => {
              const otherEnd = matchesEndpoint(rel.a, plant) ? rel.b : rel.a;
              return (
                <li key={i}>
                  {rel.kind === 'antagonistic' ? t('Avoid near') : t('Good with')} <strong>{other(otherEnd)}</strong> <span className="badge">{EVIDENCE_LABEL[rel.evidence]}</span>
                  <div className="tiny muted">{localizedText(rel.mechanism)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">{t('No companion relationships recorded.')}</p>
        )}
      </section>

      <section className="detail-section">
        <h4>{t('Data source')}</h4>
        <p className="small">
          {t('Record confidence:')} <ConfidenceBadge c={plant.provenance.confidence as Confidence} /> · {t('dataset')} <code>{plant.dataset}</code>
          {plant.provenance.updated ? ` · ${t('updated {{date}}', { date: formatDate(plant.provenance.updated, 'long') })}` : ''}
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
