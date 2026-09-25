/**
 * App-wide feedback: toasts, confirmation and prompt dialogs as promises.
 */
import { useState } from 'react';
import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Dialog } from './Dialog';

interface Toast {
  id: number;
  kind: 'info' | 'error' | 'ok';
  title: string;
  details?: string[];
}

interface ConfirmReq {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

interface PromptReq {
  title: string;
  label: string;
  value: string;
  confirmLabel?: string;
  /** Must not exceed the schema limit of the field being edited. Defaults to 200. */
  maxLength?: number;
  resolve: (v: string | null) => void;
}

interface FeedbackState {
  toasts: Toast[];
  confirmReq: ConfirmReq | null;
  promptReq: PromptReq | null;
  toast(kind: Toast['kind'], title: string, details?: string[]): void;
  dismiss(id: number): void;
}

let seq = 1;

export const useFeedback = create<FeedbackState>()((set, get) => ({
  toasts: [],
  confirmReq: null,
  promptReq: null,
  toast(kind, title, details) {
    const id = seq++;
    set({ toasts: [...get().toasts, { id, kind, title, details }].slice(-3) });
    setTimeout(() => get().dismiss(id), kind === 'error' ? 12000 : 3500);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = (kind: Toast['kind'], title: string, details?: string[]) => useFeedback.getState().toast(kind, title, details);

export function confirmAsync(opts: Omit<ConfirmReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useFeedback.setState({ confirmReq: { ...opts, resolve } }));
}

export function promptAsync(opts: Omit<PromptReq, 'resolve'>): Promise<string | null> {
  return new Promise((resolve) => useFeedback.setState({ promptReq: { ...opts, resolve } }));
}

export function FeedbackHost() {
  const { toasts, confirmReq, promptReq, dismiss } = useFeedback();
  return (
    <>
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'error' ? <AlertTriangle size={16} color="var(--danger)" /> : t.kind === 'ok' ? <CheckCircle2 size={16} color="var(--ok)" /> : <Info size={16} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              {t.details?.length ? (
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {t.details.slice(0, 6).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button className="icon-btn sm" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {confirmReq && <ConfirmDialog req={confirmReq} />}
      {promptReq && <PromptDialog req={promptReq} />}
    </>
  );
}

function ConfirmDialog({ req }: { req: ConfirmReq }) {
  const close = (v: boolean) => {
    useFeedback.setState({ confirmReq: null });
    req.resolve(v);
  };
  return (
    <Dialog
      open
      title={req.title}
      onClose={() => close(false)}
      initialFocus="confirm-cancel"
      footer={
        <>
          <button id="confirm-cancel" className="btn" onClick={() => close(false)}>
            Cancel
          </button>
          <button className={`btn ${req.danger ? 'danger solid' : 'primary'}`} onClick={() => close(true)}>
            {req.confirmLabel ?? 'OK'}
          </button>
        </>
      }
    >
      <p style={{ whiteSpace: 'pre-line' }}>{req.message}</p>
    </Dialog>
  );
}

function PromptDialog({ req }: { req: PromptReq }) {
  const [value, setValue] = useState(req.value);
  const close = (v: string | null) => {
    useFeedback.setState({ promptReq: null });
    req.resolve(v);
  };
  return (
    <Dialog
      open
      title={req.title}
      onClose={() => close(null)}
      initialFocus="prompt-input"
      footer={
        <>
          <button className="btn" onClick={() => close(null)}>
            Cancel
          </button>
          <button className="btn primary" disabled={!value.trim()} onClick={() => close(value.trim().slice(0, req.maxLength ?? 200))}>
            {req.confirmLabel ?? 'OK'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) close(value.trim().slice(0, req.maxLength ?? 200));
        }}
      >
        <div className="field">
          <label htmlFor="prompt-input">{req.label}</label>
          <input id="prompt-input" className="input" value={value} maxLength={req.maxLength ?? 200} onChange={(e) => setValue(e.target.value)} onFocus={(e) => e.target.select()} />
        </div>
      </form>
    </Dialog>
  );
}
