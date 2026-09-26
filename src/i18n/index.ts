/**
 * Internationalisation. UI strings use the English source text as the key
 * (gettext style): untranslated strings fall back to English, and a language
 * is added by providing a JSON map (see fi.json). Plant data carries its own
 * localised names and texts (see plants/schema.ts).
 *
 * Initialisation is synchronous so module-level labels (tool names, object
 * kinds) are translated too. Changing the language reloads the app for the
 * same reason — see setLanguage().
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fi from './fi.json';
import { usePrefs } from '../app/prefs';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fi', label: 'Suomi' },
] as const;

void i18next.use(initReactI18next).init({
  lng: usePrefs.getState().language,
  fallbackLng: 'en',
  // en.json holds only plural forms; everything else falls back to the English key itself.
  resources: { en: { translation: en }, fi: { translation: fi } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  initAsync: false,
});

if (typeof document !== 'undefined') document.documentElement.lang = usePrefs.getState().language;

/** Translates an English source string; `{{name}}` placeholders are filled from `vars`. */
export function t(key: string, vars?: Record<string, unknown>): string {
  return i18next.t(key, vars) as string;
}

/**
 * Plural-aware translation: looks up `key_one` / `key_other` (see en.json, fi.json) and fills
 * `{{count}}` plus any other `vars`.
 */
export function tn(key: string, count: number, vars?: Record<string, unknown>): string {
  return i18next.t(key, { ...vars, count }) as string;
}

/** The active UI language code ('en', 'fi'). */
export function language(): string {
  return i18next.language || 'en';
}

/** BCP 47 locale for number and date formatting. */
export function locale(): string {
  return language() === 'fi' ? 'fi-FI' : 'en-GB';
}

/**
 * Switches the UI language. Saves pending work, stores the preference and
 * reloads, so that every label (including module-level ones) is rebuilt.
 */
export async function setLanguage(code: string, beforeReload?: () => Promise<void>): Promise<void> {
  if (code === language()) return;
  await beforeReload?.();
  usePrefs.getState().set({ language: code });
  if (typeof location !== 'undefined' && !import.meta.env.VITEST) location.reload();
  else await i18next.changeLanguage(code);
}

export default i18next;
