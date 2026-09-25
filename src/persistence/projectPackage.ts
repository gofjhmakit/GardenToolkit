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
  assetPath,
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
  /**
   * Total uncompressed bytes extracted from one ZIP (package or backup). fflate never
   * inflates an entry beyond its declared size, so summing declared sizes bounds memory.
   */
  maxExtractedBytes: 600 * 1024 * 1024,
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
    entries[assetPath(a.id, a.mimeType)] = await blobBytes(a.blob);
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
      let extracted = 0;
      let rejectReason: string | null = null;
      const accept = (size: number) => {
        extracted += size;
        if (extracted > LIMITS.maxExtractedBytes) {
          rejectReason = 'The package is too large to import.';
          return false;
        }
        return true;
      };
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
          return accept(f.originalSize);
        }
        if (/^assets\/[A-Za-z0-9_.-]+\.(png|jpe?g|webp)$/i.test(f.name)) {
          if (f.originalSize > LIMITS.maxAssetBytes) {
            rejectReason = `Asset ${f.name} is too large.`;
            return false;
          }
          return accept(f.originalSize);
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

// ---------------------------------------------------------------------------
// Multi-project backups ("Export all")
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'garden-toolkit-backup';

export interface BackupEntry {
  doc: ProjectDoc;
  assets: AssetRecord[];
}

/**
 * Builds one ZIP containing a `.gtkproject` package per project plus a
 * `backup.json` manifest. Each inner package is the normal, documented
 * project format, so a backup can also be unpacked by hand.
 */
export async function buildBackupArchive(entries: BackupEntry[], lookupPlant: (id: string) => Plant | undefined, now = new Date()): Promise<Blob> {
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  const used = new Set<string>();
  const manifest: { format: string; schemaVersion: 1; exportedAt: string; projects: { name: string; file: string; updatedAt: string }[] } = {
    format: BACKUP_FORMAT,
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    projects: [],
  };
  for (const e of entries) {
    const base = e.doc.meta.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'garden';
    let name = `${base}.gtkproject`;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}.gtkproject`;
    used.add(name);
    const pkg = await buildProjectPackage(e.doc, e.assets, lookupPlant);
    files[`projects/${name}`] = [new Uint8Array(await pkg.arrayBuffer()), { level: 0 }];
    manifest.projects.push({ name: e.doc.meta.name, file: `projects/${name}`, updatedAt: e.doc.meta.updatedAt });
  }
  files['backup.json'] = [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }];
  return new Blob([zipSync(files as Parameters<typeof zipSync>[0]) as BlobPart], { type: 'application/zip' });
}

export interface NamedImportResult {
  source: string;
  result: ImportResult;
}

/**
 * Imports any supported file: a single project (package or JSON) or a
 * multi-project backup. Never throws; returns one result per project found.
 */
export async function importAnyFile(input: Blob, name: string, knownPlant: (id: string) => boolean): Promise<NamedImportResult[]> {
  try {
    if (input.size > LIMITS.maxFileBytes) return [{ source: name, result: fail('The file is too large to import.') }];
    const head = new Uint8Array(await input.slice(0, 4).arrayBuffer());
    const isZip = head.length === 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
    if (!isZip) return [{ source: name, result: await importProjectFile(input, knownPlant) }];
    let entries = 0;
    let extracted = 0;
    let hasProjectJson = false;
    let rejectReason: string | null = null;
    const files = await unzipAsync(new Uint8Array(await input.arrayBuffer()), (f) => {
      entries++;
      if (entries > LIMITS.maxEntries) {
        rejectReason = 'The archive contains too many files.';
        return false;
      }
      if (f.name === 'project.json') hasProjectJson = true;
      // Only nested project packages are read from backups; everything else is ignored.
      if (/^projects\/[^/]+\.gtkproject$/.test(f.name)) {
        if (f.originalSize > LIMITS.maxFileBytes) {
          rejectReason = `${f.name} is too large.`;
          return false;
        }
        extracted += f.originalSize;
        if (extracted > LIMITS.maxExtractedBytes) {
          rejectReason = 'The backup is too large to import in one go. Import its projects separately.';
          return false;
        }
        return true;
      }
      return false;
    });
    if (rejectReason) return [{ source: name, result: fail(rejectReason) }];
    if (hasProjectJson) return [{ source: name, result: await importProjectFile(input, knownPlant) }];
    const inner = Object.entries(files);
    if (!inner.length) {
      return [{ source: name, result: fail('This ZIP file is not a Garden Toolkit project or backup.') }];
    }
    const out: NamedImportResult[] = [];
    for (const [path, data] of inner.sort(([a], [b]) => a.localeCompare(b))) {
      out.push({ source: path.slice('projects/'.length), result: await importProjectFile(new Blob([data as BlobPart]), knownPlant) });
    }
    return out;
  } catch (e) {
    return [{ source: name, result: fail('The file could not be read.', [e instanceof Error ? e.message : String(e)]) }];
  }
}
