import { useEffect, useMemo, useState } from 'react';
import { Eye, FileDown, FileJson, FileSpreadsheet, Image as ImageIcon, Loader2, Package } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { useReportContext } from './useReportContext';
import { buildReport } from '../../reports/builders';
import { REPORT_INFO, type ReportKind } from '../../reports/model';
import { buildPlanSvg, exportPlanPng, exportPlanSvg, type PlanSvg } from '../../reports/planExport';
import { renderPdf } from '../../reports/pdf';
import { calendarCsv, calendarIcs, objectsCsv, plantingsCsv } from '../../reports/csv';
import { downloadBlob, downloadText, safeFileName } from '../../lib/download';
import { exportProjectJson, exportProjectPackage } from '../../app/projectActions';
import { flushSave } from '../../app/autosave';
import { ReportPreview, useSvgUrl } from './ReportPreview';
import { toast } from '../components/feedback';
import { Dialog } from '../components/Dialog';
import { t } from '../../i18n';

const KINDS: ReportKind[] = ['planting-plan', 'garden-design', 'care-guide', 'calendar', 'harvest-plan', 'complete'];

export function ReportsView() {
  const doc = useEditor((s) => s.doc)!;
  const ctx = useReportContext();
  const [preview, setPreview] = useState<ReportKind | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const name = safeFileName(doc.meta.name);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast('error', t('Export failed'), [e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(null);
    }
  };

  const pdf = (kind: ReportKind) =>
    run(`pdf-${kind}`, async () => {
      if (!ctx) return;
      await flushSave();
      const report = buildReport(kind, ctx);
      const needsPlan = report.blocks.some((b) => b.type === 'plan');
      const plan = needsPlan ? await buildPlanSvg(ctx.doc, ctx.lookup, { titleBlock: false }) : null;
      const blob = await renderPdf(report, plan);
      downloadBlob(blob, `${name}-${kind}.pdf`);
    });

  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>{t('Reports & export')}</h1>
          <p className="muted">{t('Documents are generated in your browser from the project data — nothing is uploaded anywhere.')}</p>
        </div>
      </div>
      <h2>{t('Documents (PDF)')}</h2>
      <div className="project-grid">
        {KINDS.map((k) => (
          <div key={k} className="card col">
            <div className="row">
              <FileDown size={16} color="var(--accent)" />
              <strong>{REPORT_INFO[k].title}</strong>
            </div>
            <p className="small muted" style={{ flex: 1 }}>{REPORT_INFO[k].description}</p>
            <div className="row">
              <button className="btn sm" onClick={() => setPreview(k)}>
                <Eye size={13} />{' '}{t('Preview')}
              </button>
              <button className="btn sm primary" disabled={!!busy} onClick={() => pdf(k)}>
                {busy === `pdf-${k}` ? <Loader2 size={13} className="spin" /> : <FileDown size={13} />} {t('Download PDF')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <h2>{t('Plan images')}</h2>
      <div className="row wrap">
        <button className="btn" disabled={!!busy} onClick={() => run('svg', async () => void (ctx && downloadBlob(await exportPlanSvg(doc, ctx.lookup), `${name}-plan.svg`)))}>
          <ImageIcon size={14} />{' '}{t('Scaled plan (SVG, vector)')}
        </button>
        <button className="btn" disabled={!!busy} onClick={() => run('png', async () => void (ctx && downloadBlob(await exportPlanPng(doc, ctx.lookup, 3000), `${name}-plan.png`)))}>
          <ImageIcon size={14} />{' '}{t('Plan image (PNG, 3000 px)')}
        </button>
      </div>
      <h2>{t('Data (CSV / calendar)')}</h2>
      <div className="row wrap">
        <button className="btn" onClick={() => ctx && downloadText(plantingsCsv(doc, ctx.lookup), `${name}-plantings.csv`, 'text/csv')}>
          <FileSpreadsheet size={14} />{' '}{t('Plantings')}
        </button>
        <button className="btn" onClick={() => downloadText(objectsCsv(doc), `${name}-areas.csv`, 'text/csv')}>
          <FileSpreadsheet size={14} />{' '}{t('Areas & objects')}
        </button>
        <button className="btn" onClick={() => ctx && downloadText(calendarCsv(doc, ctx.lookup), `${name}-calendar.csv`, 'text/csv')}>
          <FileSpreadsheet size={14} />{' '}{t('Calendar')}
        </button>
        <button className="btn" onClick={() => ctx && downloadText(calendarIcs(doc, ctx.lookup), `${name}-calendar.ics`, 'text/calendar')}>
          <FileSpreadsheet size={14} />{' '}{t('Calendar (iCal)')}
        </button>
      </div>
      <h2>{t('Project backup')}</h2>
      <p className="small muted">{t('A backup contains the complete project including blueprint images and snapshots of the plant data it uses, so it can be opened in Garden Toolkit on any browser or device.')}</p>
      <div className="row wrap">
        <button className="btn primary" disabled={!!busy} onClick={() => run('pkg', () => exportProjectPackage(doc))}>
          <Package size={14} />{' '}{t('Project package (.gtkproject)')}
        </button>
        <button className="btn" disabled={!!busy} onClick={() => run('json', () => exportProjectJson(doc, true))}>
          <FileJson size={14} />{' '}{t('Single JSON file')}
        </button>
      </div>
      {preview && ctx && <PreviewDialog kind={preview} onClose={() => setPreview(null)} onPdf={() => pdf(preview)} busy={busy === `pdf-${preview}`} />}
    </div>
  );
}

function PreviewDialog({ kind, onClose, onPdf, busy }: { kind: ReportKind; onClose: () => void; onPdf: () => void; busy: boolean }) {
  const ctx = useReportContext()!;
  const report = useMemo(() => buildReport(kind, ctx), [kind, ctx]);
  const [plan, setPlan] = useState<PlanSvg | null>(null);
  const needsPlan = report.blocks.some((b) => b.type === 'plan');
  useEffect(() => {
    let alive = true;
    if (needsPlan) void buildPlanSvg(ctx.doc, ctx.lookup, { titleBlock: false }).then((p) => alive && setPlan(p));
    return () => {
      alive = false;
    };
  }, [ctx, needsPlan]);
  const url = useSvgUrl(plan?.svg ?? null);
  return (
    <Dialog
      open
      wide
      title={t('Preview: {{title}}', { title: report.title })}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t('Close')}</button>
          <button className="btn primary" disabled={busy} onClick={onPdf}>
            <FileDown size={14} />{' '}{t('Download PDF')}
          </button>
        </>
      }
    >
      <ReportPreview report={report} planUrl={url} />
    </Dialog>
  );
}
