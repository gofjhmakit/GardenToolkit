/**
 * Garden Toolkit — proposed canvas & data palette (see docs/DESIGN.md §7).
 *
 * Paste-in replacements for:
 *   - OBJECT_KINDS_INFO[kind].fill / .stroke   (src/domain/objectKinds.ts)
 *   - CATEGORY_COLORS                          (src/ui/plantColors.ts)
 *   - EVENT_COLORS                             (src/ui/views/CalendarView.tsx)   — optional
 *   - GROUP_COLORS                             (src/ui/views/RotationView.tsx)   — optional
 *   - hard-coded overlay colours               (src/ui/canvas/*.tsx)             — optional
 *
 * Design rules (verified with WCAG 2.x relative luminance, see DESIGN.md):
 *   - Paper is #F6F4EE (light theme) / #D7D2C5 (dark theme "dimmed paper").
 *   - Every object STROKE is ≥ 3.2:1 on both papers (non-text contrast, WCAG 1.4.11).
 *   - Every stroke is ≥ 2.9:1 against its own fill, so outlines stay crisp on textures.
 *   - Fills are low-chroma "botanical survey" tints: earth for beds, sage/moss for
 *     planting, cool slate-teal for water/glass, warm greys for hardscape. Kinds that
 *     share a hue family are separated by LIGHTNESS and PATTERN, not hue alone —
 *     that is what keeps them apart for deutan/protan viewers.
 *   - Category colours: 16 hues fitted in OKLCH to each category's natural colour
 *     within ±18°, each ≥ 3.1:1 on paper and on white, maximising the worst-case
 *     pairwise ΔE76 under simulated deuteranopia/protanopia (Machado 2009, severity 1).
 *     Worst pair: normal 12.8, deutan 9.6, protan 10.8 (current palette: 6.0 / 4.2 / 4.7).
 *     `plantColor()` shifts these ±28 per channel — keep that behaviour.
 */
import type { ObjectKind } from '../../src/domain/project';
import type { PlantCategory } from '../../src/plants/schema';
import type { RotationGroup } from '../../src/plants/schema';
import type { CalendarEventType } from '../../src/engine/calendar';

/* ------------------------------------------------------------------------ */
/* Object kinds                                                              */
/* ------------------------------------------------------------------------ */

export const OBJECT_KIND_COLORS: Record<ObjectKind, { fill: string; stroke: string }> = {
  // Beds & planting — earth family, separated by lightness/undertone + prefix code
  bed: { fill: '#D5C29B', stroke: '#7A5C33' }, //               loam sand     stroke 5.6:1
  'raised-bed': { fill: '#C6A57A', stroke: '#6A4724' }, //       timber edge   7.5:1 (darkest edge = "built")
  planter: { fill: '#D8AE90', stroke: '#8C4A2C' }, //            terracotta    6.1:1
  'vegetable-bed': { fill: '#CBBC89', stroke: '#625426' }, //    olive loam    6.8:1
  'flower-bed': { fill: '#E4C3CC', stroke: '#9A4A66' }, //       dusty rose    5.4:1
  'herb-area': { fill: '#C6D3A4', stroke: '#556C33' }, //        sage          5.3:1
  'ground-crop-area': { fill: '#CDB38D', stroke: '#6B4F2C' }, // tilled earth  6.9:1
  orchard: { fill: '#D9E3B9', stroke: '#557036' }, //            meadow tint   5.1:1
  area: { fill: '#E2DCC9', stroke: '#6B6450' }, //               neutral linen 5.4:1

  // Trees & shrubs (canopy drawn at ~0.55 opacity over whatever is below)
  tree: { fill: '#86AC70', stroke: '#2F5627' }, //               deep moss     7.7:1
  shrub: { fill: '#A3C486', stroke: '#426B30' }, //              lighter moss  5.7:1

  // Surfaces
  lawn: { fill: '#C8E0A9', stroke: '#4E7D34' }, //               4.4:1
  gravel: { fill: '#E3DFD6', stroke: '#756E61' }, //             4.6:1
  soil: { fill: '#CBB08C', stroke: '#6F5234' }, //               6.5:1
  water: { fill: '#AAD0E4', stroke: '#2F6C90' }, //              5.2:1
  path: { fill: '#DED4C0', stroke: '#76684F' }, //               4.9:1

  // Structures
  greenhouse: { fill: '#DCEDE8', stroke: '#3A7468' }, //         glass teal    4.9:1
  compost: { fill: '#A89070', stroke: '#4B3922' }, //            10.0:1
  building: { fill: '#D8D5CE', stroke: '#514D46' }, //           7.6:1

  // Drawing & annotation
  shape: { fill: '#E9E4D8', stroke: '#6B6557' }, //              5.3:1
  line: { fill: 'none', stroke: '#46433C' }, //                  9.0:1
  label: { fill: '#27251F', stroke: 'none' }, //                 13.9:1 text ink
  dimension: { fill: 'none', stroke: '#2C5E6B' }, //             6.5:1 — slate teal, NOT blue: blue = selection
};

/* ------------------------------------------------------------------------ */
/* Plant categories                                                          */
/* ------------------------------------------------------------------------ */

export const CATEGORY_COLORS: Record<PlantCategory, string> = {
  vegetable: '#1E7A4C', //    garden green      4.8:1 on paper
  herb: '#4F9A43', //         bright leaf       3.2:1
  fruit: '#B83C0C', //        tomato            5.2:1
  berry: '#753753', //        bramble           7.9:1
  'fruit-tree': '#C66A38', // apricot           3.5:1
  nut: '#7A4F2A', //          walnut            6.4:1
  tree: '#1A4F33', //         fir               8.6:1
  shrub: '#3C8467', //        box green         4.1:1
  flower: '#BD609A', //       peony             3.6:1
  perennial: '#814AAB', //    salvia violet     5.5:1
  bulb: '#A87F0A', //         daffodil ochre    3.4:1
  vine: '#455689', //         wisteria slate    6.5:1
  grass: '#809160', //        dry grass         3.1:1
  groundcover: '#1A727B', //  thyme teal        5.1:1
  'green-manure': '#6A741C', // clover olive    4.6:1
  aquatic: '#2F86C8', //      pond blue         3.6:1
};

/* ------------------------------------------------------------------------ */
/* Optional: calendar event types and crop-rotation groups                  */
/* (currently hard-coded in CalendarView.tsx / RotationView.tsx)             */
/* ------------------------------------------------------------------------ */

/** Ordered along the season: prepare (earth) → sow (greens) → plant (teal) → harvest (amber). */
export const EVENT_COLORS: Record<CalendarEventType, string> = {
  prepare: '#7A4F2A',
  'sow-indoors': '#455689',
  'direct-sow': '#1E7A4C',
  transplant: '#1A727B',
  'plant-out': '#1A727B',
  succession: '#4F9A43',
  harvest: '#C66A38',
  custom: '#814AAB',
};

/** Rotation groups — used as badge text/border colour, so all are ≥ 4.5:1 on --panel. */
export const ROTATION_GROUP_COLORS: Record<RotationGroup, string> = {
  legumes: '#2F6E3B',
  brassicas: '#35607F',
  alliums: '#7A4A9E',
  solanaceae: '#A9401A',
  roots: '#8A5A1E',
  cucurbits: '#7E6A0C',
  leafy: '#3E7A2E',
  perennial: '#5E5A52',
  other: '#6B665C',
};

/* ------------------------------------------------------------------------ */
/* Optional: canvas overlay colours (mirror the --cv-* CSS tokens)           */
/* Use `var(--cv-select)` etc. directly in SVG attributes where possible;    */
/* these constants are for exports (SVG/PNG/PDF) where CSS vars don't exist. */
/* ------------------------------------------------------------------------ */

export const CANVAS_COLORS = {
  paper: '#F6F4EE',
  select: '#3452CC', //        selection outline, handles, size pill (white text on it 6.5:1)
  selectFill: 'rgba(52, 82, 204, 0.08)', // marquee
  handleFill: '#FFFFFF',
  snap: '#D1336F', //          snap guides & snap point (4.3:1 on paper)
  origin: '#C2410C', //        origin cross, calibration, blueprint frame, vertex edit
  gridInk: '#7D7663', //       used with opacity 0.13 (minor) / 0.28 (major)
  rulerTick: '#A29B8C',
  ink: '#26251F', //           object labels, measure pill
  halo: '#FFFFFF', //          label halo, opacity 0.8, width 3
  trunk: '#5E4127',
  dimensionArrow: '#2C5E6B',
} as const;
