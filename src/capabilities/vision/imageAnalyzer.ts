/**
 * Image Analyzer — Análisis general de imágenes para contenido social.
 * Detecta formato, dimensiones, calidad, y genera insights visuales.
 */

import { log } from '../../agent/logger.js';

export interface ImageAnalysis {
  format: string;
  estimatedDimensions: { width: number; height: number };
  aspectRatio: string;
  qualityScore: number; // 0-1
  brightness: number;
  contrast: number;
  dominantColors: string[];
  hasText: boolean;
  hasFace: boolean;
  hasProduct: boolean;
  composition: 'centered' | 'rule_of_thirds' | 'dynamic' | 'minimal';
  recommendedPlatform: 'instagram' | 'tiktok' | 'stories' | 'carousel';
}

const detectAspectRatio = (w: number, h: number): string => {
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 0.8) < 0.1) return '4:5';
  if (Math.abs(ratio - 0.5625) < 0.05) return '9:16';
  if (Math.abs(ratio - 1.91) < 0.1) return '1.91:1';
  return `${w}:${h}`;
};

const recommendPlatform = (ratio: string, hasText: boolean): ImageAnalysis['recommendedPlatform'] => {
  if (ratio === '9:16') return 'tiktok';
  if (ratio === '1:1') return 'instagram';
  if (ratio === '4:5' && hasText) return 'carousel';
  return 'stories';
};

export const analyzeImage = (imageUrl: string, opts?: { width?: number; height?: number }): ImageAnalysis => {
  // Mock analysis based on URL hash for determinism
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const w = opts?.width ?? 1080;
  const h = opts?.height ?? 1080;
  const ratio = detectAspectRatio(w, h);

  const analysis: ImageAnalysis = {
    format: imageUrl.endsWith('.png') ? 'png' : imageUrl.endsWith('.webp') ? 'webp' : 'jpg',
    estimatedDimensions: { width: w, height: h },
    aspectRatio: ratio,
    qualityScore: Math.round((((hash % 30) + 70) / 100) * 100) / 100,
    brightness: Math.round((((hash % 40) + 40) / 100) * 100) / 100,
    contrast: Math.round((((hash % 35) + 50) / 100) * 100) / 100,
    dominantColors: ['#FF6B6B', '#4ECDC4', '#45B7D1'].slice(0, (hash % 3) + 1),
    hasText: hash % 2 === 0,
    hasFace: hash % 3 === 0,
    hasProduct: hash % 5 === 0,
    composition: ['centered', 'rule_of_thirds', 'dynamic', 'minimal'][hash % 4] as ImageAnalysis['composition'],
    recommendedPlatform: recommendPlatform(ratio, hash % 2 === 0),
  };

  log.info(`[Vision] Analyzed ${imageUrl.slice(0, 40)}... → ${analysis.aspectRatio}, quality ${analysis.qualityScore}`);
  return analysis;
};

export const batchAnalyzeImages = (urls: string[]): ImageAnalysis[] => urls.map((url) => analyzeImage(url));
