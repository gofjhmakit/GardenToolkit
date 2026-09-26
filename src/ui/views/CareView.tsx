import { useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { useReportContext } from './useReportContext';
import { buildCareGuide } from '../../reports/builders';
import { ReportPreview } from './ReportPreview';
import { useEditor } from '../../editor/store';
import { t } from '../../i18n';

export function CareView() {
  const ctx = useReportContext();
  const report = useMemo(() => (ctx ? buildCareGuide(ctx) : null), [ctx]);
  if (!report) return null;
  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>{t('Care guide')}</h1>
          <p className="muted">{t('Plant-by-plant care for everything in your garden, grouped by plant type.')}</p>
        </div>
        <span className="spacer" />
        <button className="btn primary" onClick={() => useEditor.getState().setWorkspace('reports')}>
          <FileDown size={14} />{' '}{t('Export as PDF…')}
        </button>
      </div>
      <ReportPreview report={report} planUrl={null} />
    </div>
  );
}
