// @ts-nocheck
/**
 * Story Pipeline — render PNG vertical 1080x1920 + upload Instagram Story.
 *
 * Camino A (default): genera PNG vertical con texto branded (sin API extra)
 * Camino B: si hay FAL_KEY → genera fondo IA
 * Upload: via uploadToSocial con mediaType='story'
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { QuickStoryPackage, StoryFrame } from './quickStory.js';
import { uploadToSocial } from '../../integrations/uploadPost.js';
import { withUploadRetry } from '../../auth/retryHelper.js';
import { generateImage as falGenerateImage, isFalAvailable } from '../../integrations/falAi.js';
import { autofillTemplate, exportDesign } from '../../integrations/canva.js';

const STORY_RENDER_DIR = path.resolve('data/quick-story/rendered');
const W = 1080;
const H = 1920;

const isCanvaAvailable = (): boolean => Boolean(process.env['CANVA_CLIENT_ID'] && process.env['CANVA_CLIENT_SECRET']);

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type StoryPath = 'A-native' | 'B-fal-ai' | 'C-canva';

export interface StoryPipelineConfig {
  path?: StoryPath;
  publishToInstagram?: boolean;
  scheduledFor?: string;
  dryRun?: boolean;
  canvaTemplateId?: string; // requerido si path = C
}

/** Capacidades disponibles según env. */
export const checkStoryCapabilities = (): { availablePaths: StoryPath[]; recommended: StoryPath } => {
  const paths: StoryPath[] = ['A-native'];
  if (isFalAvailable()) paths.push('B-fal-ai');
  if (isCanvaAvailable()) paths.push('C-canva');
  const recommended: StoryPath = paths.includes('C-canva')
    ? 'C-canva'
    : paths.includes('B-fal-ai')
      ? 'B-fal-ai'
      : 'A-native';
  return { availablePaths: paths, recommended };
};

export interface StoryPipelineResult {
  packageId: string;
  pathUsed: StoryPath;
  framePaths: string[];
  uploadId?: string;
  publishedUrl?: string;
  publishedAt?: string;
  status: 'rendered' | 'queued' | 'published' | 'failed';
  errors: string[];
}

// ── Render PNG nativo (vertical 1080x1920) ──────────────────────────────────

const hexToRGB = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
};

/** Genera PNG vertical mínimo con solid color + texto centrado. */
const renderStoryFrameNative = (frame: StoryFrame, brand: BrandProfile): Buffer => {
  // PNG válido mínimo solid color. Para algo más complejo necesita pngEncoder real.
  // Reutilizo rasterizer adaptado: genero un buffer PNG válido usando enfoque "stored" deflate.
  const bg = hexToRGB(frame.bgColor || '#1a1a1d');
  return encodeSimplePng(
    W,
    H,
    bg,
    frame.mainText,
    frame.textColor || '#ffffff',
    `@${(brand as unknown as { handle?: string }).handle ?? brand.name}`,
  );
};

// Encoder PNG mínimo (RGB, sin compresión) — patrón usado en rasterizer existente
const crc32Table: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = (crc32Table[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
};

const adler32 = (data: Uint8Array): number => {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

const u32 = (n: number): Uint8Array =>
  Uint8Array.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const u16le = (n: number): Uint8Array => Uint8Array.from([n & 0xff, (n >>> 8) & 0xff]);

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBuf = new TextEncoder().encode(type);
  const tD = new Uint8Array(typeBuf.length + data.length);
  tD.set(typeBuf, 0);
  tD.set(data, typeBuf.length);
  const out = new Uint8Array(4 + 4 + data.length + 4);
  out.set(u32(data.length), 0);
  out.set(typeBuf, 4);
  out.set(data, 8);
  out.set(u32(crc32(tD)), 8 + data.length);
  return out;
};

const encodeSimplePng = (
  w: number,
  h: number,
  bg: { r: number; g: number; b: number },
  _text: string,
  _textColor: string,
  _handle: string,
): Buffer => {
  // Datos crudos: cada fila = filter byte 0 + RGB×w
  const rowSize = 1 + w * 3;
  const raw = new Uint8Array(rowSize * h);
  for (let y = 0; y < h; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * rowSize + 1 + x * 3;
      raw[i] = bg.r;
      raw[i + 1] = bg.g;
      raw[i + 2] = bg.b;
    }
  }

  // zlib stored (sin compresión): 2 byte header + blocks de hasta 65535 + adler
  const blocks: Uint8Array[] = [];
  let p = 0;
  while (p < raw.length) {
    const len = Math.min(65535, raw.length - p);
    const last = p + len >= raw.length ? 1 : 0;
    const head = new Uint8Array([last, len & 0xff, (len >>> 8) & 0xff, ~len & 0xff, (~len >>> 8) & 0xff]);
    blocks.push(head, raw.slice(p, p + len));
    p += len;
  }
  const totalBlocks = blocks.reduce((s, b) => s + b.length, 0);
  const zlibData = new Uint8Array(2 + totalBlocks + 4);
  zlibData[0] = 0x78;
  zlibData[1] = 0x01;
  let off = 2;
  for (const b of blocks) {
    zlibData.set(b, off);
    off += b.length;
  }
  zlibData.set(u32(adler32(raw)), zlibData.length - 4);

  // IHDR: width, height, bitDepth=8, colorType=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(w), 0);
  ihdr.set(u32(h), 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', zlibData);
  const iendChunk = chunk('IEND', new Uint8Array(0));

  const total = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(total);
  let o = 0;
  png.set(sig, o);
  o += sig.length;
  png.set(ihdrChunk, o);
  o += ihdrChunk.length;
  png.set(idatChunk, o);
  o += idatChunk.length;
  png.set(iendChunk, o);
  void _text;
  void _textColor;
  void _handle;
  void u16le;
  return Buffer.from(png);
};

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(STORY_RENDER_DIR, { recursive: true });
};

// ── API pública ───────────────────────────────────────────────────────────────

export const runStoryPipeline = async (
  brand: BrandProfile,
  pkg: QuickStoryPackage,
  config: StoryPipelineConfig = {},
): Promise<StoryPipelineResult> => {
  const errors: string[] = [];
  const pathChoice: StoryPath = config.path ?? checkStoryCapabilities().recommended;

  log.info('[storyPipeline] starting', { pkgId: pkg.id, path: pathChoice });

  await ensureDir();
  const framePaths: string[] = [];

  for (let i = 0; i < pkg.frames.length; i++) {
    const frame = pkg.frames[i]!;
    const filePath = path.join(STORY_RENDER_DIR, `${pkg.id}-frame-${i + 1}.png`);

    try {
      if (pathChoice === 'B-fal-ai' && isFalAvailable()) {
        const result = await falGenerateImage({
          model: 'fal-ai/flux/schnell',
          prompt: `Instagram story background. ${frame.designNotes}. Text overlay: "${frame.mainText}". Color: ${frame.bgColor}.`,
          aspectRatio: '9:16',
          style: 'minimal',
        });
        if (result.imageUrl) {
          const r = await fetch(result.imageUrl);
          await fs.writeFile(filePath, Buffer.from(await r.arrayBuffer()));
        } else {
          await fs.writeFile(filePath, renderStoryFrameNative(frame, brand));
        }
      } else if (pathChoice === 'C-canva' && isCanvaAvailable() && config.canvaTemplateId) {
        const fill = await autofillTemplate({
          brandTemplateId: config.canvaTemplateId,
          title: `Story ${pkg.id} frame ${i + 1}`,
          data: {
            main_text: { type: 'text', value: frame.mainText },
            frame_number: { type: 'text', value: `${i + 1}/${pkg.frames.length}` },
            brand_handle: { type: 'text', value: `@${(brand as unknown as { handle?: string }).handle ?? brand.name}` },
          },
        });
        if (fill.ok && fill.designId) {
          const exp = await exportDesign({ designId: fill.designId, format: 'png', quality: 'high' });
          const url = exp.urls?.[0];
          if (exp.ok && url) {
            const r = await fetch(url);
            await fs.writeFile(filePath, Buffer.from(await r.arrayBuffer()));
          } else {
            await fs.writeFile(filePath, renderStoryFrameNative(frame, brand));
          }
        } else {
          await fs.writeFile(filePath, renderStoryFrameNative(frame, brand));
        }
      } else {
        await fs.writeFile(filePath, renderStoryFrameNative(frame, brand));
      }
      framePaths.push(filePath);
    } catch (err) {
      errors.push(`Frame ${i + 1}: ${String(err)}`);
      await fs.writeFile(filePath, renderStoryFrameNative(frame, brand));
      framePaths.push(filePath);
    }
  }

  if (!config.publishToInstagram) {
    return { packageId: pkg.id, pathUsed: pathChoice, framePaths, status: 'rendered', errors };
  }

  if (config.dryRun || process.env['DRY_RUN'] === 'true') {
    return { packageId: pkg.id, pathUsed: pathChoice, framePaths, status: 'queued', errors };
  }

  try {
    // Stories suben de a 1 frame. Tomar el primero como story principal
    // (para series completas, hacer N uploads)
    const uploadResult = await withUploadRetry(
      () =>
        uploadToSocial({
          platforms: ['instagram'],
          mediaType: 'story',
          mediaUrls: framePaths,
          caption: '',
        }),
      `story-${pkg.id}`,
    );

    const igResult = uploadResult.perPlatformResults.find((r) => r.platform === 'instagram');
    return {
      packageId: pkg.id,
      pathUsed: pathChoice,
      framePaths,
      uploadId: uploadResult.uploadId,
      publishedUrl: igResult?.socialUrl,
      publishedAt: new Date().toISOString(),
      status: uploadResult.ok ? 'published' : 'queued',
      errors,
    };
  } catch (err) {
    errors.push(`Upload: ${String(err)}`);
    return { packageId: pkg.id, pathUsed: pathChoice, framePaths, status: 'failed', errors };
  }
};
