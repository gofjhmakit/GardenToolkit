export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test((navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent);

/** Formats a shortcut like "Mod+Shift+Z" for the current platform. */
export function shortcutLabel(s: string): string {
  if (!s) return '';
  return s
    .split('+')
    .map((k) => {
      if (k === 'Mod') return isMac ? '⌘' : 'Ctrl';
      if (k === 'Shift') return isMac ? '⇧' : 'Shift';
      if (k === 'Alt') return isMac ? '⌥' : 'Alt';
      if (k === 'Del') return isMac ? '⌫' : 'Del';
      return k;
    })
    .join(isMac ? '' : '+');
}

/** Whether a keyboard event originates from an editable control. */
export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (t as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'range', 'color', 'submit'].includes(type);
  }
  return false;
}
