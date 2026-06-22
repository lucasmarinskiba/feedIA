// @ts-nocheck
/**
 * Feed Aesthetic Planner — Reemplaza al curador estético de Instagram.
 *
 * Planifica grid del feed con coherencia visual:
 *   - Distribución de colores (no 3 fotos rojas seguidas)
 *   - Alternancia de formatos visuales
 *   - Patrones (cuadrícula, líneas, ajedrez, gradiente)
 *   - Previsualización del próximo grid 3x3
 *   - Score de coherencia estética
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const FEED_DIR = path.resolve('data/feed-aesthetic');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FeedPattern =
  | 'checkerboard' // ajedrez (alternancia)
  | 'rows' // filas con un tema cada una
  | 'columns' // columnas (1ra: quotes, 2da: producto, 3ra: lifestyle)
  | 'puzzle' // imágenes que se conectan formando un mural
  | 'rainbow' // gradiente de color
  | 'border' // borde visual común
  | 'centerline' // línea central destacada
  | 'organic'; // sin patrón rígido pero coherente

export interface FeedSlot {
  position: number; // 0 = más reciente (top-left), 8 = bottom-right (en grid 3x3)
  postId?: string;
  format: 'foto' | 'carrusel' | 'reel' | 'video';
  dominantColors: string[]; // 2-3 hex codes
  visualWeight: 'light' | 'medium' | 'heavy';
  contentType: 'producto' | 'lifestyle' | 'quote' | 'tutorial' | 'face' | 'flat-lay' | 'abstract';
  caption?: string;
  scheduledFor?: string;
}

export interface FeedGrid {
  brandId: string;
  pattern: FeedPattern;
  slots: FeedSlot[]; // últimas 9 publicaciones (próximo grid 3x3)
  coherenceScore: number; // 0-100
  colorBalance: Record<string, number>; // % por color dominante
  formatBalance: Record<string, number>;
  warnings: string[]; // alertas estéticas
  recommendations: string[];
  updatedAt: string;
}

export interface NextPostSuggestion {
  optimalFormat: FeedSlot['format'];
  optimalContentType: FeedSlot['contentType'];
  optimalColorPalette: string[];
  visualWeight: FeedSlot['visualWeight'];
  rationale: string; // por qué esta sugerencia mantiene la coherencia
  alternativeOptions: Array<{ format: FeedSlot['format']; contentType: FeedSlot['contentType']; reason: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureFeedDir = async (): Promise<void> => {
  await fs.mkdir(FEED_DIR, { recursive: true });
};

const feedPath = (brandId: string): string => path.join(FEED_DIR, `${brandId}-grid.json`);

// ── Cálculo de coherencia ────────────────────────────────────────────────────

const calculateColorBalance = (slots: FeedSlot[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  const total = slots.length * 2; // 2 colores dominantes promedio
  for (const slot of slots) {
    for (const color of slot.dominantColors) {
      counts[color] = (counts[color] ?? 0) + 1;
    }
  }
  const balance: Record<string, number> = {};
  for (const [color, count] of Object.entries(counts)) {
    balance[color] = (count / total) * 100;
  }
  return balance;
};

const calculateFormatBalance = (slots: FeedSlot[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const slot of slots) {
    counts[slot.format] = (counts[slot.format] ?? 0) + 1;
  }
  const balance: Record<string, number> = {};
  for (const [format, count] of Object.entries(counts)) {
    balance[format] = (count / slots.length) * 100;
  }
  return balance;
};

const calculateCoherenceScore = (slots: FeedSlot[]): number => {
  if (slots.length < 3) return 50;

  // Penalizar 3+ posts seguidos del mismo color dominante
  let penalty = 0;
  for (let i = 0; i < slots.length - 2; i++) {
    const c1 = slots[i]?.dominantColors[0];
    const c2 = slots[i + 1]?.dominantColors[0];
    const c3 = slots[i + 2]?.dominantColors[0];
    if (c1 && c1 === c2 && c2 === c3) penalty += 10;
  }

  // Penalizar 3+ del mismo formato seguidos
  for (let i = 0; i < slots.length - 2; i++) {
    if (slots[i]?.format === slots[i + 1]?.format && slots[i + 1]?.format === slots[i + 2]?.format) {
      penalty += 5;
    }
  }

  // Penalizar peso visual desbalanceado
  const heavyCount = slots.filter((s) => s.visualWeight === 'heavy').length;
  if (heavyCount > slots.length * 0.5) penalty += 8;

  // Penalizar falta de variedad en contentType
  const types = new Set(slots.map((s) => s.contentType));
  if (types.size < 3) penalty += 10;

  return Math.max(0, 100 - penalty);
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Construye/actualiza el grid del feed con las últimas 9 publicaciones. */
export const analyzeFeedGrid = async (
  brand: BrandProfile,
  slots: FeedSlot[],
  pattern: FeedPattern = 'organic',
): Promise<FeedGrid> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const last9 = slots.slice(-9);

  const colorBalance = calculateColorBalance(last9);
  const formatBalance = calculateFormatBalance(last9);
  const coherenceScore = calculateCoherenceScore(last9);

  // Warnings automáticos
  const warnings: string[] = [];
  for (let i = 0; i < last9.length - 2; i++) {
    const c1 = last9[i]?.dominantColors[0];
    const c2 = last9[i + 1]?.dominantColors[0];
    const c3 = last9[i + 2]?.dominantColors[0];
    if (c1 && c1 === c2 && c2 === c3) {
      warnings.push(`3 publicaciones seguidas con color ${c1} (posiciones ${i}-${i + 2})`);
    }
  }

  const heavyCount = last9.filter((s) => s.visualWeight === 'heavy').length;
  if (heavyCount > 5) warnings.push(`Demasiados posts con peso visual pesado (${heavyCount}/9)`);

  // Recomendaciones con Claude
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Analiza el grid de Instagram de ${brand.name}:

Patrón objetivo: ${pattern}
Score coherencia actual: ${coherenceScore}/100
Balance de colores: ${JSON.stringify(colorBalance)}
Balance de formatos: ${JSON.stringify(formatBalance)}
Warnings: ${warnings.join('; ') || 'ninguno'}

Últimas 9 publicaciones:
${last9.map((s, i) => `${i}. ${s.format} | ${s.contentType} | colores: ${s.dominantColors.join(', ')} | peso: ${s.visualWeight}`).join('\n')}

Genera 5 recomendaciones específicas y accionables para mejorar la coherencia del grid.
JSON: { "recommendations": ["rec1", "rec2", ...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const recommendations = jsonMatch ? (JSON.parse(jsonMatch[0]) as { recommendations: string[] }).recommendations : [];

  const grid: FeedGrid = {
    brandId,
    pattern,
    slots: last9,
    coherenceScore,
    colorBalance,
    formatBalance,
    warnings,
    recommendations,
    updatedAt: new Date().toISOString(),
  };

  await ensureFeedDir();
  await fs.writeFile(feedPath(brandId), JSON.stringify(grid, null, 2), 'utf-8');
  return grid;
};

/** Sugiere qué tipo de publicación va próximo para mantener coherencia. */
export const suggestNextPost = async (brand: BrandProfile, currentGrid: FeedGrid): Promise<NextPostSuggestion> => {
  const log_ = log;
  log_.info('[feedAesthetic] suggesting next post', { brand: brand.name, currentScore: currentGrid.coherenceScore });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1200,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Sugiere la PRÓXIMA publicación para el feed de ${brand.name}.

Patrón del grid: ${currentGrid.pattern}
Score coherencia actual: ${currentGrid.coherenceScore}/100

Últimas 3 publicaciones (más recientes):
${currentGrid.slots
  .slice(-3)
  .map((s, i) => `${i + 1}. ${s.format} | ${s.contentType} | colores: ${s.dominantColors.join(', ')}`)
  .join('\n')}

Balance actual: ${JSON.stringify(currentGrid.colorBalance)}

¿Qué publicación maximiza la coherencia del grid?

JSON:
{
  "optimalFormat": "foto|carrusel|reel|video",
  "optimalContentType": "producto|lifestyle|quote|tutorial|face|flat-lay|abstract",
  "optimalColorPalette": ["#XXXXXX", "#XXXXXX"],
  "visualWeight": "light|medium|heavy",
  "rationale": "por qué esta sugerencia mantiene el balance",
  "alternativeOptions": [
    { "format": "", "contentType": "", "reason": "" }
  ]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      optimalFormat: 'carrusel',
      optimalContentType: 'producto',
      optimalColorPalette: ['#FFFFFF'],
      visualWeight: 'medium',
      rationale: 'Sugerencia por defecto',
      alternativeOptions: [],
    };
  }
  return JSON.parse(jsonMatch[0]) as NextPostSuggestion;
};

/** Carga grid actual. */
export const getCurrentGrid = async (brandId: string): Promise<FeedGrid | null> => {
  try {
    return JSON.parse(await fs.readFile(feedPath(brandId), 'utf-8')) as FeedGrid;
  } catch {
    return null;
  }
};

/** Renderiza el grid como ASCII para preview rápido. */
export const renderGridASCII = (grid: FeedGrid): string => {
  const symbols: Record<string, string> = {
    foto: '📷',
    carrusel: '🖼️',
    reel: '🎬',
    video: '📹',
  };
  const rows: string[] = [];
  for (let r = 0; r < 3; r++) {
    const row: string[] = [];
    for (let c = 0; c < 3; c++) {
      const slot = grid.slots[r * 3 + c];
      row.push(slot ? `[${symbols[slot.format] ?? '?'}]` : '[ ]');
    }
    rows.push(row.join(' '));
  }
  return `Feed Grid 3x3 (coherencia: ${grid.coherenceScore}/100)\n${rows.join('\n')}`;
};
