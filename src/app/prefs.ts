/**
 * Tiny UI preferences in localStorage (panel visibility, wheel behaviour,
 * language). Project data never goes here.
 */
import { create } from 'zustand';

export interface Prefs {
  wheel: 'zoom' | 'pan';
  language: string;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  theme: 'system' | 'light' | 'dark';
}

const KEY = 'garden-toolkit:prefs';
/** First run: Finnish for a Finnish browser, otherwise English. The user can switch in settings. */
function defaultLanguage(): string {
  try {
    return typeof navigator !== 'undefined' && /^fi\b/i.test(navigator.language) ? 'fi' : 'en';
  } catch {
    return 'en';
  }
}

const DEFAULTS: Prefs = { wheel: 'zoom', language: defaultLanguage(), showLeftPanel: true, showRightPanel: true, theme: 'system' };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full or disabled — preferences are optional */
  }
}

export const usePrefs = create<Prefs & { set(patch: Partial<Prefs>): void }>()((set, get) => ({
  ...loadPrefs(),
  set(patch) {
    set(patch);
    const { set: _s, ...rest } = get();
    savePrefs(rest);
  },
}));
