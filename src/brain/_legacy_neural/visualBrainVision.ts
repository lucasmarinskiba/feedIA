// @ts-nocheck
// @ts-nocheck
/**
 * Visual Brain Vision — análisis profundo de imágenes IG.
 *
 * Identifica:
 *   - Composition (regla tercios, simetría, leading lines)
 *   - Color theory (paleta dominante, contrast, mood)
 *   - Focal point primario + secundarios
 *   - Emotion evocada
 *   - Visual hooks (qué hace stop-scroll)
 *   - Anti-patterns (qué arruina la foto)
 *
 * Usa Claude vision (multimodal) para parse de imágenes reales.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const VISION_DIR = path.resolve('data/neural/vision');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CompositionRule =
  | 'rule-of-thirds'
  | 'centered'
  | 'asymmetric'
  | 'leading-lines'
  | 'framing'
  | 'symmetry'
  | 'pattern-break'
  | 'negative-space';

export type ColorMood =
  | 'warm'
  | 'cool'
  | 'monochromatic'
  | 'high-contrast'
  | 'low-contrast'
  | 'pastel'
  | 'vivid'
  | 'muted'
  | 'dark'
  | 'bright';

export interface VisualAnalysis {
  imageUrl?: string;
  imageId: string;
  generatedAt: string;
  composition: {
    primaryRule: CompositionRule;
    secondaryRules: CompositionRule[];
    focalPoint: { x: number; y: number; description: string }; // 0-1 coordinates
    visualBalance: 'balanced' | 'left-heavy' | 'right-heavy' | 'top-heavy' | 'bottom-heavy';
    leadingLinesDetected: boolean;
    ruleOfThirdsScore: number;
  };
  color: {
    dominantColors: Array<{ hex: string; percentage: number; emotion: string }>;
    paletteHarmony: 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'split-complementary';
    mood: ColorMood;
    contrastScore: number; // 0-1
    saturationLevel: 'low' | 'medium' | 'high';
    brightnessLevel: 'dark' | 'mid' | 'bright';
  };
  subject: {
    primarySubject: string; // "person", "product", "landscape", "food", "text"
    secondarySubjects: string[];
    facesDetected: number;
    productsDetected: number;
    textDetected: boolean;
    textOverlay?: { content: string; readability: number };
  };
  emotion: {
    primaryEmotion: string;
    arousal: number; // 0-1 (calm vs intense)
    valence: number; // -1 to 1 (negative vs positive)
    evocations: string[]; // emociones secundarias
  };
  scrollStopFactors: {
    stopProbability: number; // 0-1
    reasons: string[]; // qué hace stop
    weakSpots: string[]; // qué no funciona
  };
  igBestPractices: {
    aspectRatioOK: boolean;
    textRatio: number; // % of image with text (<20% better for ads)
    facesInFocus: boolean;
    centerHeavy: boolean;
    brandConsistency: number; // 0-1 vs brand identity
  };
  suggestions: string[];
}

// ── Análisis de imagen ───────────────────────────────────────────────────────

export const analyzeImage = async (input: {
  imageUrl?: string;
  imageBase64?: string;
  imageId: string;
  mediaType?: 'image/jpeg' | 'image/png';
}): Promise<VisualAnalysis> => {
  log.info('[visualBrainVision] analyzing image', { imageId: input.imageId });

  if (!input.imageUrl && !input.imageBase64) {
    throw new Error('[visualBrainVision] imageUrl o imageBase64 requerido');
  }

  const imageContent = input.imageBase64
    ? {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: input.mediaType ?? 'image/jpeg', data: input.imageBase64 },
      }
    : { type: 'image' as const, source: { type: 'url' as const, url: input.imageUrl! } };

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Crítico visual senior con expertise en fotografía, design y Instagram.
Analizás imágenes con precisión técnica: composition, color theory, focal points, emotion.
Sos específico. JSON puro.`,
    messages: [
      {
        role: 'user',
        content: [
          imageContent,
          {
            type: 'text',
            text: `Analizá esta imagen como un post de Instagram. Devolvé análisis completo:

JSON: {
  "composition": {
    "primaryRule": "rule-of-thirds|centered|asymmetric|leading-lines|framing|symmetry|pattern-break|negative-space",
    "secondaryRules": [],
    "focalPoint": { "x": 0-1, "y": 0-1, "description": "qué hay ahí" },
    "visualBalance": "balanced|left-heavy|right-heavy|top-heavy|bottom-heavy",
    "leadingLinesDetected": boolean,
    "ruleOfThirdsScore": 0-1
  },
  "color": {
    "dominantColors": [{ "hex": "#XXXXXX", "percentage": 0-100, "emotion": "qué transmite" }],
    "paletteHarmony": "complementary|analogous|triadic|monochromatic|split-complementary",
    "mood": "warm|cool|monochromatic|high-contrast|low-contrast|pastel|vivid|muted|dark|bright",
    "contrastScore": 0-1,
    "saturationLevel": "low|medium|high",
    "brightnessLevel": "dark|mid|bright"
  },
  "subject": {
    "primarySubject": "person|product|landscape|food|text|object|abstract",
    "secondarySubjects": [],
    "facesDetected": número,
    "productsDetected": número,
    "textDetected": boolean,
    "textOverlay": { "content": "texto leído", "readability": 0-1 }
  },
  "emotion": {
    "primaryEmotion": "alegria|sorpresa|tristeza|calma|admiracion|...",
    "arousal": 0-1,
    "valence": -1 a 1,
    "evocations": []
  },
  "scrollStopFactors": {
    "stopProbability": 0-1,
    "reasons": ["por qué frena scroll"],
    "weakSpots": ["qué no funciona"]
  },
  "igBestPractices": {
    "aspectRatioOK": boolean,
    "textRatio": 0-1,
    "facesInFocus": boolean,
    "centerHeavy": boolean,
    "brandConsistency": 0-1
  },
  "suggestions": ["mejoras concretas"]
}`,
          },
        ],
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[visualBrainVision] No analysis');

  const generated = JSON.parse(jsonMatch[0]) as Partial<VisualAnalysis>;
  const analysis: VisualAnalysis = {
    imageUrl: input.imageUrl,
    imageId: input.imageId,
    generatedAt: new Date().toISOString(),
    composition: generated.composition ?? ({} as VisualAnalysis['composition']),
    color: generated.color ?? ({} as VisualAnalysis['color']),
    subject: generated.subject ?? ({} as VisualAnalysis['subject']),
    emotion: generated.emotion ?? ({} as VisualAnalysis['emotion']),
    scrollStopFactors: generated.scrollStopFactors ?? { stopProbability: 0.5, reasons: [], weakSpots: [] },
    igBestPractices: generated.igBestPractices ?? ({} as VisualAnalysis['igBestPractices']),
    suggestions: generated.suggestions ?? [],
  };

  await fs.mkdir(VISION_DIR, { recursive: true });
  await fs.writeFile(path.join(VISION_DIR, `${input.imageId}.json`), JSON.stringify(analysis, null, 2), 'utf-8');
  log.info('[visualBrainVision] analyzed', {
    imageId: input.imageId,
    stopProb: analysis.scrollStopFactors.stopProbability.toFixed(2),
  });
  return analysis;
};

/** Compara múltiples imágenes y rankea por scroll-stop potential. */
export const rankImagesByStopPotential = async (
  images: Array<{ imageUrl?: string; imageBase64?: string; imageId: string; mediaType?: 'image/jpeg' | 'image/png' }>,
): Promise<Array<{ imageId: string; rank: number; stopProbability: number; analysis: VisualAnalysis }>> => {
  const analyses = await Promise.all(images.map((img) => analyzeImage(img)));
  return analyses
    .map((a) => ({ imageId: a.imageId, stopProbability: a.scrollStopFactors.stopProbability, analysis: a }))
    .sort((a, b) => b.stopProbability - a.stopProbability)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
};

/** Sugerencias accionables para mejorar imagen. */
export const getVisualSuggestions = async (imageId: string): Promise<string[]> => {
  try {
    const analysis = JSON.parse(await fs.readFile(path.join(VISION_DIR, `${imageId}.json`), 'utf-8')) as VisualAnalysis;
    return analysis.suggestions;
  } catch {
    return [];
  }
};
