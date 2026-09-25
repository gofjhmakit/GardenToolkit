import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { shortcutLabel } from './platform';

export type MenuEntry =
  | { type?: 'item'; label: string; onSelect: () => void; shortcut?: string; disabled?: boolean; icon?: ReactNode; checked?: boolean }
  | { type: 'separator' }
  | { type: 'label'; label: string };

interface MenuProps {
  entries: MenuEntry[];
  anchor: { x: number; y: number };
  onClose: () => void;
  label: string;
}

/** Keyboard-accessible popup menu (Arrow keys, Home/End, Enter, Escape). */
export function Menu({ entries, anchor, onClose, label }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(anchor);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // offsetWidth/Height ignore the pop-in scale animation; the bounding box would be too small.
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      x: Math.max(4, Math.min(anchor.x, window.innerWidth - w - 4)),
      y: Math.max(4, Math.min(anchor.y, window.innerHeight - h - 4)),
    });
    const first = el.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus();
  }, [anchor]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [onClose]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
    }
    e.stopPropagation();
  };
  return (
    <div ref={ref} className="menu" role="menu" aria-label={label} style={{ left: pos.x, top: pos.y }} onKeyDown={onKeyDown}>
      {entries.map((e, i) => {
        if (e.type === 'separator') return <div key={i} className="menu-sep" role="separator" />;
        if (e.type === 'label') return <div key={i} className="menu-label">{e.label}</div>;
        return (
          <button
            key={i}
            type="button"
            role={e.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={e.checked}
            className="menu-item"
            disabled={e.disabled}
            onClick={() => {
              onClose();
              e.onSelect();
            }}
          >
            <span style={{ width: 16, display: 'inline-flex' }}>{e.checked ? <Check size={14} /> : e.icon}</span>
            <span>{e.label}</span>
            {e.shortcut && <span className="kbd">{shortcutLabel(e.shortcut)}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Button that opens a Menu below itself. */
export function MenuButton({ label, entries, children, className }: { label: string; entries: () => MenuEntry[]; children: ReactNode; className?: string }) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor(anchor ? null : { x: r.left, y: r.bottom + 2 });
        }}
      >
        {children}
      </button>
      {anchor && (
        <Menu
          label={label}
          entries={entries()}
          anchor={anchor}
          onClose={() => {
            setAnchor(null);
            btn.current?.focus();
          }}
        />
      )}
    </>
  );
}
