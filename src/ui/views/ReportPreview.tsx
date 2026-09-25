import { useEffect, useState } from 'react';
import type { ReportDoc } from '../../reports/model';

/** HTML preview of a ReportDoc. All content is rendered as text (no HTML injection). */
export function ReportPreview({ report, planUrl }: { report: ReportDoc; planUrl: string | null }) {
  return (
    <div className="doc-preview">
      <h1>{report.title}</h1>
      <div style={{ color: '#666' }}>{report.subtitle}</div>
      {report.blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return b.level === 1 ? <h1 key={i}>{b.text}</h1> : b.level === 2 ? <h2 key={i}>{b.text}</h2> : <h3 key={i}>{b.text}</h3>;
          case 'paragraph':
            return (
              <p key={i} style={{ color: b.style === 'muted' ? '#777' : b.style === 'warning' ? '#9a4d16' : undefined, fontStyle: b.style === 'note' ? 'italic' : undefined }}>
                {b.style === 'warning' ? '⚠ ' : ''}
                {b.text}
              </p>
            );
          case 'bullets':
            return (
              <ul key={i}>
                {b.items.map((t, k) => (
                  <li key={k}>{t}</li>
                ))}
              </ul>
            );
          case 'kv':
            return (
              <table key={i}>
                <tbody>
                  {b.rows.map(([k, v], r) => (
                    <tr key={r}>
                      <th style={{ width: '26%' }}>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'table':
            return (
              <table key={i}>
                <thead>
                  <tr>
                    {b.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, k) => (
                    <tr key={k}>
                      {r.map((c, j) => (
                        <td key={j}>{c == null ? '' : String(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'stats':
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${b.items.length}, 1fr)`, gap: 8, margin: '12px 0' }}>
                {b.items.map((s) => (
                  <div key={s.label} style={{ background: '#f4f2ec', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    <div style={{ fontSize: 10, color: '#777' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{s.value}</div>
                    {s.sub && <div style={{ fontSize: 10, color: '#777' }}>{s.sub}</div>}
                  </div>
                ))}
              </div>
            );
          case 'plan':
            return planUrl ? (
              <figure key={i} style={{ margin: 0 }}>
                <img className="plan-img" src={planUrl} alt="Scaled garden plan" />
                {b.caption && <figcaption style={{ fontSize: 11, color: '#777' }}>{b.caption}</figcaption>}
              </figure>
            ) : (
              <p key={i} style={{ color: '#777' }}>
                Rendering plan…
              </p>
            );
          case 'pagebreak':
            return <hr key={i} style={{ border: 0, borderTop: '1px dashed #ccc', margin: '18px 0' }} />;
        }
      })}
    </div>
  );
}

/** Object URL for an SVG string, revoked on change/unmount. */
export function useSvgUrl(svg: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!svg) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [svg]);
  return url;
}
