import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '../../i18n';

interface DialogProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
  /** Element id to focus when opened. */
  initialFocus?: string;
}

/** Accessible modal built on the native <dialog> element (focus trap, Esc, inert background). */
export function Dialog({ open, title, onClose, children, footer, wide, className, initialFocus }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      if (initialFocus) requestAnimationFrame(() => document.getElementById(initialFocus)?.focus());
    }
    if (!open && d.open) d.close();
  }, [open, initialFocus]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'wide' : ''} ${className ?? ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-inner">
          <div className="dialog-header">
            <h2 id={titleId}>{title}</h2>
            <span className="spacer" />
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close dialog')}>
              <X size={16} />
            </button>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
