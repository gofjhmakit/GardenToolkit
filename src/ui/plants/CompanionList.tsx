import type { CompanionFinding } from '../../engine/companions';
import { EVIDENCE_LABEL } from '../../engine/companions';
import { plantDisplayName, localizedText } from '../../plants/names';
import { t } from '../../i18n';

export function CompanionList({ findings, title }: { findings: CompanionFinding[]; title: string }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <h4>{title}</h4>
      {findings.map((f, i) => (
        <div key={i} className={`callout ${f.relation.kind === 'antagonistic' ? 'warn' : ''}`} style={{ padding: '6px 8px' }}>
          <div>
            <div>
              <strong>{plantDisplayName(f.a)}</strong> {f.relation.kind === 'antagonistic' ? '✕' : '＋'} <strong>{plantDisplayName(f.b)}</strong>{' '}
              <span className={`badge ${f.relation.evidence === 'documented' ? 'ok' : f.relation.evidence === 'common-claim' ? '' : 'warn'}`}>{EVIDENCE_LABEL[f.relation.evidence]}</span>
            </div>
            <div className="tiny">{localizedText(f.relation.mechanism)}</div>
          </div>
        </div>
      ))}
      <p className="tiny muted">{t('Evidence levels: “Documented” = supported by research (with stated limits); “Common claim” = widely repeated, mixed evidence; “Traditional” = folklore, largely untested.')}</p>
    </div>
  );
}
