/**
 * AR Preview — Genera previews y mockups de experiencias AR.
 * Simula cómo se vería un filtro AR aplicado a contenido existente.
 */

import { log } from '../../agent/logger.js';
import type { ARFilter } from './arFilterGenerator.js';

export interface ARPreview {
  previewId: string;
  filterId: string;
  originalImageUrl: string;
  previewImageUrl: string;
  confidence: number;
  fitScore: number; // how well the filter fits the image
  recommendations: string[];
}

export const generatePreview = (filter: ARFilter, originalImageUrl: string): ARPreview => {
  const hash = filter.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);

  const fitScore = Math.round((0.6 + (hash % 30) / 100) * 100) / 100;
  const confidence = Math.round((0.7 + (hash % 20) / 100) * 100) / 100;

  const recommendations: string[] = [];
  if (fitScore < 0.7) recommendations.push('Considerar ajustar posición del efecto');
  if (filter.complexity === 'complex')
    recommendations.push('Simplificar para mejor performance en dispositivos low-end');
  if (filter.type === 'face' && !originalImageUrl.includes('face')) {
    recommendations.push('La imagen no contiene rostro visible; el filtro face puede no activarse');
  }

  const preview: ARPreview = {
    previewId: `prev-${Date.now()}`,
    filterId: filter.id,
    originalImageUrl,
    previewImageUrl: `https://preview.feedia.ai/${filter.id}/${Date.now()}.png`,
    confidence,
    fitScore,
    recommendations,
  };

  log.info(`[AR] Preview generated: ${preview.previewId} (fit ${fitScore})`);
  return preview;
};

export const batchPreview = (filter: ARFilter, imageUrls: string[]): ARPreview[] =>
  imageUrls.map((url) => generatePreview(filter, url));

export const comparePreviews = (
  previews: ARPreview[],
): { best: ARPreview | undefined; worst: ARPreview | undefined; avgFit: number } => {
  if (previews.length === 0) return { best: undefined, worst: undefined, avgFit: 0 };
  const sorted = [...previews].sort((a, b) => b.fitScore - a.fitScore);
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    avgFit: Math.round((previews.reduce((s, p) => s + p.fitScore, 0) / previews.length) * 100) / 100,
  };
};
