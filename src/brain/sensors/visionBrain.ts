/**
 * Vision Brain — Análisis visual inteligente
 * Aunque no hay modelo de visión, analiza metadatos, descripciones,
 * engagement patterns visuales, y aprende qué estilos funcionan.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as causal from '../reasoning/causalEngine.js';

const VISION_PATH = resolve('data/runtime/brain/vision-brain.json');

export interface VisualPattern {
  id: string;
  description: string;
  dominantColor: string;
  colorPalette: string[];
  composition: 'portrait' | 'landscape' | 'square' | 'carousel';
  style: 'minimal' | 'busy' | 'text-heavy' | 'lifestyle' | 'product' | 'candid';
  textOverlay: boolean;
  faceVisible: boolean;
  engagement: number;
  saves: number;
  shares: number;
  niche: string;
  format: string;
  createdAt: string;
}

interface VisionStore {
  patterns: VisualPattern[];
  colorPerformance: Record<string, number>;
  stylePerformance: Record<string, number>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): VisionStore => {
  try {
    ensureDir();
    if (!existsSync(VISION_PATH)) return { patterns: [], colorPerformance: {}, stylePerformance: {} };
    return JSON.parse(readFileSync(VISION_PATH, 'utf-8')) as VisionStore;
  } catch {
    return { patterns: [], colorPerformance: {}, stylePerformance: {} };
  }
};

const saveStore = (store: VisionStore): void => {
  ensureDir();
  writeFileSync(VISION_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Record visual pattern ──────────────────────────────────────────────────

export const recordVisualPattern = async (
  description: string,
  metadata: {
    dominantColor: string;
    colorPalette: string[];
    composition: VisualPattern['composition'];
    style: VisualPattern['style'];
    textOverlay: boolean;
    faceVisible: boolean;
    format: string;
    niche: string;
  },
  performance: { engagement: number; saves: number; shares: number },
): Promise<VisualPattern> => {
  const store = loadStore();

  const pattern: VisualPattern = {
    id: `vis-${Date.now()}`,
    description: description.slice(0, 200),
    ...metadata,
    ...performance,
    createdAt: new Date().toISOString(),
  };

  store.patterns.push(pattern);
  if (store.patterns.length > 500) store.patterns = store.patterns.slice(-500);

  // Update color performance
  for (const color of metadata.colorPalette) {
    const current = store.colorPerformance[color] ?? 0;
    store.colorPerformance[color] = current * 0.9 + performance.engagement * 0.1;
  }

  // Update style performance
  const currentStyle = store.stylePerformance[metadata.style] ?? 0;
  store.stylePerformance[metadata.style] = currentStyle * 0.9 + performance.engagement * 0.1;

  saveStore(store);

  await semantic.storeMemory(
    `Visual: ${metadata.style} + ${metadata.composition} → engagement ${performance.engagement}`,
    'post',
    { style: metadata.style, composition: metadata.composition, niche: metadata.niche },
    Math.min(1, performance.engagement / 10000),
  );

  causal.inferCause({
    action: `visual style: ${metadata.style}`,
    outcome: `engagement ${performance.engagement}`,
    before: 100,
    after: performance.engagement,
    context: `composition=${metadata.composition}, colors=${metadata.colorPalette.join(',')}`,
    niche: metadata.niche,
  });

  log.info(`[VisionBrain] Recorded ${metadata.style} pattern: engagement=${performance.engagement}`);
  return pattern;
};

// ─- Get visual recommendations ─────────────────────────────────────────────

export const getVisualRecommendations = (
  niche: string,
): {
  bestColors: string[];
  bestStyles: string[];
  bestComposition: string;
  tips: string[];
} => {
  const store = loadStore();
  const nichePatterns = store.patterns.filter((p) => p.niche === niche);

  if (nichePatterns.length === 0) {
    return {
      bestColors: ['#E1306C', '#F77737', '#833AB4'],
      bestStyles: ['lifestyle', 'minimal'],
      bestComposition: 'square',
      tips: ['Probar A/B de estilos visuales', 'Mantener paleta consistente'],
    };
  }

  const byColor = new Map<string, number[]>();
  const byStyle = new Map<string, number[]>();
  const byComposition = new Map<string, number[]>();

  for (const p of nichePatterns) {
    for (const c of p.colorPalette) {
      const arr = byColor.get(c) ?? [];
      arr.push(p.engagement);
      byColor.set(c, arr);
    }
    const sArr = byStyle.get(p.style) ?? [];
    sArr.push(p.engagement);
    byStyle.set(p.style, sArr);
    const cArr = byComposition.get(p.composition) ?? [];
    cArr.push(p.engagement);
    byComposition.set(p.composition, cArr);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const bestColors = Array.from(byColor.entries())
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .slice(0, 3)
    .map(([c]) => c);

  const bestStyles = Array.from(byStyle.entries())
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .slice(0, 3)
    .map(([s]) => s);

  const bestComposition = Array.from(byComposition.entries()).sort((a, b) => avg(b[1]) - avg(a[1]))[0]?.[0] ?? 'square';

  const tips: string[] = [];
  if (
    nichePatterns.filter((p) => p.faceVisible).reduce((s, p) => s + p.engagement, 0) /
      (nichePatterns.filter((p) => p.faceVisible).length || 1) >
    nichePatterns.filter((p) => !p.faceVisible).reduce((s, p) => s + p.engagement, 0) /
      (nichePatterns.filter((p) => !p.faceVisible).length || 1)
  ) {
    tips.push('Incluir rostro en contenido aumenta engagement');
  }
  if (nichePatterns.some((p) => p.textOverlay && p.engagement > 3000)) {
    tips.push('Text overlay funciona bien en este nicho');
  }

  return { bestColors, bestStyles, bestComposition, tips };
};

export const getStats = (): { patterns: number; colors: number; styles: number } => {
  const store = loadStore();
  return {
    patterns: store.patterns.length,
    colors: Object.keys(store.colorPerformance).length,
    styles: Object.keys(store.stylePerformance).length,
  };
};
