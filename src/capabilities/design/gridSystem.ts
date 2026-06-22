/**
 * Grid System — define grids, safe zones y márgenes por formato y plataforma.
 *
 * Usado por visualQA y canvaDesignReviewer para validar que el diseño
 * exportado respete reglas profesionales de diseño.
 */

import { z } from 'zod';

export const FormatSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.enum(['instagram', 'tiktok', 'linkedin', 'generic']),
  format: z.enum(['carrusel', 'reel', 'story', 'post', 'cover']),
  width: z.number(),
  height: z.number(),
  safeZone: z.object({
    top: z.number(),
    bottom: z.number(),
    left: z.number(),
    right: z.number(),
  }),
  margins: z.object({
    min: z.number(),
    recommended: z.number(),
  }),
  grid: z.object({
    columns: z.number(),
    baseline: z.number(),
  }),
  typography: z.object({
    minHeadlineRatio: z.number(),
    maxFonts: z.number(),
    minBodySize: z.number(),
  }),
  composition: z.object({
    maxTextAreaPct: z.number(),
    minWhitespacePct: z.number(),
  }),
});

export type FormatSpec = z.infer<typeof FormatSpecSchema>;

export const FORMAT_SPECS: Record<string, FormatSpec> = {
  'ig-carousel': {
    id: 'ig-carousel',
    name: 'Instagram Carrusel',
    platform: 'instagram',
    format: 'carrusel',
    width: 1080,
    height: 1350,
    safeZone: { top: 80, bottom: 80, left: 80, right: 80 },
    margins: { min: 60, recommended: 100 },
    grid: { columns: 12, baseline: 24 },
    typography: { minHeadlineRatio: 1.6, maxFonts: 2, minBodySize: 24 },
    composition: { maxTextAreaPct: 45, minWhitespacePct: 20 },
  },
  'ig-reel': {
    id: 'ig-reel',
    name: 'Instagram Reel Cover',
    platform: 'instagram',
    format: 'reel',
    width: 1080,
    height: 1920,
    safeZone: { top: 250, bottom: 350, left: 80, right: 80 },
    margins: { min: 60, recommended: 100 },
    grid: { columns: 6, baseline: 32 },
    typography: { minHeadlineRatio: 2.0, maxFonts: 2, minBodySize: 32 },
    composition: { maxTextAreaPct: 35, minWhitespacePct: 25 },
  },
  'ig-story': {
    id: 'ig-story',
    name: 'Instagram Story',
    platform: 'instagram',
    format: 'story',
    width: 1080,
    height: 1920,
    safeZone: { top: 250, bottom: 350, left: 80, right: 80 },
    margins: { min: 60, recommended: 100 },
    grid: { columns: 6, baseline: 32 },
    typography: { minHeadlineRatio: 1.6, maxFonts: 2, minBodySize: 28 },
    composition: { maxTextAreaPct: 40, minWhitespacePct: 25 },
  },
  'tiktok-video': {
    id: 'tiktok-video',
    name: 'TikTok Video Cover',
    platform: 'tiktok',
    format: 'reel',
    width: 1080,
    height: 1920,
    safeZone: { top: 250, bottom: 350, left: 80, right: 80 },
    margins: { min: 60, recommended: 100 },
    grid: { columns: 6, baseline: 32 },
    typography: { minHeadlineRatio: 2.0, maxFonts: 2, minBodySize: 32 },
    composition: { maxTextAreaPct: 35, minWhitespacePct: 25 },
  },
};

export const getFormatSpec = (formatKey: string): FormatSpec | undefined => FORMAT_SPECS[formatKey];

export const getFormatSpecForContent = (
  platform: 'instagram' | 'tiktok',
  format: 'carrusel' | 'reel' | 'story' | 'post',
): FormatSpec | undefined => {
  const key = `${platform === 'instagram' ? 'ig' : 'tiktok'}-${format === 'post' ? 'carousel' : format}`;
  return FORMAT_SPECS[key];
};

export const isTextInSafeZone = (
  spec: FormatSpec,
  textBox: { x: number; y: number; width: number; height: number },
): boolean => {
  const { safeZone, width, height } = spec;
  const minX = safeZone.left;
  const maxX = width - safeZone.right;
  const minY = safeZone.top;
  const maxY = height - safeZone.bottom;

  return (
    textBox.x >= minX && textBox.x + textBox.width <= maxX && textBox.y >= minY && textBox.y + textBox.height <= maxY
  );
};

export const hasMinimumMargins = (
  spec: FormatSpec,
  textBox: { x: number; y: number; width: number; height: number },
): boolean => {
  const { margins, width, height } = spec;
  return (
    textBox.x >= margins.min &&
    width - (textBox.x + textBox.width) >= margins.min &&
    textBox.y >= margins.min &&
    height - (textBox.y + textBox.height) >= margins.min
  );
};
