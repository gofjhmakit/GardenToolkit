import type { Plant } from './schema';

/** Primary common name in the requested language, falling back to English then the scientific name. */
export function plantDisplayName(plant: Plant, language = 'en'): string {
  return plant.names.common[language]?.[0] ?? plant.names.common.en?.[0] ?? plant.names.scientific;
}

export function allCommonNames(plant: Plant): string[] {
  return Object.values(plant.names.common).flat();
}

export function localizedText(text: Record<string, string> | null | undefined, language = 'en'): string | null {
  if (!text) return null;
  return text[language] ?? text.en ?? Object.values(text)[0] ?? null;
}
