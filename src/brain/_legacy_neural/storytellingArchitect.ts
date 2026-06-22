// @ts-nocheck
/**
 * Storytelling Architect — narrativa multi-post coherente.
 *
 * Diseña arcos narrativos de largo plazo (semanas/meses) que conectan posts:
 *   - Hero's Journey aplicado a brand
 *   - Story arcs serializados
 *   - Tension/release calendar
 *   - Foreshadowing cross-posts
 *   - Payoffs después de N posts
 *
 * Mantiene continuidad narrativa cross-formato y cross-platform.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const STORY_DIR = path.resolve('data/neural/storytelling');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type StoryArc =
  | 'hero-journey'
  | 'transformation'
  | 'mystery'
  | 'rebellion'
  | 'rags-to-riches'
  | 'mentorship'
  | 'rivalry'
  | 'rebirth';

export type StoryBeat =
  | 'call-to-adventure'
  | 'refusal'
  | 'meeting-mentor'
  | 'crossing-threshold'
  | 'tests-allies-enemies'
  | 'approach-cave'
  | 'ordeal'
  | 'reward'
  | 'road-back'
  | 'resurrection'
  | 'return-elixir'
  | 'inciting-incident'
  | 'rising-action'
  | 'climax'
  | 'falling-action'
  | 'denouement';

export interface NarrativeArc {
  id: string;
  brandId: string;
  arcType: StoryArc;
  title: string;
  premise: string; // qué historia se cuenta
  protagonist: 'brand' | 'founder' | 'customer' | 'audience-self';
  goal: string; // qué busca el protagonista
  obstacle: string;
  stakes: string; // qué pierde si falla
  durationWeeks: number;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'climax' | 'concluded' | 'paused';
  beats: ArcBeat[];
  currentBeatIndex: number;
  themeWords: string[]; // palabras-tema recurrentes
  callbackOpportunities: string[]; // referencias a establecer ahora para payoff futuro
}

export interface ArcBeat {
  beatId: string;
  beat: StoryBeat;
  weekNumber: number;
  contentSuggestions: Array<{
    format: 'carousel' | 'reel' | 'story-series' | 'live' | 'post' | 'broadcast';
    topic: string;
    hook: string;
    foreshadowing?: string; // hint a evento futuro
    callbackTo?: string; // referencia a beat anterior
  }>;
  emotionalGoal: string; // qué debe sentir la audiencia este beat
  cliffhanger?: string;
  expectedReach: number;
}

export interface MultiArcCalendar {
  brandId: string;
  generatedAt: string;
  activeArcs: NarrativeArc[];
  upcomingPostsByWeek: Record<number, Array<{ arcId: string; beat: ArcBeat }>>;
  narrativeCoherenceScore: number; // 0-100 qué tan conectados están los posts
}

// ── Generación de arco narrativo ─────────────────────────────────────────────

export const designNarrativeArc = async (
  brand: BrandProfile,
  options: {
    arcType?: StoryArc;
    protagonist?: NarrativeArc['protagonist'];
    durationWeeks?: number;
    startDate?: string;
    theme?: string;
  } = {},
): Promise<NarrativeArc> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const arcType = options.arcType ?? 'hero-journey';
  const protagonist = options.protagonist ?? 'audience-self';
  const durationWeeks = options.durationWeeks ?? 8;
  const startDate = options.startDate ?? new Date().toISOString().split('T')[0]!;

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Storytelling architect senior. Diseñás arcos narrativos multi-post que enganchan a audiencias por semanas/meses.
Combinás Hero's Journey + dramatic structure + foreshadowing + callbacks.
Cada post avanza la historia. Devolvés JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Diseñá arco narrativo para ${brand.name}:

Tipo de arco: ${arcType}
Protagonista: ${protagonist}
Duración: ${durationWeeks} semanas
Industria: ${brand.industryCategory ?? 'general'}
Audiencia: ${brand.audience?.description ?? ''}
${options.theme ? `Tema: ${options.theme}` : ''}

Devolvé arco completo con beats semanales:

JSON: {
  "title": "título del arco",
  "premise": "premisa en 1 frase",
  "goal": "qué busca el protagonista",
  "obstacle": "qué se interpone",
  "stakes": "qué pierde si falla",
  "themeWords": ["palabras-tema que se repiten"],
  "callbackOpportunities": ["referencias a establecer para payoff futuro"],
  "beats": [{
    "beat": "call-to-adventure|refusal|meeting-mentor|crossing-threshold|tests-allies-enemies|approach-cave|ordeal|reward|road-back|resurrection|return-elixir|inciting-incident|rising-action|climax|falling-action|denouement",
    "weekNumber": 1-${durationWeeks},
    "contentSuggestions": [{
      "format": "carousel|reel|story-series|live|post|broadcast",
      "topic": "tema específico",
      "hook": "hook propuesto",
      "foreshadowing": "hint a evento futuro (opcional)",
      "callbackTo": "referencia a beat anterior (opcional)"
    }],
    "emotionalGoal": "qué debe sentir audiencia",
    "cliffhanger": "qué dejar sin resolver (opcional)",
    "expectedReach": estimación
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[storytellingArchitect] No arc');

  const generated = JSON.parse(jsonMatch[0]) as Partial<NarrativeArc>;
  const endDate = new Date(new Date(startDate).getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;

  const beats: ArcBeat[] = (generated.beats ?? []).map((b, i) => ({
    beatId: `beat-${Date.now()}-${i}`,
    beat: b.beat ?? 'rising-action',
    weekNumber: b.weekNumber ?? i + 1,
    contentSuggestions: b.contentSuggestions ?? [],
    emotionalGoal: b.emotionalGoal ?? '',
    cliffhanger: b.cliffhanger,
    expectedReach: b.expectedReach ?? 0,
  }));

  const arc: NarrativeArc = {
    id: `arc-${Date.now()}`,
    brandId,
    arcType,
    title: generated.title ?? `Arco ${arcType}`,
    premise: generated.premise ?? '',
    protagonist,
    goal: generated.goal ?? '',
    obstacle: generated.obstacle ?? '',
    stakes: generated.stakes ?? '',
    durationWeeks,
    startDate,
    endDate,
    status: 'active',
    beats,
    currentBeatIndex: 0,
    themeWords: generated.themeWords ?? [],
    callbackOpportunities: generated.callbackOpportunities ?? [],
  };

  await fs.mkdir(STORY_DIR, { recursive: true });
  const arcsFile = path.join(STORY_DIR, `${brandId}-arcs.json`);
  let arcs: NarrativeArc[] = [];
  try {
    arcs = JSON.parse(await fs.readFile(arcsFile, 'utf-8')) as NarrativeArc[];
  } catch {
    /* noop */
  }
  arcs.push(arc);
  await fs.writeFile(arcsFile, JSON.stringify(arcs.slice(-20), null, 2), 'utf-8');

  log.info('[storytellingArchitect] arc designed', { brandId, title: arc.title, beats: beats.length });
  return arc;
};

/** Avanza al próximo beat después de ejecutar contenido. */
export const advanceBeat = async (brandId: string, arcId: string): Promise<ArcBeat | null> => {
  const arcsFile = path.join(STORY_DIR, `${brandId}-arcs.json`);
  let arcs: NarrativeArc[] = [];
  try {
    arcs = JSON.parse(await fs.readFile(arcsFile, 'utf-8')) as NarrativeArc[];
  } catch {
    return null;
  }
  const arc = arcs.find((a) => a.id === arcId);
  if (!arc) return null;

  arc.currentBeatIndex++;
  if (arc.currentBeatIndex >= arc.beats.length) {
    arc.status = 'concluded';
    return null;
  }

  // Si llegamos al climax beat, marcar status
  const currentBeat = arc.beats[arc.currentBeatIndex];
  if (currentBeat?.beat === 'climax' || currentBeat?.beat === 'ordeal' || currentBeat?.beat === 'resurrection') {
    arc.status = 'climax';
  }

  await fs.writeFile(arcsFile, JSON.stringify(arcs, null, 2), 'utf-8');
  log.info('[storytellingArchitect] beat advanced', { arcId, newBeat: currentBeat?.beat });
  return currentBeat ?? null;
};

/** Próximo contenido sugerido según arcos activos. */
export const getNextNarrativeContent = async (
  brandId: string,
): Promise<Array<{ arcId: string; arcTitle: string; beat: ArcBeat }>> => {
  const arcsFile = path.join(STORY_DIR, `${brandId}-arcs.json`);
  let arcs: NarrativeArc[] = [];
  try {
    arcs = JSON.parse(await fs.readFile(arcsFile, 'utf-8')) as NarrativeArc[];
  } catch {
    return [];
  }

  return arcs
    .filter((a) => a.status === 'active' || a.status === 'climax')
    .map((a) => ({
      arcId: a.id,
      arcTitle: a.title,
      beat: a.beats[a.currentBeatIndex] ?? a.beats[0]!,
    }))
    .filter((x) => x.beat);
};

/** Calcula coherencia narrativa actual. */
export const calculateNarrativeCoherence = async (brandId: string): Promise<number> => {
  const arcsFile = path.join(STORY_DIR, `${brandId}-arcs.json`);
  let arcs: NarrativeArc[] = [];
  try {
    arcs = JSON.parse(await fs.readFile(arcsFile, 'utf-8')) as NarrativeArc[];
  } catch {
    return 50;
  }

  const activeArcs = arcs.filter((a) => a.status === 'active' || a.status === 'climax');
  if (activeArcs.length === 0) return 30;

  // Score basado en: cantidad arcos activos balanceados + theme word usage + cliffhangers no resueltos
  let score = 50;
  if (activeArcs.length >= 1 && activeArcs.length <= 3) score += 20;
  if (activeArcs.some((a) => a.themeWords.length > 3)) score += 15;
  if (activeArcs.some((a) => a.callbackOpportunities.length > 0)) score += 15;
  return Math.min(100, score);
};

/** Calendar multi-arc para próximas semanas. */
export const buildMultiArcCalendar = async (brandId: string): Promise<MultiArcCalendar> => {
  const arcsFile = path.join(STORY_DIR, `${brandId}-arcs.json`);
  let arcs: NarrativeArc[] = [];
  try {
    arcs = JSON.parse(await fs.readFile(arcsFile, 'utf-8')) as NarrativeArc[];
  } catch {
    /* noop */
  }

  const activeArcs = arcs.filter((a) => a.status === 'active' || a.status === 'climax');
  const upcomingPostsByWeek: Record<number, Array<{ arcId: string; beat: ArcBeat }>> = {};

  for (const arc of activeArcs) {
    for (const beat of arc.beats.slice(arc.currentBeatIndex, arc.currentBeatIndex + 4)) {
      upcomingPostsByWeek[beat.weekNumber] = upcomingPostsByWeek[beat.weekNumber] ?? [];
      upcomingPostsByWeek[beat.weekNumber]!.push({ arcId: arc.id, beat });
    }
  }

  return {
    brandId,
    generatedAt: new Date().toISOString(),
    activeArcs,
    upcomingPostsByWeek,
    narrativeCoherenceScore: await calculateNarrativeCoherence(brandId),
  };
};

/** Enrichment de prompt con contexto narrativo activo. */
export const buildNarrativeEnrichment = async (brandId: string): Promise<string> => {
  const upcoming = await getNextNarrativeContent(brandId);
  if (upcoming.length === 0) return '';

  const parts: string[] = ['[CONTEXTO NARRATIVO — arcos en curso]'];
  for (const u of upcoming.slice(0, 3)) {
    parts.push(`- Arc "${u.arcTitle}" en beat "${u.beat.beat}" semana ${u.beat.weekNumber}`);
    parts.push(`  Emocion objetivo: ${u.beat.emotionalGoal}`);
    if (u.beat.cliffhanger) parts.push(`  Cliffhanger a establecer: ${u.beat.cliffhanger}`);
    if (u.beat.contentSuggestions.length) {
      const cs = u.beat.contentSuggestions[0]!;
      if (cs.foreshadowing) parts.push(`  Foreshadowing: ${cs.foreshadowing}`);
      if (cs.callbackTo) parts.push(`  Callback a: ${cs.callbackTo}`);
    }
  }
  parts.push('[FIN CONTEXTO NARRATIVO]');
  return parts.join('\n');
};

export const getAllArcs = async (brandId: string): Promise<NarrativeArc[]> => {
  try {
    return JSON.parse(await fs.readFile(path.join(STORY_DIR, `${brandId}-arcs.json`), 'utf-8')) as NarrativeArc[];
  } catch {
    return [];
  }
};
