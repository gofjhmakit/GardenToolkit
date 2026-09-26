/**
 * PDF rendering of ReportDoc with jsPDF + jspdf-autotable, and the scaled
 * plan drawn as vectors via svg2pdf.js. Libraries are loaded lazily so they
 * do not weigh down the editor.
 */
import type { Block, ReportDoc } from './model';
import type { PlanSvg } from './planExport';
import { formatNumber } from '../domain/units';
import { locale, t } from '../i18n';

const MARGIN = 15;
const ACCENT: [number, number, number] = [47, 106, 69];
const TEXT: [number, number, number] = [34, 35, 31];
const MUTED: [number, number, number] = [110, 108, 100];

/** Standard PDF fonts only cover WinAnsi; map common symbols and drop the rest. */
export function pdfText(s: string): string {
  const map: Record<string, string> = {
    '≈': '~',
    '✓': 'x',
    '☐': '[ ]',
    '⚠': '!',
    '→': '->',
    '←': '<-',
    '⌀': 'Ø',
    '＋': '+',
    '✕': 'x',
    '′': "'",
    '″': '"',
    '·': '·',
    '−': '-',
    '≥': '>=',
    '≤': '<=',
    '↔': '<->',
    '↕': '',
  };
  let out = '';
  for (const ch of s) {
    if (map[ch] !== undefined) out += map[ch];
    else if (ch.charCodeAt(0) < 256 || '–—‘’“”•…€×'.includes(ch)) out += ch;
    else out += '?';
  }
  return out;
}

export async function renderPdf(report: ReportDoc, plan: PlanSvg | null): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  await import('svg2pdf.js');
  const pdf = new jsPDF({ orientation: report.orientation, unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: `${report.title} — ${report.projectName}`, creator: 'Garden Toolkit', subject: report.subtitle });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const bottom = pageH - MARGIN - 6;
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > bottom) {
      pdf.addPage();
      y = MARGIN + 8;
    }
  };
  const text = (s: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; italic?: boolean; gap?: number } = {}) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...(opts.color ?? TEXT));
    const lines = pdf.splitTextToSize(pdfText(s), contentW) as string[];
    const lh = size * 0.42;
    for (const line of lines) {
      ensure(lh);
      pdf.text(line, MARGIN, y + lh * 0.8);
      y += lh;
    }
    y += opts.gap ?? 1.5;
  };

  // Title block
  pdf.setFillColor(...ACCENT);
  pdf.rect(MARGIN, y, 3, 14, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...TEXT);
  pdf.text(pdfText(report.title), MARGIN + 6, y + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(pdfText(report.subtitle), MARGIN + 6, y + 13);
  y += 20;

  const tableCommon = {
    margin: { left: MARGIN, right: MARGIN, top: MARGIN + 8, bottom: MARGIN + 6 },
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 1.4, textColor: TEXT, lineColor: [215, 211, 200] as [number, number, number], lineWidth: 0.1, overflow: 'linebreak' as const },
    headStyles: { fillColor: [226, 237, 228] as [number, number, number], textColor: TEXT, fontStyle: 'bold' as const },
  };

  for (const b of report.blocks) {
    await renderBlock(b);
  }

  async function renderBlock(b: Block) {
    switch (b.type) {
      case 'heading': {
        const size = b.level === 1 ? 16 : b.level === 2 ? 13 : 10.5;
        ensure(size * 0.9 + 8);
        y += b.level === 3 ? 2 : 4;
        text(b.text, size, { bold: true, color: b.level === 2 ? ACCENT : TEXT, gap: b.level === 2 ? 1 : 0.8 });
        if (b.level === 2) {
          pdf.setDrawColor(210, 206, 196);
          pdf.setLineWidth(0.2);
          pdf.line(MARGIN, y - 0.5, pageW - MARGIN, y - 0.5);
          y += 2;
        }
        break;
      }
      case 'paragraph':
        text(b.style === 'warning' ? `! ${b.text}` : b.text, 9, { color: b.style === 'muted' ? MUTED : b.style === 'warning' ? [164, 88, 31] : TEXT, italic: b.style === 'note' });
        break;
      case 'bullets':
        for (const item of b.items) text(`•  ${item}`, 9, { gap: 0.6 });
        y += 1.5;
        break;
      case 'kv':
        autoTable(pdf, {
          ...tableCommon,
          startY: y,
          body: b.rows.map(([k, v]) => [pdfText(k), pdfText(v)]),
          theme: 'plain',
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: contentW * 0.26, textColor: MUTED } },
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
        break;
      case 'table': {
        const widths = b.widths;
        autoTable(pdf, {
          ...tableCommon,
          startY: y,
          head: [b.columns.map(pdfText)],
          body: b.rows.map((r) => r.map((c) => pdfText(c == null ? '' : String(c)))),
          theme: 'grid',
          columnStyles: widths ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: (contentW * w) / widths.reduce((s, x) => s + x, 0) }])) : undefined,
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
        break;
      }
      case 'stats': {
        const n = b.items.length;
        const gap = 3;
        const w = (contentW - gap * (n - 1)) / n;
        ensure(18);
        b.items.forEach((it, i) => {
          const x = MARGIN + i * (w + gap);
          pdf.setFillColor(244, 242, 236);
          pdf.setDrawColor(220, 215, 204);
          pdf.roundedRect(x, y, w, 16, 1.5, 1.5, 'FD');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          pdf.text(pdfText(it.label), x + 2.5, y + 4.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11.5);
          pdf.setTextColor(...TEXT);
          pdf.text(pdfText(it.value), x + 2.5, y + 10.3, { maxWidth: w - 5 });
          if (it.sub) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.5);
            pdf.setTextColor(...MUTED);
            pdf.text(pdfText(it.sub), x + 2.5, y + 14, { maxWidth: w - 5 });
          }
        });
        y += 20;
        break;
      }
      case 'plan': {
        if (!plan) {
          text('(Plan not available)', 9, { color: MUTED });
          break;
        }
        const availH = (b.fullPage ? bottom : Math.min(bottom, y + (pageH - MARGIN * 2) * 0.62)) - y - 6;
        let w = contentW;
        let h = (w * plan.heightMm) / plan.widthMm;
        if (h > availH) {
          if (availH < 60 && !b.fullPage) {
            pdf.addPage();
            y = MARGIN + 8;
            await renderBlock(b);
            return;
          }
          h = Math.max(availH, 20);
          w = (h * plan.widthMm) / plan.heightMm;
        }
        const x = MARGIN + (contentW - w) / 2;
        const el = new DOMParser().parseFromString(plan.svg, 'image/svg+xml').documentElement as unknown as SVGElement;
        // svg2pdf needs the element attached to resolve styles.
        const holder = document.createElement('div');
        holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden';
        holder.appendChild(el);
        document.body.appendChild(holder);
        try {
          await (pdf as unknown as { svg(el: Element, o: { x: number; y: number; width: number; height: number }): Promise<void> }).svg(el, { x, y, width: w, height: h });
        } finally {
          holder.remove();
        }
        pdf.setDrawColor(200, 196, 186);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, w, h);
        y += h + 2;
        const scaleDen = Math.round(plan.widthMm / w);
        text(`${b.caption ?? ''} ${t('Scale approx. 1:{{scale}} when printed on A4 at 100%.', { scale: formatNumber(scaleDen, 0) })}`.trim(), 8, { color: MUTED });
        break;
      }
      case 'pagebreak':
        pdf.addPage();
        y = MARGIN + 8;
        break;
    }
  }

  // Running header/footer
  const pages = pdf.getNumberOfPages();
  const generated = new Date(report.generatedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    if (i > 1) pdf.text(pdfText(`${report.projectName} — ${report.title}`), MARGIN, MARGIN);
    pdf.text(pdfText(t('Garden Toolkit · generated {{date}} · estimates are ranges, not guarantees', { date: generated })), MARGIN, pageH - MARGIN + 4);
    pdf.text(`${i} / ${pages}`, pageW - MARGIN, pageH - MARGIN + 4, { align: 'right' });
  }
  return pdf.output('blob');
}
