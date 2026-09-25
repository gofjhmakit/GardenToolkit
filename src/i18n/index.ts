/**
 * Internationalisation. UI strings use English source text as keys
 * (gettext style), so untranslated strings fall back to English and a new
 * language is added by providing a JSON map. Plant data carries its own
 * localised names/text (see plants/schema.ts) independent of this.
 *
 * Status: infrastructure in place; the UI is being migrated to t() and the
 * Finnish catalogue is partial.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import fi from './fi.json';
import { usePrefs } from '../app/prefs';

void i18next.use(initReactI18next).init({
  lng: usePrefs.getState().language,
  fallbackLng: 'en',
  resources: { en: { translation: {} }, fi: { translation: fi } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

usePrefs.subscribe((s, prev) => {
  if (s.language !== prev.language) {
    void i18next.changeLanguage(s.language);
    document.documentElement.lang = s.language;
  }
});
document.documentElement.lang = usePrefs.getState().language;

export default i18next;
