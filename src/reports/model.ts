import { t } from '../i18n';
/**
 * Document model for generated reports. Builders produce this structure
 * from project data (pure, testable); renderers turn it into PDF or an HTML
 * preview. Keeping content separate from rendering lets us add formats
 * (e.g. DOCX, Markdown) later without touching the content logic.
 */
export type Cell = string | number | null;

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string; style?: 'muted' | 'note' | 'warning' }
  | { type: 'bullets'; items: string[] }
  | { type: 'kv'; rows: [string, string][] }
  | { type: 'table'; columns: string[]; rows: Cell[][]; widths?: number[]; caption?: string }
  | { type: 'plan'; caption?: string; fullPage?: boolean }
  | { type: 'stats'; items: { label: string; value: string; sub?: string }[] }
  | { type: 'pagebreak' };

export interface ReportDoc {
  id: ReportKind;
  title: string;
  subtitle: string;
  generatedAt: string;
  projectName: string;
  blocks: Block[];
  /** Landscape pages suit wide plans. */
  orientation: 'portrait' | 'landscape';
}

export type ReportKind = 'planting-plan' | 'garden-design' | 'care-guide' | 'calendar' | 'harvest-plan' | 'complete';

export const REPORT_INFO: Record<ReportKind, { title: string; description: string }> = {
  'planting-plan': {
    title: t('Planting plan'),
    description: t('Scaled plan with numbered areas, and what to plant where: quantities, spacing, depth, dates and expected harvest. Made for printing and taking outside.'),
  },
  'garden-design': {
    title: t('Garden design'),
    description: t('The scaled design drawing with a legend of all areas, structures and surfaces with dimensions and areas.'),
  },
  'care-guide': {
    title: t('Care guide'),
    description: t('Plant-by-plant care instructions grouped by plant type: where it grows, planting, spacing, watering, feeding, support, pests, harvest and winter care.'),
  },
  calendar: {
    title: t('Planting calendar'),
    description: t('Month-by-month tasks generated from your plants and frost dates, including your own edits and custom tasks.'),
  },
  'harvest-plan': {
    title: t('Harvest plan'),
    description: t('Expected harvest windows and yield ranges per crop, with the assumptions behind each estimate.'),
  },
  complete: {
    title: t('Complete garden information'),
    description: t('Everything in one document: overview and totals, all areas and plants, calendar, care, rotation, notes, assumptions and warnings.'),
  },
};
