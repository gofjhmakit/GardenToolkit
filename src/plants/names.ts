import type { Plant } from './schema';
import { language } from '../i18n';

/** Primary common name in the requested language, falling back to English then the scientific name. */
export function plantDisplayName(plant: Plant, lang = language()): string {
  return plant.names.common[lang]?.[0] ?? plant.names.common.en?.[0] ?? plant.names.scientific;
}

export function allCommonNames(plant: Plant): string[] {
  return Object.values(plant.names.common).flat();
}

export function localizedText(text: Record<string, string> | null | undefined, lang = language()): string | null {
  if (!text) return null;
  return text[lang] ?? text.en ?? Object.values(text)[0] ?? null;
}
