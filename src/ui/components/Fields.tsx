import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatLength, fromMm, parseLength, type LengthUnit } from '../../domain/units';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function trimNumber(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

interface LengthInputProps {
  id?: string;
  valueMm: number | null | undefined;
  onCommit: (mm: number | null) => void;
  unit?: LengthUnit;
  allowEmpty?: boolean;
  min?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Real-world length input. Shows the value in `unit`, accepts other units
 * ("120 cm", "1,2 m"), commits on Enter/blur, reverts on Escape.
 */
export function LengthInput({ id, valueMm, onCommit, unit = 'm', allowEmpty, min = 0, placeholder, ariaLabel, className, disabled }: LengthInputProps) {
  const display = valueMm == null ? '' : trimNumber(fromMm(valueMm, unit), unit === 'm' ? 3 : unit === 'cm' ? 1 : 0);
  const [text, setText] = useState(display);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(display);
    setInvalid(false);
  }, [display]);
  const commit = () => {
    if (text.trim() === '') {
      if (allowEmpty) {
        onCommit(null);
        return;
      }
      setText(display);
      return;
    }
    const mm = parseLength(text, unit);
    if (mm == null || mm < min) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (mm !== valueMm) onCommit(mm);
  };
  return (
    <div className="input-group">
      <input
        id={id}
        className={`input ${className ?? ''}`}
        value={text}
        disabled={disabled}
        inputMode="decimal"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        title={valueMm != null ? formatLength(valueMm) : undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).select();
          }
          if (e.key === 'Escape') {
            setText(display);
            setInvalid(false);
          }
        }}
      />
      <span className="addon">{unit}</span>
    </div>
  );
}

interface NumberInputProps {
  id?: string;
  value: number | null | undefined;
  onCommit: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  digits?: number;
  suffix?: string;
  allowEmpty?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  integer?: boolean;
}

export function NumberInput({ id, value, onCommit, min, max, digits = 2, suffix, allowEmpty, placeholder, ariaLabel, disabled, integer }: NumberInputProps) {
  const display = value == null ? '' : trimNumber(value, integer ? 0 : digits);
  const [text, setText] = useState(display);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(display);
    setInvalid(false);
  }, [display]);
  const commit = () => {
    const s = text.trim().replace(',', '.');
    if (!s) {
      if (allowEmpty) onCommit(null);
      else setText(display);
      return;
    }
    let n = Number(s);
    if (!Number.isFinite(n) || (min != null && n < min) || (max != null && n > max)) {
      setInvalid(true);
      return;
    }
    if (integer) n = Math.round(n);
    setInvalid(false);
    if (n !== value) onCommit(n);
  };
  const input = (
    <input
      id={id}
      className="input"
      value={text}
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setText(display);
      }}
    />
  );
  if (!suffix) return input;
  return (
    <div className="input-group">
      {input}
      <span className="addon">{suffix}</span>
    </div>
  );
}

interface TextInputProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
  multiline?: boolean;
  rows?: number;
}

/** Text input that reports every change (callers coalesce undo entries). */
export function TextInput({ id, value, onChange, placeholder, maxLength = 200, ariaLabel, multiline, rows }: TextInputProps) {
  if (multiline) {
    return (
      <textarea
        id={id}
        className="textarea"
        value={value}
        rows={rows ?? 3}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      id={id}
      className="input"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

interface SelectProps<T extends string> {
  id?: string;
  value: T | '' | null | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function Select<T extends string>({ id, value, options, onChange, emptyLabel, ariaLabel, className, disabled }: SelectProps<T>) {
  return (
    <select
      id={id}
      className={`select ${className ?? ''}`}
      value={value ?? ''}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as T))}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
