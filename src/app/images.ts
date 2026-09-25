/**
 * Blueprint image import. Raster images are validated by magic bytes and
 * stored as Blobs. Very large images are downscaled to stay within browser
 * canvas/texture limits. PDFs are rendered (first page) to PNG with pdf.js,
 * loaded lazily only when a PDF is imported.
 */
import { detectImageMime, type ImageMime } from '../persistence/projectPackage';

export const MAX_IMAGE_SIDE = 8192;
export const MAX_IMPORT_BYTES = 80 * 1024 * 1024;

export interface PreparedImage {
  blob: Blob;
  mimeType: ImageMime;
  width: number;
  height: number;
  name: string;
  note: string | null;
}

async function decodeSize(blob: Blob): Promise<{ width: number; height: number; bitmap: ImageBitmap | null }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return { width: bitmap.width, height: bitmap.height, bitmap };
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight, bitmap: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))), type, quality));
}

async function downscale(bitmap: ImageBitmap, mime: ImageMime): Promise<{ blob: Blob; width: number; height: number; mime: ImageMime }> {
  const k = MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * k);
  const h = Math.round(bitmap.height * k);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const outMime: ImageMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
  return { blob: await canvasToBlob(canvas, outMime, 0.9), width: w, height: h, mime: outMime };
}

async function renderPdfFirstPage(file: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  // Scripting is disabled by default in pdf.js; the PDF is only rasterised.
  const task = pdfjs.getDocument({ data });
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, 4000 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const blob = await canvasToBlob(canvas, 'image/png');
  await task.destroy();
  return blob;
}

export async function prepareBlueprint(file: File): Promise<PreparedImage> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('The file is too large (limit 80 MB).');
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  let blob: Blob = file;
  let note: string | null = null;
  if (isPdf) {
    blob = await renderPdfFirstPage(file);
    note = 'The first page of the PDF was converted to an image.';
  }
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) throw new Error('Unsupported file. Use a PNG, JPEG or WebP image, or a PDF.');
  const { width, height, bitmap } = await decodeSize(blob);
  if (bitmap && Math.max(width, height) > MAX_IMAGE_SIDE) {
    const d = await downscale(bitmap, mime);
    bitmap.close();
    return {
      blob: d.blob,
      mimeType: d.mime,
      width: d.width,
      height: d.height,
      name: file.name,
      note: `The image was reduced from ${width}×${height} to ${d.width}×${d.height} px to stay within browser limits.`,
    };
  }
  bitmap?.close();
  return { blob: blob.type === mime ? blob : new Blob([blob], { type: mime }), mimeType: mime, width, height, name: file.name, note };
}
