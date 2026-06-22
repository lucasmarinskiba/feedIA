/**
 * Reel Studio — Guionista, director y editor de Reels automatizado.
 *
 * Reemplaza al creador de contenido + editor de video:
 *   - Genera guion completo con timing por escena
 *   - Define cortes, transiciones, audio, efectos
 *   - Crea storyboard listo para grabar
 *   - Sugiere covers, captions y CTAs alineados al hook
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const REEL_DIR = path.resolve('data/reel-studio');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ReelDuration = 15 | 30 | 60 | 90;
export type ReelStyle =
  | 'storytelling'
  | 'tutorial'
  | 'pov'
  | 'transformation'
  | 'comedy'
  | 'reaction'
  | 'listicle'
  | 'mythbusting';
export type AudioType = 'trending-song' | 'voiceover' | 'original-audio' | 'silent-text' | 'asmr';

export interface ReelScene {
  sceneNumber: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  visualDescription: string; // qué se ve en pantalla
  cameraAngle: string; // ángulo de cámara
  shotType: 'close-up' | 'medium' | 'wide' | 'over-shoulder' | 'pov';
  movement: 'static' | 'pan' | 'zoom-in' | 'zoom-out' | 'tracking';
  onScreenText: string; // texto que aparece en pantalla
  voiceoverText?: string; // narración (si aplica)
  audioCue: string; // qué pasa con el audio (drop, cambio, énfasis)
  transitionToNext?: 'cut' | 'jump-cut' | 'whip-pan' | 'fade' | 'match-cut' | 'beat-drop';
  effects: string[]; // efectos visuales sugeridos
  productionNotes: string; // notas para el editor
}

export interface ReelScript {
  id: string;
  brandId: string;
  topic: string;
  hook: string; // primeras 3 palabras críticas
  style: ReelStyle;
  duration: ReelDuration;
  audioStrategy: {
    type: AudioType;
    description: string;
    syncPoints: number[]; // segundos donde el audio sincroniza con cortes
  };
  scenes: ReelScene[];
  coverFrame: {
    sceneNumber: number;
    text: string; // texto que va en la cover
    visualDirection: string;
  };
  caption: string;
  cta: string;
  hashtags: string[];
  expectedRetention: {
    sec3: number; // % esperado de retención a los 3s
    sec15: number;
    completion: number; // % completion rate esperado
  };
  productionChecklist: string[]; // checklist para grabar
  estimatedShootMinutes: number;
  estimatedEditMinutes: number;
  createdAt: string;
}

export interface StoryboardFrame {
  sceneNumber: number;
  thumbnailDescription: string; // descripción para que un IA visual genere mockup
  composition: string; // regla de tercios / centrado / asimétrico
  lighting: string;
  props: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureReelDir = async (): Promise<void> => {
  await fs.mkdir(REEL_DIR, { recursive: true });
};

const reelPath = (brandId: string): string => path.join(REEL_DIR, `${brandId}-reels.json`);

const loadReels = async (brandId: string): Promise<ReelScript[]> => {
  try {
    return JSON.parse(await fs.readFile(reelPath(brandId), 'utf-8')) as ReelScript[];
  } catch {
    return [];
  }
};

const saveReels = async (brandId: string, reels: ReelScript[]): Promise<void> => {
  await ensureReelDir();
  await fs.writeFile(reelPath(brandId), JSON.stringify(reels.slice(-100), null, 2), 'utf-8');
};

// ── Generación de guion ───────────────────────────────────────────────────────

/** Genera guion completo de Reel con timing escena por escena. */
export const generateReelScript = async (
  brand: BrandProfile,
  params: {
    topic: string;
    style: ReelStyle;
    duration: ReelDuration;
    hook?: string; // hook específico (opcional)
    targetPersona?: string;
    cta?: string;
  },
): Promise<ReelScript> => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info(`[reelStudio] generating script · brandId=${brandId} style=${params.style} duration=${params.duration}`);

  const sceneCount = params.duration <= 15 ? 4 : params.duration <= 30 ? 6 : params.duration <= 60 ? 10 : 14;

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Eres director, guionista y editor de Reels virales.
Conoces la psicología de retención: cada segundo cuenta, los primeros 3s son críticos.
Sabes técnicas de edición avanzadas: jump cuts, match cuts, beat drops, transitions.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Crea guion completo de Reel para ${brand.name}:

Tema: ${params.topic}
Estilo: ${params.style}
Duración total: ${params.duration} segundos
${params.hook ? `Hook deseado: "${params.hook}"` : 'Genera un hook que detenga el scroll en 0.5s'}
${params.targetPersona ? `Persona objetivo: ${params.targetPersona}` : ''}
Industria: ${(brand as { industryCategory?: string }).industryCategory ?? brand.niche ?? 'general'}
Tono: ${(brand as { toneOfVoice?: string }).toneOfVoice ?? brand.voice?.tone?.join(', ') ?? 'cercano profesional'}

Diseña ${sceneCount} escenas con timing exacto.
Cada escena: descripción visual + ángulo + tipo de toma + texto en pantalla + transición.
Define estrategia de audio sincronizada.
Define cover frame de máxima retención.
Predice retención esperada (sec3, sec15, completion).

Devuelve:
{
  "hook": "primeras 3-5 palabras críticas",
  "audioStrategy": {
    "type": "trending-song|voiceover|original-audio|silent-text|asmr",
    "description": "descripción del audio",
    "syncPoints": [seg1, seg2, seg3]
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "startSec": 0,
      "endSec": número,
      "durationSec": número,
      "visualDescription": "qué se ve",
      "cameraAngle": "frontal|45°|cenital|contrapicado|over-shoulder",
      "shotType": "close-up|medium|wide|over-shoulder|pov",
      "movement": "static|pan|zoom-in|zoom-out|tracking",
      "onScreenText": "texto exacto en pantalla",
      "voiceoverText": "narración si aplica",
      "audioCue": "qué pasa con el audio",
      "transitionToNext": "cut|jump-cut|whip-pan|fade|match-cut|beat-drop",
      "effects": ["efecto1", "efecto2"],
      "productionNotes": "notas técnicas"
    }
  ],
  "coverFrame": {
    "sceneNumber": número,
    "text": "texto exacto en cover (máx 8 palabras)",
    "visualDirection": "instrucción visual para diseñar la cover"
  },
  "caption": "caption del reel (máx 2200 chars, con AIDA)",
  "cta": "CTA específico al final",
  "hashtags": ["#hashtag1", ..., "#hashtag10"],
  "expectedRetention": {
    "sec3": 0.85,
    "sec15": 0.65,
    "completion": 0.40
  },
  "productionChecklist": ["item1", "item2", ...],
  "estimatedShootMinutes": número,
  "estimatedEditMinutes": número
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[reelStudio] No script generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<ReelScript>;
  const script: ReelScript = {
    id: `reel-${Date.now()}`,
    brandId,
    topic: params.topic,
    hook: generated.hook ?? params.hook ?? '',
    style: params.style,
    duration: params.duration,
    audioStrategy: generated.audioStrategy ?? { type: 'trending-song', description: '', syncPoints: [] },
    scenes: generated.scenes ?? [],
    coverFrame: generated.coverFrame ?? { sceneNumber: 1, text: '', visualDirection: '' },
    caption: generated.caption ?? '',
    cta: generated.cta ?? params.cta ?? '',
    hashtags: generated.hashtags ?? [],
    expectedRetention: generated.expectedRetention ?? { sec3: 0.7, sec15: 0.5, completion: 0.3 },
    productionChecklist: generated.productionChecklist ?? [],
    estimatedShootMinutes: generated.estimatedShootMinutes ?? 30,
    estimatedEditMinutes: generated.estimatedEditMinutes ?? 45,
    createdAt: new Date().toISOString(),
  };

  const reels = await loadReels(brandId);
  await saveReels(brandId, [...reels, script]);
  return script;
};

/** Genera storyboard visual (descripciones para mockup). */
export const generateStoryboard = (script: ReelScript): StoryboardFrame[] => {
  return script.scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    thumbnailDescription: `${scene.shotType} shot, ${scene.movement} movement, ${scene.visualDescription}`,
    composition: scene.shotType === 'close-up' ? 'centrado' : 'regla de tercios',
    lighting: 'iluminación natural suave',
    props: [],
  }));
};

/** Genera 5 variantes de hook para A/B test del Reel. */
export const generateHookVariants = async (brand: BrandProfile, topic: string, style: ReelStyle): Promise<string[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Genera 5 hooks de 3-7 palabras para Reel de ${brand.name} sobre "${topic}" en estilo ${style}.
Cada hook debe detener el scroll en 0.5 segundos.
Variar enfoque: pregunta provocadora, dato impactante, afirmación contraintuitiva, promesa específica, narrativa con cliffhanger.
JSON: { "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? (JSON.parse(jsonMatch[0]) as { hooks: string[] }).hooks : [];
};

/** Genera serie completa de N reels conectados (saga). */
export const generateReelSeries = async (
  brand: BrandProfile,
  seriesTheme: string,
  episodeCount: number,
  style: ReelStyle,
): Promise<ReelScript[]> => {
  log.info(`[reelStudio] generating series · theme=${seriesTheme} episodes=${episodeCount}`);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Diseña ${episodeCount} episodios conectados de una serie de Reels para ${brand.name}.
Tema central: "${seriesTheme}"
Estilo: ${style}

Cada episodio debe:
- Conectar con el anterior (continuidad narrativa)
- Tener su propio gancho independiente
- Generar curiosidad por el siguiente

JSON: { "episodes": [{ "episodeNumber": 1, "topic": "", "hook": "", "cliffhanger": "qué dejar abierto" }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const series = JSON.parse(jsonMatch[0]) as {
    episodes: Array<{ episodeNumber: number; topic: string; hook: string }>;
  };
  const scripts: ReelScript[] = [];
  for (const ep of series.episodes) {
    const script = await generateReelScript(brand, { topic: ep.topic, hook: ep.hook, style, duration: 30 });
    scripts.push(script);
  }
  return scripts;
};

/** Carga reels generados. */
export const getReels = async (brandId: string, limit = 20): Promise<ReelScript[]> => {
  const reels = await loadReels(brandId);
  return reels.slice(-limit);
};
