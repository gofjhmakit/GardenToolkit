/**
 * Reading and writing project packages (.gtkproject ZIP) and plain JSON
 * project files, with defensive validation for imports:
 *   - size limits (whole file, per entry, entry count) checked before
 *     decompression, to defuse ZIP bombs;
 *   - only expected entries are extracted;
 *   - images are accepted only if their magic bytes match PNG/JPEG/WebP
 *     (SVG and other active content are rejected);
 *   - JSON is parsed defensively, migrated and schema-validated;
 *   - referential integrity is repaired rather than trusted.
 * Nothing from an imported file is ever executed or rendered as HTML.
 */
import { strFromU8, strToU8, unzip, zipSync, type Unzipped } from 'fflate';
import { newId } from '../lib/ids';
import type { ProjectDoc } from '../domain/project';
import type { Plant } from '../plants/schema';
import type { AssetRecord } from './db';
import {
  extensionFor,
  fromProjectFile,
  migrateProjectFile,
  ProjectFileSchema,
  PROJECT_FILE_FORMAT,
  toProjectFile,
  type AssetInfo,
} from './projectFile';

export const LIMITS = {
  maxFileBytes: 300 * 1024 * 1024,
  maxJsonBytes: 60 * 1024 * 1024,
  maxAssetBytes: 60 * 1024 * 1024,
  maxEntries: 200,
};

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

/** Identifies an image from its magic bytes (never from the file name). */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function assetInfo(a: AssetRecord): AssetInfo {
  return {
    id: a.id,
    mimeType: (a.mimeType as ImageMime) ?? 'image/png',
    byteSize: a.byteSize,
    width: a.width,
    height: a.height,
    name: a.name,
  };
}

const README = `Garden Toolkit project package
==============================
This ZIP file contains a Garden Toolkit project.

  project.json   - the project (format "garden-toolkit-project"), see
                   docs/PROJECT_FORMAT.md in the Garden Toolkit repository
  assets/        - blueprint/background images referenced by project.json

All lengths are millimetres in plan coordinates (+x east, +y south).
`;

/** Builds a .gtkproject ZIP package. */
export async function buildProjectPackage(
  doc: ProjectDoc,
  assets: AssetRecord[],
  lookupPlant: (id: string) => Plant | undefined,
): Promise<Blob> {
  const file = toProjectFile(doc, assets.map(assetInfo), lookupPlant);
  const entries: Record<string, Uint8Array> = {
    'project.json': strToU8(JSON.stringify(file, null, 2)),
    'README.txt': strToU8(README),
  };
  const used = new Set(file.assets.map((a) => a.id));
  for (const a of assets) {
    if (!used.has(a.id)) continue;
    // Images are already compressed; store them without deflate.
    entries[`assets/${a.id}.${extensionFor(a.mimeType)}`] = await blobBytes(a.blob);
  }
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [k, [v, { level: k.startsWith('assets/') ? 0 : 6 }]]),
    ) as Parameters<typeof zipSync>[0],
  );
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

/** Builds a single JSON file, optionally embedding images as base64. */
export async function buildProjectJson(
  doc: ProjectDoc,
  assets: AssetRecord[],
  lookupPlant: (id: string) => Plant | undefined,
  embedAssets = true,
): Promise<Blob> {
  const file = toProjectFile(doc, assets.map(assetInfo), lookupPlant);
  if (embedAssets) {
    const byId = new Map(assets.map((a) => [a.id, a]));
    for (const entry of file.assets) {
      const a = byId.get(entry.id);
      if (a) {
        entry.data = bytesToBase64(await blobBytes(a.blob));
        entry.path = null;
      }
    }
  } else {
    file.assets = [];
    file.backgrounds = [];
  }
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
}

export interface ImportedAsset {
  id: string;
  name: string;
  mimeType: ImageMime;
  byteSize: number;
  width: number;
  height: number;
  blob: Blob;
}

export type ImportResult =
  | { ok: true; doc: ProjectDoc; assets: ImportedAsset[]; warnings: string[] }
  | { ok: false; error: string; details: string[] };

function fail(error: string, details: string[] = []): ImportResult {
  return { ok: false, error, details };
}

function unzipAsync(bytes: Uint8Array, filter: (f: { name: string; originalSize: number }) => boolean): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(bytes, { filter }, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

/**
 * Imports a project from a user-supplied file (ZIP package or JSON).
 * Never throws; returns a structured error instead.
 */
export async function importProjectFile(
  input: Blob,
  knownPlant: (id: string) => boolean,
): Promise<ImportResult> {
  try {
    if (input.size > LIMITS.maxFileBytes) return fail('The file is too large to import.');
    const bytes = await blobBytes(input);
    const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    let jsonText: string;
    const binaryAssets = new Map<string, Uint8Array>();
    if (isZip) {
      let entryCount = 0;
      let rejectReason: string | null = null;
      const files = await unzipAsync(bytes, (f) => {
        entryCount++;
        if (entryCount > LIMITS.maxEntries) {
          rejectReason = 'The package contains too many files.';
          return false;
        }
        if (f.name === 'project.json') {
          if (f.originalSize > LIMITS.maxJsonBytes) {
            rejectReason = 'project.json is too large.';
            return false;
          }
          return true;
        }
        if (/^assets\/[A-Za-z0-9_.-]+\.(png|jpe?g|webp)$/i.test(f.name)) {
          if (f.originalSize > LIMITS.maxAssetBytes) {
            rejectReason = `Asset ${f.name} is too large.`;
            return false;
          }
          return true;
        }
        return false; // ignore everything else
      });
      if (rejectReason) return fail(rejectReason);
      const pj = files['project.json'];
      if (!pj) return fail('This ZIP file is not a Garden Toolkit project package (project.json is missing).');
      jsonText = strFromU8(pj);
      for (const [name, data] of Object.entries(files)) if (name.startsWith('assets/')) binaryAssets.set(name, data);
    } else {
      if (bytes.length > LIMITS.maxJsonBytes) return fail('The JSON file is too large to import.');
      jsonText = strFromU8(bytes);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(jsonText);
    } catch {
      return fail('The file is not valid JSON — it may be damaged or not a Garden Toolkit project.');
    }
    if (!raw || typeof raw !== 'object' || (raw as Record<string, unknown>).format !== PROJECT_FILE_FORMAT) {
      return fail('This file is not a Garden Toolkit project (unexpected "format").');
    }
    let migrated: Record<string, unknown>;
    try {
      migrated = migrateProjectFile(raw as Record<string, unknown>);
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
    const parsed = ProjectFileSchema.safeParse(migrated);
    if (!parsed.success) {
      return fail(
        'The project file is damaged or incomplete and could not be imported.',
        parsed.error.issues.slice(0, 15).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      );
    }
    const file = parsed.data;
    const warnings: string[] = [];
    const assets: ImportedAsset[] = [];
    const assetIdMap = new Map<string, string>();
    for (const entry of file.assets) {
      let data: Uint8Array | undefined;
      if (entry.data) {
        try {
          data = base64ToBytes(entry.data);
        } catch {
          warnings.push(`Embedded image "${entry.name || entry.id}" is not valid base64 and was skipped.`);
          continue;
        }
      } else if (entry.path) {
        data = binaryAssets.get(entry.path);
      }
      if (!data) {
        warnings.push(`Image "${entry.name || entry.id}" is missing from the file.`);
        continue;
      }
      if (data.length > LIMITS.maxAssetBytes) {
        warnings.push(`Image "${entry.name || entry.id}" is too large and was skipped.`);
        continue;
      }
      const mime = detectImageMime(data);
      if (!mime) {
        warnings.push(`File "${entry.name || entry.id}" is not a PNG, JPEG or WebP image and was skipped.`);
        continue;
      }
      const id = newId('ast');
      assetIdMap.set(entry.id, id);
      assets.push({
        id,
        name: entry.name,
        mimeType: mime,
        byteSize: data.length,
        width: entry.width,
        height: entry.height,
        blob: new Blob([data as BlobPart], { type: mime }),
      });
    }
    const { doc, warnings: mapWarnings } = fromProjectFile(file, {
      newProjectId: newId('prj'),
      assetIdMap,
      knownPlant,
    });
    return { ok: true, doc, assets, warnings: [...warnings, ...mapWarnings] };
  } catch (e) {
    return fail('The file could not be read.', [e instanceof Error ? e.message : String(e)]);
  }
}
