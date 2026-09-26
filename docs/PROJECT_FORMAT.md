# Garden Toolkit project format

`format: "garden-toolkit-project"`, `schemaVersion: 1`

The format is defined and validated by `ProjectFileSchema` in `src/persistence/projectFile.ts`. It
is deliberately separate from the internal IndexedDB document, and explicit mapping functions
(`toProjectFile` / `fromProjectFile`) translate between the two.

## Containers

| Container | Extension | Content |
| --- | --- | --- |
| Project package (preferred) | `.gtkproject` | ZIP: `project.json`, `assets/<id>.<png|jpg|webp>`, `README.txt` |
| Single JSON file | `.json` | Same document; images embedded in `assets[].data` as base64 |
| Multi-project backup ("Export all") | `.gtkbackup` | ZIP: `backup.json` manifest (`format: "garden-toolkit-backup"`, `schemaVersion: 1`, list of projects) + one `projects/<name>.gtkproject` package per project |

All three can be imported from the project list ("Import project", several files at once, or by
dropping files onto the page) or from **File → Import project files…** in the editor. Each
project in a backup is validated independently, so one damaged project does not stop the others
from importing.

## Conventions

- Lengths are **millimetres** in plan coordinates: +x east (right), +y south (down). Rotations are
  degrees, clockwise.
- Dates are ISO `YYYY-MM-DD`. Recurring frost dates are `MM-DD`.
- Unknown values are `null` or absent. Nothing is filled with made-up values.

## Top-level structure

```jsonc
{
  "format": "garden-toolkit-project",
  "schemaVersion": 1,
  "exportedAt": "2026-09-25T12:00:00.000Z",
  "generator": { "name": "Garden Toolkit", "version": "1.2.0" },
  "units": { "length": "mm", "angle": "deg", "coordinates": "…" },
  "project": { "id", "name", "description", "createdAt", "updatedAt" },
  "location": { "country", "region", "climateSystem", "climateZone", "lastFrost", "firstFrost",
                "latitude", "longitude", "growingSeasonDays", "frostDateSource" },
  "settings": { "unitSystem", "gridSizeMm", "showGrid", "snapToGrid", "snapToObjects",
                "showRulers", "showPlantMarkers", "activeSeason" },
  "backgrounds": [ { "id", "asset", "name", "position": {x,y}, "rotation", "mmPerPixel",
                     "pixelSize": {width,height}, "crop": {x,y,width,height}|null,
                     "opacity", "visible", "locked", "calibration": {a,b,distanceMm,calibratedAt}|null } ],
  "layers": [ { "id", "name", "role": "background"|"content", "visible", "locked", "objects": [ids bottom→top] } ],
  "groups": [ { "id", "name" } ],
  "objects": [ { "id", "kind", "name", "code", "layer", "group", "position": {x,y}, "rotation",
                 "geometry": { "type": "rect", "width", "height" } | { "type": "ellipse", "rx", "ry" }
                           | { "type": "polygon", "points": [...] } | { "type": "polyline", "points", "width" }
                           | { "type": "text", "text", "fontSize" } | { "type": "dimension", "a", "b", "offset" },
                 "style": { "fill", "stroke", "opacity" }, "locked", "hidden",
                 "properties": { "notes", "soil", "soilPh", "sunLevel", "sunHours", "irrigation",
                                 "material", "heightMm", "rowAxis", "tree": {…} } } ],
  "plantings": [ { "id", "plantId", "objectId", "season", "variety", "method", "areaShare",
                   "spacing": { "inRowMm", "rowMm", "seedMm", "edgeMarginMm", "pattern" },
                   "quantityOverride", "seedQuantityOverride", "yieldOverride",
                   "dates": { "sowIndoors", "directSow", "transplant", "harvestStart", "harvestEnd" },
                   "status", "notes", "createdAt" } ],
  "calendar": { "overrides": { "<eventId>": { "start", "end", "done", "hidden", "note" } }, "tasks": [ … ] },
  "rotationHistory": [ { "id", "objectId", "season", "group", "crop" } ],
  "notes": [ { "id", "title", "body", "createdAt", "updatedAt" } ],
  "plants": [ /* full plant records referenced by plantings (see PLANT_DATA.md) */ ],
  "assets": [ { "id", "path", "mimeType", "byteSize", "width", "height", "name", "data?" } ]
}
```

Object `kind` values: `area, bed, raised-bed, planter, vegetable-bed, flower-bed, herb-area,
ground-crop-area, orchard, tree, shrub, greenhouse, compost, lawn, gravel, soil, water, path,
building, shape, line, label, dimension`.

`plants` makes a project self-contained. On import, plants the receiving database lacks are kept
inside the project (`embeddedPlants`) and are **never** merged into the global plant database.

## Versioning and migration

- `schemaVersion` is an integer. Readers migrate older files step by step (`FILE_MIGRATIONS`)
  and refuse files that are newer than they support, with a clear message.
- The internal document has its own `docVersion` and migration chain
  (`src/persistence/migrations.ts`), so the internal model can change without a new file format.

## Import validation

- File size, `project.json` size, per-asset size, ZIP entry count and the total uncompressed
  size of all extracted entries are checked before decompression.
- Only `project.json` and `assets/<safe-name>.<png|jpg|jpeg|webp>` are extracted.
- JSON is parsed defensively, migrated and schema-validated. Error messages list the offending
  paths.
- Images must have PNG/JPEG/WebP magic bytes. Anything else, such as SVG, is skipped with a
  warning.
- The imported project gets a new project id and new asset ids, so it can never overwrite an
  existing project. Referential problems are repaired and reported.
