# Garden Toolkit — Design direction

**Drafting table, field notebook.** A precise, calm instrument for planning living things. The chrome
behaves like a pro CAD/design tool (Figma, Linear, Vectorworks): dense, quiet, and keyboard-first.
The materials are organic: warm stone greys instead of blue-greys, one deep fir-green accent,
drafting paper for the canvas, and survey-map tints for objects. The garden imagery is the user's
own plan. We add no leaves, no illustrations and no gradients on content.

Files:

- `docs/design/styles.proposed.css` is a drop-in replacement for `src/ui/styles.css`. It keeps every existing class and selector.
- `docs/design/palette.proposed.ts` holds the object, category, calendar and rotation colours, plus overlay constants.

---

## 1. Principles

1. **The canvas is the hero.** Chrome is 44 + 34 px at the top, 26 px at the bottom and two side panels. Chrome surfaces are near-white and quiet, so the paper-coloured canvas and its objects carry all the colour.
2. **Colour means something.** Green is the brand and the *active mode*. Cobalt is *selection and focus*, and nothing else is blue-violet. Magenta is *snapping*. Burnt orange is *origin, calibration and the blueprint frame*. Earth, moss and slate are *objects*. Red is *destructive or error*.
3. **Density without noise.** A 28 px control height, 13 px body text and hairline dividers. Emphasis comes from weight and ink colour, not boxes. Secondary actions stay hidden until hover or focus.
4. **Numbers are data.** Measurements, counts, coordinates and dates always use tabular figures, so columns and status readouts don't jitter.
5. **Honest affordances.** Every interactive element shows a visible 2 px focus ring. Control boundaries are at least 3:1 and text at least 4.5:1 in both themes.

---

## 2. Colour system

Neutrals are "warm stone", a hue of about 45° at very low chroma. They read as paper and linen rather than beige. Every token below exists in both themes. Legacy names (`--bg`, `--panel` …) are kept because the TSX files reference them.

### Light (`:root`)

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#EDEBE5` | App backdrop, view background, home |
| `--panel` | `#FAF9F6` | Toolbar, tabs, side panels, cards, status bar |
| `--panel-2` | `#F2F0EA` | Secondary surface: tracks, filter column, dialog footer |
| `--raised` | `#FFFFFF` | Buttons, menus, toasts |
| `--field` | `#FFFFFF` | Input fill |
| `--border` | `#E3DFD6` | Hairlines (decorative) |
| `--border-strong` | `#CEC8BC` | Button outlines, table header rule |
| `--border-control` | `#8F8879` | Input, select and addon boundary (**3.5:1** on field, 3.3:1 on panel) |
| `--text` | `#1D1C19` | Primary ink |
| `--text-2` | `#53504A` | Secondary text, icons at rest |
| `--muted` | `#6B665C` | Captions, overlines, placeholders |
| `--hover` / `--pressed` | `rgba(46,40,26,.055)` / `.10` | State overlays, surface-agnostic |
| `--accent` | `#2D6A4B` | Fir green: primary buttons, active tool, active tab |
| `--accent-hover` | `#245A3F` | |
| `--accent-soft` | `#E3EEE6` | Pressed toggles, selected chips |
| `--accent-text` | `#FFFFFF` | Text on accent |
| `--select` / `--focus-color` | `#3452CC` | Selection, focus ring, focused input border |
| `--select-soft` | `rgba(52,82,204,.11)` | Selected rows |
| `--warn` / `--warn-soft` | `#8F4E10` / `#F9ECDB` | |
| `--danger` / `--danger-soft` | `#B02E23` / `#FBE5E1` | |
| `--ok` / `--ok-soft` | `#2B6E40` / `#E2F0E4` | |
| `--info` / `--info-soft` | `#2D5C82` / `#E6EEF5` | (new) |
| `--canvas-bg` | `#F6F4EE` | Drafting paper |

### Dark (`prefers-color-scheme: dark` on `:root:not([data-theme='light'])`, and `:root[data-theme='dark']`)

| Token | Hex | Token | Hex |
|---|---|---|---|
| `--bg` | `#141412` | `--accent` | `#6DBA8A` |
| `--panel` | `#1B1B19` | `--accent-hover` | `#82C89C` |
| `--panel-2` | `#232220` | `--accent-soft` | `#1F3328` |
| `--raised` | `#2A2926` | `--accent-text` | `#0D1A12` |
| `--field` | `#201F1D` | `--select` / `--focus-color` | `#8AA2FF` |
| `--border` | `#302F2B` | `--warn` / soft | `#E3A765` / `#3A2C1C` |
| `--border-strong` | `#423F3A` | `--danger` / soft | `#F08A7E` / `#3D211E` |
| `--border-control` | `#7A756A` | `--ok` / soft | `#7CC792` / `#1C3224` |
| `--text` | `#ECE9E2` | `--info` / soft | `#8DB6DB` / `#1E2A36` |
| `--text-2` | `#BEB9AE` | `--canvas-bg` | `#D7D2C5` (dimmed paper) |
| `--muted` | `#979286` | | |

The canvas stays **paper in dark mode**, dimmed to `#D7D2C5`, so the object palette and printed output match 1:1. The chrome goes dark around it, as a lit drafting board would. A true "night paper" canvas would need a second object palette and is out of scope.

### Canvas overlay tokens (`--cv-*`, the same in both themes because they sit on paper)

`--cv-select #3452CC` · `--cv-select-fill rgba(52,82,204,.08)` · `--cv-snap #D1336F` · `--cv-origin #C2410C` · `--cv-grid-ink #7D7663` · `--cv-ruler-tick #A29B8C` (dark: `#6A655B`) · `--cv-ruler-text = --muted` · `--cv-ink #26251F` · `--cv-halo #FFFFFF` · `--cv-trunk #5E4127` · `--cv-hint-bg rgba(29,28,25,.88)` / `--cv-hint-text #F6F4EE`.

### Verified contrast (WCAG 2.x)

| Pair | Light | Dark |
|---|---|---|
| text / panel | 16.2 | 14.2 |
| text / bg | 14.3 | 15.2 |
| text-2 / panel · panel-2 | 7.6 · 7.1 | 8.8 · 8.1 |
| muted / panel · panel-2 · bg · raised | 5.4 · 5.0 · 4.8 · 5.7 | 5.6 · 5.1 · 6.0 · 4.7 |
| accent / panel · accent-soft | 6.1 · 5.4 | 7.4 · 5.8 |
| accent-text / accent | 6.4 | 7.7 |
| select (focus ring) / panel · bg | 6.2 · 5.5 | 7.1 |
| warn / warn-soft | 5.5 | 6.4 |
| danger / danger-soft | 5.3 | 6.0 |
| ok / ok-soft | 5.2 | 6.8 |
| info / info-soft | 6.0 | 6.8 |
| text on selected row (select-soft over panel) | 13.8 | 10.7 |
| border-control / field (non-text, ≥3) | 3.5 | 3.6 |
| solid danger button text (`--panel` on `--danger`) | 6.1 | 7.1 |
| canvas: white on selection pill · cv-select / paper · dim paper | 6.5 · 5.9 · 4.3 | — |
| canvas: hint text on hint pill | 11.0 | — |
| canvas: label ink on paper · on bed fill · on compost (darkest fill) | 14.0 · 8.8 · 5.0 | — |

All text pairs meet AA (4.5:1), and all control boundaries and focus indicators reach at least 3:1. `.btn` outlines (`--border-strong`) are decorative, since the label identifies the button. The toolbar `kind-select` rests on `--border`, and its chevron and text identify it.

---

## 3. Typography

System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, "Noto Sans", …`. That is SF on macOS and iOS, Segoe UI Variable on Windows 11, and Noto or Roboto elsewhere. The monospace stack (`ui-monospace, SF Mono, Cascadia Mono, …`) is used **only** for plan codes (B1, RB2), never for measurements.

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `--fs-3xl` | 26 / 1.2 | 650 | −0.025em | Home "Your gardens" |
| `--fs-2xl` (h1) | 20 / 1.2 | 650 | −0.02em | View titles |
| `--fs-xl` (h2) | 16 / 1.3 | 600 | −0.012em | Section headings, empty-state titles |
| `--fs-lg` | 14 / 1.35 | 600 | −0.01em | Dialog titles, card names, month names |
| `--fs-md` (body) | 13 / 1.45 | 400/500 | 0 | Default UI and body |
| `--fs-sm` | 12 / 1.4 | 400/500 | 0 | Tables, tabs, secondary UI, chips |
| `--fs-xs` | 11 / 1.3 | 500/600 | 0 | Status bar, badges, field labels, captions |
| overline (h4, `.menu-label`, `th`) | 11 / 1.3 | 600 | **+0.06em, UPPERCASE** | Section labels in panels |
| `--fs-2xs` | 10.5 | 400 | +0.02em | Plan codes in tree rows, `.conf` badges only |

Rules:

- Use only three weights: 400, 500 for UI labels and buttons, and 600/650 for headings and emphasis. Never use 700 except for `.brand`.
- **Tabular numbers:** `.num`, the whole `.statusbar`, `.stat .value`, `.table .r`, input groups (length and number fields), `.project-meta`, canvas `<text>` and `.doc-preview` tables. On canvas labels, write units with a thin space where possible (`3.00 m`).
- Scientific names are italic in `--text-2`. Varieties go in single curly quotes (‘Nantes 2’).
- An optional self-hosted font for later, as a visual upgrade that stays offline-safe: **Inter** (OFL), variable woff2 in `public/fonts/`, preloaded, with `font-display: swap` and `font-feature-settings: 'cv11','ss01'` (plus `'tnum'` where noted). Precache it through the existing Workbox `globPatterns` (woff2 is already listed). Put it first in `--font`. Nothing else changes.

---

## 4. Space, radius, layout

- **Spacing** is on a 4 px grid, with 2 px half-steps for chrome: `2 4 6 8 12 16 20 24 32 48` (`--sp-1…10`). Panel sections use 14 px padding, views 24/28 px, dialogs 16 px (kept at 16 because PlantBrowser bleeds with `margin:-16`), and cards 14 px.
- **Radius:** 3 px (badges, keycaps, swatches), 5 px (small buttons, tree rows, menu items), **6 px (controls)**, 8 px (menus, segmented track, tool groups), 10 px (cards, stats, toasts, zoom island), 12 px (dialogs, project cards, empty states), and pill (chips, canvas hint).
- **Control heights:** 28 px default, 24 px `.sm`, 30 px toolbar tool buttons, 26 px tree rows, and 36/34 px on `pointer: coarse` (tablet).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [◆] Allotment 14 │ File Edit View Arrange Help │ [▲✋] [Bed ▾][□○⬡✎∿] [🌳✿] [T↔📏⚖] …   [+ Add plants] │ 44 panel
├────────────────────────────────────────────────────────────────────────────┤
│ Design  Plantings  Calendar  Harvest  Care …    (2px fir underline on active)│ 34 panel
├──────────────┬───────────────────────────────────────────┬─────────────────┤
│ Layers    +  │ m  0.00m     1.00m     2.00m  (ruler, panel)│ Properties      │
│ [Filter…]    │ ┆                                          │ ▣ Garden bed 🔒👁🗑│
│ ▾ Beds (8)   │ ┆      paper #F6F4EE, grid ink @13%/28%    │ NAME       CODE │
│  ▣ Bed 1  B1 │ ┆      ┌───────┐                            │ SIZE & POSITION │
│ ▌▣ Bed 2  B2 │ ┆      │  B1   │◻ cobalt handles            │ …               │
│ ▾ Trees (2)  │ ┆      └───────┘                            │                 │
│  256px panel │ ┆ ▬▬ 1.00 m    ( hint pill )   [− 100% + ⤢ ⌖] │ 320px panel     │
├──────────────┴───────────────────────────────────────────┴─────────────────┤
│ ● Saved locally  X 6.20 m Y 4.40 m  Zoom 100% …          [⌁ Snap on] Grid 50 cm │ 26 panel
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Elevation

Shadows use a warm tint (`rgba(38,32,20,…)`). In dark mode they get deeper and add a 1 px light rim, because shadows alone vanish on dark surfaces.

| Level | Token | Use |
|---|---|---|
| 0 | none + hairline | Panels, toolbar, tree |
| xs | `0 1px 0 /.05` | Buttons, cards, stats (rest) |
| sm | `0 1px 2px /.08` | Segmented thumb, active tool, primary button |
| md | `0 2px 4px /.06, 0 8px 24px /.12` | Menus, zoom island, canvas-empty card, hovered project card, dim input |
| lg | `0 4px 8px /.08, 0 20px 48px /.20` | Dialogs, toasts |

Floating canvas UI (the zoom island and hint pill) uses `backdrop-filter: blur(8px)` over a 92% panel so the plan shows through.

---

## 6. Iconography (lucide-react)

| Context | Size | strokeWidth |
|---|---|---|
| Toolbar tools | **16** (currently 17) | **1.75** |
| Worktabs, buttons, menu items | 14 | 1.75 |
| Tree rows, inline with 12–13 px text | 13–14 | 1.75 |
| Status bar | 12 | 2 |
| Empty-state tile | 20 (inside a 40 px `.empty-state-icon`) | 1.5 |
| Callouts, toasts | 16 | 1.75 |

- Icons inherit `currentColor`. At rest they use `--text-2` or `--muted`, on hover `--text`, and when active `--accent`. On solid accent they use `--accent-text`. Never colour an icon with a semantic colour unless it *is* the status (toast, callout, favourite star).
- Pair one icon with one meaning across the app: Sprout = plants/plantings, MapIcon = design, Layers = layers/objects, Magnet = snap.
- Set `absoluteStrokeWidth` on tool icons so 1.75 px holds at every size.

---

## 7. Components

- **Buttons (`.btn`).** 28 px, radius 6, weight 500, white fill with a `--border-strong` outline and an xs shadow. Hover adds the `--hover` overlay and pressed adds `--pressed`.
  - `.primary` is fir green with a 12% top highlight.
  - `.danger` is outlined red.
  - **New** `.danger.solid` is the destructive *confirm*.
  - `.ghost` has no chrome and `--text-2` ink.
  - `.sm` is 24 px at 12 px text.
  - Disabled is 45% opacity with no shadow.
- **Icon buttons.** 28 px transparent with 6 px radius. Toggled state (`aria-pressed`) is accent-soft with accent ink, used for favourites and object lock.
- **Toolbar tools.** 30 px. The **active tool is solid fir green with white icon**, because the tool is the app's mode and must read at a glance, like Figma's blue tool. Group tools in `.tool-group` wells (a `--panel-2` track with 8 px radius and 2 px padding) instead of loose separators.
- **Segmented control.** A sunken `--panel-2` track with 2 px padding. The selected segment is a raised white thumb with an sm shadow and `--text` ink. Weight stays 500 so widths don't jump.
- **Menus.** White with 8 px radius, 4 px padding and md shadow. Items are 28 px with 5 px radius, and hover is a neutral `--hover` (not green). Shortcuts sit right-aligned in `--muted` at 11 px. Section labels are overlines. Separators bleed full width. Menus enter over 140 ms with fade plus 2 px drop.
- **Dialogs.** 12 px radius, lg shadow and a 36% warm backdrop with 2 px blur. Default width is 560 px. The 48 px header has a 14 px/600 title. The footer sits on `--panel-2` and is right-aligned: Cancel on the left, then the primary action. Dialogs enter over 200 ms with fade, 6 px rise and 0.985→1 scale.
- **Inputs and selects.** 28 px with 6 px radius on `--field`, with a `--border-control` boundary. Hover darkens the border to `--text-2`. Focus sets a cobalt border plus a 3 px 20% cobalt ring. The select chevron is an inline SVG data-URI per theme, so it works offline. Unit addons sit on `--panel-2` at 11 px/500 in `--muted`. Invalid state uses a red border and a red ring on focus.
- **Chips.** 24 px pills. When selected they turn accent-soft with an accent border, and a leading 6 px dot is added so the state is not colour-only.
- **Badges.** 18 px *tags*, not pills, with 3 px radius and 11 px/500 text. The soft semantic fill carries an 18% border. `.conf` gives the 10.5 px uppercase variant. **New:** `.badge.info` and `.badge.dot`.
- **Cards and stats.** `--panel`, 10 px radius and an xs shadow. Stat values are 22 px/650 tabular with an 11 px `--muted` label above. **New:** `.card.flush` hosts a full-bleed table.
- **Tables.** Headers are 11 px uppercase overlines on `--panel`, sticky, over a `--border-strong` rule. Rows use 8/10 px padding, hairline separators, no border on the last row and a `--hover` highlight. Numeric columns (`.r`) are right-aligned and tabular.
- **Tree rows (Layers).** 26 px, inset 6 px from the panel edge, with 5 px radius. Layer rows are 600 `--text`, object rows are 400 `--text-2`, and plan codes are mono 10.5 px `--muted`. Selected rows get `--select-soft` plus a **2 px cobalt bar on the panel edge**. Row actions stay hidden until hover or focus, except state flags (hidden/locked), which always show and are *not* tinted green.
- **Workspace tabs.** 12 px/500 `--text-2` with `--muted` icons. On hover, text goes to `--text` and a `--border-strong` underline appears. The active tab gets `--text` at 600, an **accent icon** and a 2 px fir underline, inset 8 px and rounded at the top.
- **Status bar.** 26 px `--panel` at 11 px, tabular throughout, with 16 px gaps. The save dot is 7 px with a 2 px halo and pulses at 1 s while saving. The snap toggle is an accent-soft pill when on. Warnings use `badge warn` (see M7).
- **Toasts.** Bottom-right above the status bar, 360 px wide on `--raised` with 10 px radius and lg shadow. A **3 px semantic stripe** marks info (slate), ok (green) and error (red). They rise 8 px as they enter.
- **Callouts.** Soft semantic fill with an 18% border and 8 px radius. The icon takes the semantic colour.
- **Empty states.** A dashed `--border-strong` outline with 12 px radius over a faint 16 px dot-grid. They are centred: optional `.empty-state-icon` (a 40 px accent-soft tile), then an h2, then a paragraph of 46ch at most, then the actions.
- **Keycaps.** A standalone `<kbd>` renders as a small cap with a 2 px bottom border. `.kbd` inside menus stays plain text.

---

## 8. Motion

| Token | Duration | Use |
|---|---|---|
| `--dur-1` | 90 ms | Colour, background and border changes on hover or press |
| `--dur-2` | 140 ms | Menus, popovers, segmented, tab underline |
| `--dur-3` | 200 ms | Dialogs, toasts, canvas hint |

- Easing is `--ease: cubic-bezier(.2,0,0,1)` for state changes and `--ease-out: cubic-bezier(.16,1,.3,1)` for entrances. There are no exit animations, since elements are unmounted. Nothing bounces.
- Distances are 2–8 px. **Never animate the canvas viewport, objects or selection.** Zoom and pan must track the input exactly.
- `.spin` uses the `gt-spin` animation, 0.8 s linear infinite, for `Loader2`.
- `prefers-reduced-motion: reduce` sets every animation and transition to 0.01 ms and removes the project-card lift. The one exception is `.spin`, which keeps turning at 1.6 s because it signals status.

---

## 9. Canvas visual language

- **Paper:** `#F6F4EE`, or `#D7D2C5` in dark mode. No vignette and no texture.
- **Grid:** `--cv-grid-ink #7D7663`. Minor lines use 13% opacity and major lines 28%. The origin is a 12 px `--cv-origin` cross.
- **Rulers:** 20 px bands on `--panel` at 94%, with `--border-strong` edge rules, `--cv-ruler-tick` ticks and 9 px `--cv-ruler-text` labels. The cursor tracker is `--cv-origin`.
- **Objects:** strokes are 1.25 px non-scaling in the colour of the kind, and fills are the kind's pattern (see palette). Tree canopy is at 55% opacity with a 62% inner ring at 35%. Root zones are dashed 6/5 at 60%. Trunks use `--cv-trunk`.
- **Selection:** a 1.5 px `--cv-select` outline. Hover is 1 px. The multi-selection frame is 1 px dashed 4/3. Handles are 8 px white squares with a 1.5 px cobalt stroke, and the rotate handle is a circle on a 1 px stem. The size pill is cobalt with a 9 px radius and white 11 px/600 tabular text, for example `3.00 m × 1.00 m`.
- **Marquee:** `--cv-select-fill` with a 1 px dashed cobalt edge.
- **Snap guides:** 1 px `--cv-snap` magenta lines extending 8 px past both ends, with an 8 px hollow square at the snap point. Only snapping uses magenta.
- **Calibration, blueprint frame and vertex editing:** `--cv-origin` burnt orange, dashed 6/3 while calibrating and 6/4 when the blueprint is locked.
- **Dimensions:** slate-teal `#2C5E6B`, never blue, so they are not mistaken for selection. Use 1.25 px lines with filled arrows. The label is 11 px/600 on a 90% paper plate.
- **Labels:** code in 11 px/600, name in 10.5 px, both in `--cv-ink` with a 3 px white halo at 75–80% (`paint-order: stroke`).
- **Tool hint:** a centred ink pill 16 px above the bottom, with its max width reserving the scale bar and zoom island. It carries at most one sentence.
- **Zoom island:** bottom-right, 10 px radius, md shadow and blur, with a tabular percentage.

### Object palette (`OBJECT_KIND_COLORS`)

Earth for beds, moss for plants, slate-teal for water and glass, warm greys for hard surfaces. Hue families are separated by **lightness and pattern**, not hue alone, so they survive colour-vision deficiency: soil dots, grass ticks, gravel pebbles, water waves, paving joints, glazing grid and structure hatch. Every stroke is at least 3.2:1 on both papers, and every stroke is at least 3.2:1 against its own fill.

| Kind | Fill | Stroke | | Kind | Fill | Stroke |
|---|---|---|---|---|---|---|
| bed | `#D5C29B` | `#7A5C33` | | tree | `#86AC70` | `#2F5627` |
| raised-bed | `#C6A57A` | `#6A4724` | | shrub | `#A3C486` | `#426B30` |
| planter | `#D8AE90` | `#8C4A2C` | | lawn | `#C8E0A9` | `#4E7D34` |
| vegetable-bed | `#CBBC89` | `#625426` | | gravel | `#E3DFD6` | `#756E61` |
| flower-bed | `#E4C3CC` | `#9A4A66` | | soil | `#CBB08C` | `#6F5234` |
| herb-area | `#C6D3A4` | `#556C33` | | water | `#AAD0E4` | `#2F6C90` |
| ground-crop-area | `#CDB38D` | `#6B4F2C` | | path | `#DED4C0` | `#76684F` |
| orchard | `#D9E3B9` | `#557036` | | greenhouse | `#DCEDE8` | `#3A7468` |
| area | `#E2DCC9` | `#6B6450` | | compost | `#A89070` | `#4B3922` |
| shape | `#E9E4D8` | `#6B6557` | | building | `#D8D5CE` | `#514D46` |
| line | none | `#46433C` | | label | `#27251F` | none |
| dimension | none | `#2C5E6B` | | | | |

### Plant category palette (`CATEGORY_COLORS`)

The 16 hues were fitted in OKLCH. Each stays within ±18° of its category's natural hue and within a per-category lightness band (tree dark, grass light…). Each is at least 3.1:1 on paper and on white. The fit maximises the worst-case pairwise ΔE under simulated deuteranopia and protanopia. **Worst pair: normal 12.8, deutan 9.6, protan 10.8.** The current palette scores 6.0, 4.2 and 4.7; perennial and vine were nearly identical for deutans. Colour is still never the only cue: lists show category names and plantings show crop names.

`vegetable #1E7A4C · herb #4F9A43 · fruit #B83C0C · berry #753753 · fruit-tree #C66A38 · nut #7A4F2A · tree #1A4F33 · shrub #3C8467 · flower #BD609A · perennial #814AAB · bulb #A87F0A · vine #455689 · grass #809160 · groundcover #1A727B · green-manure #6A741C · aquatic #2F86C8`

`EVENT_COLORS` and `ROTATION_GROUP_COLORS` are in the palette file. Rotation colours reach at least 4.5:1 on `--panel-2` because they are used as badge text.

---

## 10. Home screen

```
 · · · · · · · · · · · · faint 16px dot grid, fades out over 380px · · · · · · · ·
   [◆] Garden Toolkit                               [Import project] [+ New garden]

   Your gardens                                           (26px / 650 / −0.025em)
   Plans are saved automatically in this browser. Nothing is uploaded.

   ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
   │ ░ plan thumbnail ░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │  .project-thumb (16:9,
   │ ░ on paper + grid ░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │   paper + grid)
   │ Allotment 14     ··· │ │ Front yard       ··· │ │ …                    │  14px/600
   │ ◇ 42 objects ✿ 18 pl.│ │                      │ │                      │  12px muted, tabular
   │ Edited 2 h ago       │ │                      │ │                      │  .project-meta 11px
   └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
   (12px radius, lifts 1px + md shadow on hover; ··· at 60% until hover)

   What you can do  ─ feature tiles (only while < 3 projects) ─────────────────
```

- The only decoration is the fading dot grid, which echoes the canvas. There is no hero image and no illustration.
- Project cards are the gallery. A plan thumbnail is the single biggest upgrade (M9).
- The empty state is a dashed dot-grid well with a 40 px sprout tile, a one-line promise and two actions.

---

## 11. Markup changes worth making

Ordered by impact. Class names refer to the proposed CSS.

- **M1. Canvas overlay colours → tokens.** In `src/ui/canvas/Canvas.tsx` (L264–L402), replace `'#2767c2'` with `'var(--cv-select)'`, `rgba(39,103,194,0.08)` with `var(--cv-select-fill)`, `'#d0357a'` with `var(--cv-snap)`, `'#b0442a'` with `var(--cv-origin)`, and `'#23241f'` with `var(--cv-ink)`. Make the same changes in `src/ui/panels/BackgroundInspector.tsx:124`. In `src/ui/canvas/Layers2D.tsx`:
  - grid `#8b8674` → `var(--cv-grid-ink)`
  - ruler ticks `#8a887c` → `var(--cv-ruler-tick)`
  - ruler text `#6b6a62` → `var(--cv-ruler-text)` (a real bug today: it is unreadable on the dark ruler)
  - scale bar `#33332e` → `var(--text)` (same bug)
  - origin → `var(--cv-origin)`

  **Do not** use CSS vars in `ObjectLayer.tsx` or `Patterns.tsx`. `src/reports/planExport.tsx` reuses them for SVG/PNG/PDF export, where CSS variables don't resolve. Use `CANVAS_COLORS.trunk` and `CANVAS_COLORS.dimensionArrow` there instead (trunk `#6b4a2b` at ObjectLayer:48, and the marker `#2f5e8a`). Better still, colour the marker from `OBJECT_KINDS_INFO.dimension.stroke`. Once M1 lands, delete the "Canvas bridge" block in the CSS; it retints these hex values through attribute selectors until then.
- **M2. Toolbar grouping** (`src/ui/editor/EditorShell.tsx`, the `.tools` block). Wrap each group in `<div className="tool-group" role="group" aria-label="…">`:
  - Select + Pan
  - kind-select + the five shape tools
  - Tree + Shrub
  - Text + Dimension + Measure + Calibrate

  Drop the `.tool-sep` elements *inside* `.tools` and use `gap: 6px` on `.tools`. Move "Import blueprint" out of the drawing tools to an `.icon-btn` beside `AddPlantsButton` (it is a file action, not a tool). Keep the `.tool-sep` after `MenuBar`.
- **M3. Icon sizing.** Set tool icons to `size={16} strokeWidth={1.75} absoluteStrokeWidth` (TOOLS, DRAW_TOOLS, SYMBOL_TOOLS, ANNOT_TOOLS), and workspace tab icons to `strokeWidth={1.75}`. Add `aria-keyshortcuts={shortcut}` to `ToolButton`.
- **M4. Layers panel** (`src/ui/panels/LayersPanel.tsx`):
  - Replace the filter wrapper's inline style (`padding: 8, borderBottom…`) with `className="side-toolbar"` and wrap the input in `<label className="search-field"><Search size={13}/>…</label>`.
  - Render the layer count as `<span className="code">{count}</span>` instead of `(count)`, which is quieter and aligns with the object codes.
  - Add `aria-pressed={o.hidden}` and `aria-pressed={o.locked}` to the object-row hide and lock buttons, and the same for background rows. That keeps the state flags visible without `:has()` and exposes the state to screen readers.
  - Move the inline `style={{ border: 0, background: 'none', … }}` on `.label` buttons into CSS as `.tree-row button.label { border:0; background:none; padding:0; text-align:left; cursor:pointer }`.
- **M5. Inspector header** (`src/ui/panels/Inspector.tsx`). For a single object, show the swatch and plan code in `.side-header`: `<span className="swatch"/> <h2>{info.label}</h2> <span className="code mono muted">{o.code}</span>`. Then remove the duplicate swatch and label row at the top of `ObjectInspector.tsx` and keep only its lock, hide and delete buttons.
- **M6. Canvas empty state** (`src/ui/canvas/Canvas.tsx:201–212`). Add `<div className="empty-state-icon"><ImagePlus size={20}/></div>` above the h2. Keep the two buttons, and add a third, `btn ghost sm` "Keyboard shortcuts (?)".
- **M7. Status bar** (`src/ui/editor/StatusBar.tsx`):
  - Put `<span className="status-sep"/>` between the save, cursor, zoom and selection groups.
  - Shorten "Units: real-world metric (m, cm, m²)" to "Metric", moving the long text into `title`.
  - Replace the inline-styled "Blueprint scale not calibrated" with `<span className="badge warn dot">Scale not calibrated</span>`.
  - Replace the flash message's inline colour with `className="badge danger"` for errors and plain text otherwise.
- **M8. Destructive confirm** (`src/ui/components/feedback.tsx`, ConfirmDialog). Use `className={`btn ${req.danger ? 'danger solid' : 'primary'}`}`. In `Menu.tsx`, render the checked state with lucide `<Check size={14}/>` instead of the "✓" glyph, so it matches the icon weight.
- **M9. Home cards** (`src/ui/home/HomeScreen.tsx`):
  - Add a `<div className="project-thumb">` as the first child of `.project-card`. Render a cached SVG thumbnail from `planExport` (store it in project meta on save), and fall back to an empty paper grid.
  - Replace the "Edited …toLocaleString()" line with `<div className="project-meta">Edited {relative time via Intl.RelativeTimeFormat}</div>`.
  - Make the card a real `<button>`-like element: add `onKeyDown` for Space as well as Enter.
  - In the empty state, replace `<Sprout size={32} …/>` with `<div className="empty-state-icon"><Sprout size={20}/></div>` and drop the h2's inline margin.
  - Show `.feature-list` only while `projects.length < 3` (it is onboarding copy), under a `.home-section-title` "What you can do".
- **M10. Planting labels overflow beds** (`src/ui/canvas/Layers2D.tsx`, label block around L240). When the joined "Carrot ×36, Onion ×24, Lettuce ×8" is wider than the shape, show "3 crops · 68 plants" instead, and put the full list in `<title>`.
- **M11. Views cleanup.** Replace `className="card" style={{ padding: 0, overflowX: 'auto' }}` with `className="card flush"` in HarvestView, PlantingsView and the others. Replace the search icon's absolute positioning in `PlantBrowser.tsx` with `.search-field`. Give the `h1` in each `.view-header` a single-line subtitle of 72ch at most (the CSS already caps it).
- **M12. Hard-coded data colours.** Import `EVENT_COLORS` and `ROTATION_GROUP_COLORS` from the palette. In dark mode, render rotation badges with `color: color-mix(in oklab, ${c} 55%, var(--text))` so they stay at least 4.5:1 on dark panels. In `ReportPreview.tsx`, change `#777` to `#6B665C` and `#f4f2ec` to `#F2F0EA`; the preview is always light paper.
- **M13. Theme switch.** Settings should offer System, Light and Dark by setting `document.documentElement.dataset.theme`. The CSS already supports it. Update `vite.config.ts` to `theme_color: '#2D6A4B'` and `background_color: '#EDEBE5'`.

---

## 12. Notes for implementation

- Drop-in check: run `cp docs/design/styles.proposed.css src/ui/styles.css`. Every class and custom property used in `src/` is defined, and esbuild parses the file cleanly. `:has()` is used only for progressive enhancement of row flags (M4 removes the dependency).
- The "Canvas bridge" rules are CSS attribute selectors on the current hard-coded SVG hex values. They are temporary, so remove them after M1.
- The screens were reviewed in Chromium at 1440×900, light and dark: home, editor with the palette applied, dialogs, menus, the Calendar, Harvest and Plant database views.
