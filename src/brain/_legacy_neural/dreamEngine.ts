// @ts-nocheck
/**
 * Dream Engine — simulación generativa de ideas raras.
 *
 * Cuando humano duerme, cerebro consolida + experimenta combinando memorias
 * de forma extraña. Acá hacemos análogo: el sistema "sueña" combinaciones
 * inusuales para descubrir ideas que no salen de búsqueda directa.
 *
 * Mecanismos:
 *   - Random walk en knowledge graph
 *   - Surrealist juxtaposition (combina elementos no relacionados)
 *   - Counterfactual scenarios extremos
 *   - Reverse engineering desde outcomes deseados
 *
 * Output: 5-10 ideas raras pero potencialmente brillantes, filtradas por feasibility.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const DREAM_DIR = path.resolve('data/neural/dreams');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type DreamMechanism =
  | 'surrealist-juxtaposition'
  | 'counterfactual-extreme'
  | 'reverse-engineer'
  | 'random-walk'
  | 'metaphor-bridge'
  | 'absurd-premise';

export interface DreamIdea {
  id: string;
  mechanism: DreamMechanism;
  description: string;
  origin: { elements: string[]; combination: string };
  feasibilityScore: number; // 0-1 puede ejecutarse
  brillianceScore: number; // 0-1 qué tan brillante si funciona
  weirdnessScore: number; // 0-1 qué tan rara
  expectedReward: number; // 0-1 si se ejecuta
  developmentNotes: string; // cómo materializarla
  risks: string[];
}

export interface DreamSession {
  brandId: string;
  generatedAt: string;
  durationMs: number;
  seedConcepts: string[];
  dreams: DreamIdea[];
  topActionable: DreamIdea[]; // brilliance × feasibility top 3
  topWeird: DreamIdea[]; // raras pero interesantes
}

// ── Mecanismo: Surrealist Juxtaposition ──────────────────────────────────────

const surrealistJuxtaposition = async (
  brand: BrandProfile,
  elements: string[],
  count: number,
): Promise<DreamIdea[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Surrealist content creator. Combinás elementos completamente no relacionados para crear ideas IG raras pero brillantes.`,
    messages: [
      {
        role: 'user',
        content: `Para ${brand.name}, generá ${count} ideas combinando elementos no relacionados:

ELEMENTOS DISPONIBLES (combinalos en pares inesperados):
${elements.join(', ')}

Ejemplos de surrealist juxtaposition:
- "fitness + literatura barroca" → reels donde recitás Cervantes mientras hacés sentadillas
- "café + matemáticas teóricas" → carrusel sobre teoría de juegos en el menú del café
- "pintar uñas + filosofía estoica" → tutorial nail art con citas de Marco Aurelio

Para cada idea:
{
  "description": "qué es exactamente",
  "elements": ["elemento1", "elemento2"],
  "combination": "frase que captura la juxtaposición",
  "feasibilityScore": 0-1,
  "brillianceScore": 0-1,
  "weirdnessScore": 0-1,
  "expectedReward": 0-1,
  "developmentNotes": "cómo ejecutar",
  "risks": ["qué puede salir mal"]
}

JSON: { "ideas": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as {
    ideas: Array<Partial<DreamIdea> & { elements: string[]; combination: string }>;
  };
  return result.ideas.map((idea, i) => ({
    id: `dream-surr-${Date.now()}-${i}`,
    mechanism: 'surrealist-juxtaposition' as DreamMechanism,
    description: idea.description ?? '',
    origin: { elements: idea.elements, combination: idea.combination },
    feasibilityScore: idea.feasibilityScore ?? 0.5,
    brillianceScore: idea.brillianceScore ?? 0.5,
    weirdnessScore: idea.weirdnessScore ?? 0.5,
    expectedReward: idea.expectedReward ?? 0.5,
    developmentNotes: idea.developmentNotes ?? '',
    risks: idea.risks ?? [],
  }));
};

// ── Mecanismo: Counterfactual Extreme ────────────────────────────────────────

const counterfactualExtreme = async (brand: BrandProfile, count: number): Promise<DreamIdea[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Generador de counterfactuals extremos. "¿Y si...?" hasta lo absurdo.`,
    messages: [
      {
        role: 'user',
        content: `Para ${brand.name}, generá ${count} counterfactuals extremos:

Ejemplos:
- "¿Y si publicáramos SOLO una foto al mes durante 12 meses?"
- "¿Y si todos los reels duraran exactamente 1 segundo?"
- "¿Y si nunca usáramos hashtags?"
- "¿Y si la marca tomara una postura política deliberadamente?"

Cada counterfactual debe ser PROVOCADOR pero forzar pensar diferente.

JSON: { "ideas": [{ description, elements: [variable cambiada, valor extremo], combination, feasibilityScore, brillianceScore, weirdnessScore, expectedReward, developmentNotes, risks: [] }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as {
    ideas: Array<Partial<DreamIdea> & { elements: string[]; combination: string }>;
  };
  return result.ideas.map((idea, i) => ({
    id: `dream-cf-${Date.now()}-${i}`,
    mechanism: 'counterfactual-extreme' as DreamMechanism,
    description: idea.description ?? '',
    origin: { elements: idea.elements, combination: idea.combination },
    feasibilityScore: idea.feasibilityScore ?? 0.5,
    brillianceScore: idea.brillianceScore ?? 0.5,
    weirdnessScore: idea.weirdnessScore ?? 0.5,
    expectedReward: idea.expectedReward ?? 0.5,
    developmentNotes: idea.developmentNotes ?? '',
    risks: idea.risks ?? [],
  }));
};

// ── Mecanismo: Reverse Engineer ──────────────────────────────────────────────

const reverseEngineer = async (brand: BrandProfile, desiredOutcome: string, count: number): Promise<DreamIdea[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Reverse engineer de outcomes. Empezás desde el resultado deseado y trabajás hacia atrás.`,
    messages: [
      {
        role: 'user',
        content: `${brand.name} quiere lograr: "${desiredOutcome}"

Trabajá hacia atrás:
- ¿Qué tendría que pasar antes para que esto sea consecuencia natural?
- ¿Qué tendría que pasar antes de eso?
- Etc, hasta llegar a una acción ejecutable HOY

Generá ${count} caminos distintos al outcome.

JSON: { "ideas": [{ description: "acción hoy", elements: ["pasos backward"], combination, feasibilityScore, brillianceScore, weirdnessScore, expectedReward, developmentNotes, risks: [] }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonMatch[0]) as {
    ideas: Array<Partial<DreamIdea> & { elements: string[]; combination: string }>;
  };
  return result.ideas.map((idea, i) => ({
    id: `dream-re-${Date.now()}-${i}`,
    mechanism: 'reverse-engineer' as DreamMechanism,
    description: idea.description ?? '',
    origin: { elements: idea.elements, combination: idea.combination },
    feasibilityScore: idea.feasibilityScore ?? 0.5,
    brillianceScore: idea.brillianceScore ?? 0.5,
    weirdnessScore: idea.weirdnessScore ?? 0.5,
    expectedReward: idea.expectedReward ?? 0.5,
    developmentNotes: idea.developmentNotes ?? '',
    risks: idea.risks ?? [],
  }));
};

// ── Dream session completa ───────────────────────────────────────────────────

export const runDreamSession = async (
  brand: BrandProfile,
  options: {
    seedConcepts?: string[];
    desiredOutcome?: string;
    ideasPerMechanism?: number;
  } = {},
): Promise<DreamSession> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const startTime = Date.now();

  // Seed concepts: combina nicho + cosas random
  const seedConcepts = options.seedConcepts ?? [
    brand.industryCategory ?? 'general',
    'filosofía estoica',
    'ciencia ficción',
    'arte abstracto',
    'matemáticas',
    'cocina molecular',
    'literatura del siglo XIX',
    'deportes extremos',
    'historia antigua',
    'biología marina',
  ];

  const desiredOutcome = options.desiredOutcome ?? `Que ${brand.name} sea referente único del nicho en 6 meses`;
  const ideasPerMechanism = options.ideasPerMechanism ?? 3;

  log.info('[dreamEngine] session starting', { brandId, seeds: seedConcepts.length });

  // Run 3 mechanisms in parallel
  const [surrIdeas, cfIdeas, reIdeas] = await Promise.all([
    surrealistJuxtaposition(brand, seedConcepts, ideasPerMechanism),
    counterfactualExtreme(brand, ideasPerMechanism),
    reverseEngineer(brand, desiredOutcome, ideasPerMechanism),
  ]);

  const dreams = [...surrIdeas, ...cfIdeas, ...reIdeas];

  const topActionable = [...dreams]
    .sort((a, b) => b.brillianceScore * b.feasibilityScore - a.brillianceScore * a.feasibilityScore)
    .slice(0, 3);

  const topWeird = [...dreams].sort((a, b) => b.weirdnessScore - a.weirdnessScore).slice(0, 3);

  const session: DreamSession = {
    brandId,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    seedConcepts,
    dreams,
    topActionable,
    topWeird,
  };

  await fs.mkdir(DREAM_DIR, { recursive: true });
  const file = path.join(DREAM_DIR, `${brandId}-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(session, null, 2), 'utf-8');
  log.info('[dreamEngine] session done', { brandId, ideas: dreams.length, durationMs: session.durationMs });
  return session;
};

export const getRecentDreams = async (brandId: string, limit = 10): Promise<DreamSession[]> => {
  try {
    const files = await fs.readdir(DREAM_DIR);
    const brandFiles = files.filter((f) => f.startsWith(brandId)).slice(-limit);
    const sessions: DreamSession[] = [];
    for (const f of brandFiles) {
      sessions.push(JSON.parse(await fs.readFile(path.join(DREAM_DIR, f), 'utf-8')) as DreamSession);
    }
    return sessions.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch {
    return [];
  }
};
