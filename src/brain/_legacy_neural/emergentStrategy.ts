// @ts-nocheck
/**
 * Emergent Strategy — descubre estrategias no enseñadas.
 *
 * En vez de aplicar reglas pre-cargadas, el cerebro:
 *   - Combina patrones de N niches distintos para inventar tácticas nuevas
 *   - Evolutionary search: mutation + crossover de estrategias existentes
 *   - Fitness function basada en simulated outcomes
 *   - Mantiene "diversidad genética" (no converge a 1 estrategia)
 *
 * Output: estrategias originales con score, novelty + fitness.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const EMERGENT_DIR = path.resolve('data/neural/emergent');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface StrategyGenome {
  id: string;
  generation: number;
  ancestor1Id?: string;
  ancestor2Id?: string;
  description: string;
  tactics: string[]; // 5-10 tácticas concretas
  genomeFingerprint: string; // hash conceptual
  fitness: number; // 0-1 (post-simulation)
  novelty: number; // 0-1 (qué distinta vs ancestros)
  diversityContribution: number; // 0-1 (qué aporta al pool)
  generatedAt: string;
  status: 'untested' | 'simulated' | 'piloted' | 'shipped' | 'retired';
}

export interface StrategyPool {
  brandId: string;
  generation: number;
  genomes: StrategyGenome[];
  best: StrategyGenome | null;
  diversityIndex: number; // 0-1
  generatedAt: string;
}

// ── Mutation ─────────────────────────────────────────────────────────────────

const mutateStrategy = async (
  brand: BrandProfile,
  parent: StrategyGenome,
  mutationRate = 0.3,
): Promise<StrategyGenome> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    system: `Evolutionary strategist. Mutás estrategias existentes preservando lo que funciona, modificando lo que no.`,
    messages: [
      {
        role: 'user',
        content: `Mutá esta estrategia para ${brand.name}:

PARENT STRATEGY: ${parent.description}
TACTICS: ${parent.tactics.join('; ')}

Aplica mutaciones (rate ${(mutationRate * 100).toFixed(0)}%):
- Cambiá 30% de las tácticas por variaciones inesperadas
- Mantené las que probablemente funcionan
- Inventá 1-2 tácticas COMPLETAMENTE nuevas

JSON: { "description": "nueva descripción", "tactics": ["tacticas mutadas"] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { description: string; tactics: string[] })
    : { description: parent.description, tactics: parent.tactics };

  return {
    id: `genome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    generation: parent.generation + 1,
    ancestor1Id: parent.id,
    description: generated.description,
    tactics: generated.tactics,
    genomeFingerprint: hashTactics(generated.tactics),
    fitness: 0,
    novelty: 0,
    diversityContribution: 0,
    generatedAt: new Date().toISOString(),
    status: 'untested',
  };
};

// ── Crossover ────────────────────────────────────────────────────────────────

const crossoverStrategies = async (
  brand: BrandProfile,
  parent1: StrategyGenome,
  parent2: StrategyGenome,
): Promise<StrategyGenome> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'adaptive' },
    system: `Crossover de estrategias. Combinás lo mejor de dos parents.`,
    messages: [
      {
        role: 'user',
        content: `Crossover de dos estrategias para ${brand.name}:

PARENT 1: ${parent1.description}
TACTICS 1: ${parent1.tactics.join('; ')}

PARENT 2: ${parent2.description}
TACTICS 2: ${parent2.tactics.join('; ')}

Crea estrategia híbrida:
- Tomá las 3 mejores tácticas de cada parent
- Sintetizá descripción que combine ambos enfoques
- El híbrido debe ser coherente (no contradictorio)

JSON: { "description": "...", "tactics": [...] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { description: string; tactics: string[] })
    : { description: '', tactics: [] };

  return {
    id: `genome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    generation: Math.max(parent1.generation, parent2.generation) + 1,
    ancestor1Id: parent1.id,
    ancestor2Id: parent2.id,
    description: generated.description,
    tactics: generated.tactics,
    genomeFingerprint: hashTactics(generated.tactics),
    fitness: 0,
    novelty: 0,
    diversityContribution: 0,
    generatedAt: new Date().toISOString(),
    status: 'untested',
  };
};

// ── Cross-niche borrowing ────────────────────────────────────────────────────

const borrowFromAdjacentNiche = async (brand: BrandProfile, sourceNiche: string): Promise<StrategyGenome> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1200,
    thinking: { type: 'adaptive' },
    system: `Innovation by cross-pollination. Traés táctica exitosa de otro nicho y la adaptás.`,
    messages: [
      {
        role: 'user',
        content: `Brand: ${brand.name} (nicho: ${brand.industryCategory ?? 'general'})

Buscá táctica probada en nicho "${sourceNiche}" que NO se use en el nicho de ${brand.name} y adaptala.

JSON: { "description": "explicación de la táctica + adaptación", "tactics": ["pasos concretos"], "fromNiche": "${sourceNiche}" }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { description: string; tactics: string[] })
    : { description: '', tactics: [] };

  return {
    id: `genome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    generation: 1,
    description: `[CROSS-NICHE from ${sourceNiche}] ${generated.description}`,
    tactics: generated.tactics,
    genomeFingerprint: hashTactics(generated.tactics),
    fitness: 0,
    novelty: 0.8, // borrowing es high-novelty
    diversityContribution: 0.7,
    generatedAt: new Date().toISOString(),
    status: 'untested',
  };
};

// ── Evolutionary loop ────────────────────────────────────────────────────────

export const evolveStrategies = async (
  brand: BrandProfile,
  options: {
    initialPoolSize?: number;
    generations?: number;
    eliteCount?: number;
    mutationRate?: number;
  } = {},
): Promise<StrategyPool> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const initialSize = options.initialPoolSize ?? 6;
  const generations = options.generations ?? 3;

  log.info('[emergentStrategy] evolving', { brandId, initialSize, generations });

  // Gen 0: seed pool con estrategias diversas
  const adjacentNiches = ['fitness', 'fashion', 'food', 'tech', 'finance', 'education'];
  const gen0: StrategyGenome[] = await Promise.all(
    adjacentNiches.slice(0, initialSize).map((niche) => borrowFromAdjacentNiche(brand, niche)),
  );
  let pool: StrategyGenome[] = gen0;

  // Evolution loop
  for (let g = 1; g <= generations; g++) {
    pool = await assessFitness(pool);
    const elite = pool.sort((a, b) => b.fitness - a.fitness).slice(0, options.eliteCount ?? 3);
    const offspring: StrategyGenome[] = [];

    // Mutations
    for (const e of elite) {
      offspring.push(await mutateStrategy(brand, e, options.mutationRate ?? 0.3));
    }
    // Crossovers
    for (let i = 0; i < elite.length - 1; i++) {
      offspring.push(await crossoverStrategies(brand, elite[i]!, elite[i + 1]!));
    }
    // 1 inmigrante cross-niche cada gen (mantiene diversidad)
    const randomNiche = adjacentNiches[Math.floor(Math.random() * adjacentNiches.length)]!;
    offspring.push(await borrowFromAdjacentNiche(brand, randomNiche));

    pool = [...elite, ...offspring];
  }

  pool = await assessFitness(pool);

  const best = pool.sort((a, b) => b.fitness - a.fitness)[0] ?? null;
  const diversityIndex = computeDiversity(pool);

  const result: StrategyPool = {
    brandId,
    generation: generations,
    genomes: pool,
    best,
    diversityIndex,
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(EMERGENT_DIR, { recursive: true });
  await fs.writeFile(path.join(EMERGENT_DIR, `${brandId}-pool.json`), JSON.stringify(result, null, 2), 'utf-8');
  log.info('[emergentStrategy] evolution done', {
    brandId,
    best: best?.id,
    fitness: best?.fitness.toFixed(2),
    diversity: diversityIndex.toFixed(2),
  });
  return result;
};

// ── Fitness assessment ───────────────────────────────────────────────────────

const assessFitness = async (genomes: StrategyGenome[]): Promise<StrategyGenome[]> => {
  // Heurística: usa Claude para rate cada genome
  if (genomes.length === 0) return [];

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Rate fitness (0-1) de cada estrategia:

${genomes.map((g, i) => `[${i}] ${g.description.slice(0, 200)} | tactics: ${g.tactics.slice(0, 3).join('; ')}`).join('\n')}

Fitness = probabilidad de éxito × novelty × feasibility.

JSON: { "scores": [{ "index": 0, "fitness": 0-1, "novelty": 0-1 }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]) as { scores: Array<{ index: number; fitness: number; novelty: number }> };
    for (const score of parsed.scores) {
      const g = genomes[score.index];
      if (g) {
        g.fitness = score.fitness;
        g.novelty = score.novelty;
        g.status = 'simulated';
      }
    }
  }
  return genomes;
};

const hashTactics = (tactics: string[]): string => {
  const joined = tactics.join('|').toLowerCase();
  let hash = 0;
  for (let i = 0; i < joined.length; i++) hash = ((hash << 5) - hash + joined.charCodeAt(i)) & 0xffffffff;
  return hash.toString(16);
};

const computeDiversity = (pool: StrategyGenome[]): number => {
  const fingerprints = new Set(pool.map((g) => g.genomeFingerprint));
  return fingerprints.size / Math.max(1, pool.length);
};

export const getStrategyPool = async (brandId: string): Promise<StrategyPool | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(EMERGENT_DIR, `${brandId}-pool.json`), 'utf-8')) as StrategyPool;
  } catch {
    return null;
  }
};
