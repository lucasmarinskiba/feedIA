// @ts-nocheck
/**
 * Theory of Mind — segundo orden de razonamiento.
 *
 * Brain modela:
 *   1. Lo que la audiencia PIENSA (creencias, expectativas)
 *   2. Lo que la audiencia CREE que la marca piensa
 *   3. Lo que competidores piensan que la marca hará
 *   4. Recursión: "ellos creen que yo creo que ellos creen..."
 *
 * Permite jugar moves estratégicos no obvios + anticipar reacciones.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const TOM_DIR = path.resolve('data/neural/theory-of-mind');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Agent =
  | 'brand'
  | 'audience-core'
  | 'audience-casual'
  | 'competitor-direct'
  | 'competitor-adjacent'
  | 'algorithm'
  | 'media'
  | 'collaborators';

export interface MentalModel {
  agent: Agent;
  beliefs: string[]; // qué cree que es verdad
  expectations: string[]; // qué espera que pase
  desires: string[];
  fears: string[];
  perceivedReality: Record<string, number>; // su percepción de métricas brand (puede diff de real)
  predictedActions: Array<{ action: string; probability: number; trigger: string }>;
}

export interface SecondOrderBelief {
  agent: Agent;
  about: Agent;
  belief: string; // qué A cree que B piensa
  confidence: number;
}

export interface TheoryOfMindMap {
  brandId: string;
  generatedAt: string;
  mentalModels: MentalModel[];
  secondOrderBeliefs: SecondOrderBelief[];
  strategicGaps: Array<{
    // donde mis acciones serán inesperadas (oportunidad)
    description: string;
    exploitableNow: boolean;
    expectedImpact: number;
  }>;
  blindSpots: string[]; // lo que NO veo que otros sí ven
}

// ── Construcción del mapa ────────────────────────────────────────────────────

export const buildTheoryOfMind = async (
  brand: BrandProfile,
  context: {
    recentBrandActions: string[];
    audienceReactions?: string[];
    competitorMoves?: string[];
    industryNews?: string[];
  },
): Promise<TheoryOfMindMap> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `Estratega meta-cognitivo. Modelás creencias + expectativas + deseos de múltiples agents.
Razonás en segundo orden: "X cree que Y piensa Z".
Identificás strategic gaps (movidas inesperadas) y blind spots (lo que no veo).`,
    messages: [
      {
        role: 'user',
        content: `Construí Theory of Mind para ${brand.name}:

Acciones recientes brand: ${context.recentBrandActions.join('; ')}
${context.audienceReactions ? `Reacciones audiencia: ${context.audienceReactions.join('; ')}` : ''}
${context.competitorMoves ? `Movidas competidores: ${context.competitorMoves.join('; ')}` : ''}
${context.industryNews ? `Industry news: ${context.industryNews.join('; ')}` : ''}

Modelá mente de:
- audience-core (followers más leales)
- audience-casual (seguidores tibios)
- competitor-direct (competidores directos)
- competitor-adjacent (juegan en nicho cercano)
- algorithm (qué espera Meta del contenido)

JSON: {
  "mentalModels": [{
    "agent": "audience-core|...",
    "beliefs": ["lo que cree verdad sobre la marca"],
    "expectations": ["qué esperan que la marca haga"],
    "desires": ["qué quieren obtener"],
    "fears": ["qué temen de la marca"],
    "perceivedReality": { "metric": value que ellos perciben },
    "predictedActions": [{ "action": "qué harán", "probability": 0-1, "trigger": "qué los gatilla" }]
  }],
  "secondOrderBeliefs": [{
    "agent": "competitor-direct",
    "about": "brand",
    "belief": "competidor cree que brand está debilitada",
    "confidence": 0-1
  }],
  "strategicGaps": [{
    "description": "oportunidad de move inesperado",
    "exploitableNow": boolean,
    "expectedImpact": 0-1
  }],
  "blindSpots": ["qué se está perdiendo el brand de ver"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[theoryOfMind] No map');

  const generated = JSON.parse(jsonMatch[0]) as Partial<TheoryOfMindMap>;
  const map: TheoryOfMindMap = {
    brandId,
    generatedAt: new Date().toISOString(),
    mentalModels: generated.mentalModels ?? [],
    secondOrderBeliefs: generated.secondOrderBeliefs ?? [],
    strategicGaps: generated.strategicGaps ?? [],
    blindSpots: generated.blindSpots ?? [],
  };

  await fs.mkdir(TOM_DIR, { recursive: true });
  await fs.writeFile(path.join(TOM_DIR, `${brandId}-map.json`), JSON.stringify(map, null, 2), 'utf-8');
  log.info('[theoryOfMind] map saved', { brandId, models: map.mentalModels.length, gaps: map.strategicGaps.length });
  return map;
};

/** Predice cómo reaccionaría agent X a acción Y. */
export const predictReaction = async (
  brandId: string,
  agent: Agent,
  hypotheticalAction: string,
): Promise<{ predicted: string; probability: number; reasoning: string }> => {
  let map: TheoryOfMindMap;
  try {
    map = JSON.parse(await fs.readFile(path.join(TOM_DIR, `${brandId}-map.json`), 'utf-8')) as TheoryOfMindMap;
  } catch {
    return { predicted: 'unknown', probability: 0, reasoning: 'No ToM map built' };
  }

  const model = map.mentalModels.find((m) => m.agent === agent);
  if (!model) return { predicted: 'unknown', probability: 0, reasoning: `No model for ${agent}` };

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Predicí cómo reaccionaría "${agent}" si la marca hiciera: "${hypotheticalAction}"

Mental model del agent:
- Beliefs: ${model.beliefs.join('; ')}
- Expectations: ${model.expectations.join('; ')}
- Desires: ${model.desires.join('; ')}
- Fears: ${model.fears.join('; ')}

JSON: { "predicted": "reacción concreta", "probability": 0-1, "reasoning": "por qué" }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { predicted: 'unknown', probability: 0, reasoning: '' };
  return JSON.parse(jsonMatch[0]) as { predicted: string; probability: number; reasoning: string };
};

/** Encuentra movidas que sorprendan al agent X (exploitar gap entre lo esperado y lo real). */
export const findSurprisingMoves = async (brandId: string, targetAgent: Agent): Promise<string[]> => {
  const map = await getMap(brandId);
  if (!map) return [];
  const model = map.mentalModels.find((m) => m.agent === targetAgent);
  if (!model) return [];
  return model.predictedActions.map((pa) => `Hacer LO OPUESTO de "${pa.action}" — los sorprende`);
};

export const getMap = async (brandId: string): Promise<TheoryOfMindMap | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(TOM_DIR, `${brandId}-map.json`), 'utf-8')) as TheoryOfMindMap;
  } catch {
    return null;
  }
};
