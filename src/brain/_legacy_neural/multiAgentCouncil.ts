// @ts-nocheck
/**
 * Multi-Agent Council — debate entre 7 expertos antes de decisión.
 *
 * Distinto al ensembleOrchestrator (5 voters específicos): este es un DEBATE
 * estructurado. Cada agente:
 *   1. Propone su recomendación
 *   2. Critica las del resto
 *   3. Refina su posición
 *   4. Vota final + razona
 *
 * Output: consensus + dissent + minoría que vale escuchar.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const COUNCIL_DIR = path.resolve('data/neural/council');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CouncilRole =
  | 'strategist' // CEO/visionario
  | 'analyst' // data-driven
  | 'creative' // creativity-first
  | 'community' // audience advocate
  | 'product' // product/offer perspective
  | 'finance' // ROI/cost focus
  | 'risk' // devil's advocate
  | 'trends'; // cultural pulse

export interface CouncilMember {
  role: CouncilRole;
  systemPrompt: string;
  voteWeight: number;
}

export interface CouncilOpinion {
  role: CouncilRole;
  round: 1 | 2 | 3; // proposal / critique / refinement
  position: string;
  reasoning: string;
  confidence: number; // 0-1
  agreesWith: CouncilRole[];
  disagreesWith: CouncilRole[];
}

export interface CouncilDecision {
  decisionId: string;
  brandId: string;
  question: string;
  context: Record<string, unknown>;
  rounds: CouncilOpinion[];
  consensus: string;
  consensusConfidence: number;
  minorityReport: { role: CouncilRole; position: string; reasoning: string } | null;
  dissentCount: number;
  shippedAction: string;
  generatedAt: string;
}

const MEMBERS: CouncilMember[] = [
  {
    role: 'strategist',
    voteWeight: 1.2,
    systemPrompt:
      'CEO con visión a 12 meses. Priorizás moves estratégicos sobre tácticos. Toleras pérdidas cortoplacistas por upside grande.',
  },
  {
    role: 'analyst',
    voteWeight: 1.1,
    systemPrompt: 'Senior data analyst. Solo recomendás basado en datos. Sin emoción. Cifras + probabilidades.',
  },
  {
    role: 'creative',
    voteWeight: 1.0,
    systemPrompt: 'Creative director. Priorizás impacto + originalidad. Defendés ideas raras si tienen tesis sólida.',
  },
  {
    role: 'community',
    voteWeight: 1.0,
    systemPrompt: 'Community advocate. Hablás por la audiencia. Defendés su experiencia + bond emocional.',
  },
  {
    role: 'product',
    voteWeight: 0.9,
    systemPrompt: 'Product manager. Cada decisión se conecta a producto/oferta. Sin distracciones de feed.',
  },
  {
    role: 'finance',
    voteWeight: 1.0,
    systemPrompt: 'CFO. ROI primero. Cada acción debe justificar costo + opportunity cost.',
  },
  {
    role: 'risk',
    voteWeight: 0.8,
    systemPrompt: "Devil's advocate. Tu trabajo: encontrar por qué la decisión va a fallar. Skeptic profesional.",
  },
  {
    role: 'trends',
    voteWeight: 0.9,
    systemPrompt: 'Cultural pulse expert. Conocés trends, memes, generational shifts en tiempo real.',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const queryMember = async (
  member: CouncilMember,
  context: string,
  previousOpinions: CouncilOpinion[] = [],
  round: 1 | 2 | 3 = 1,
): Promise<CouncilOpinion> => {
  let promptContext = context;
  if (round > 1 && previousOpinions.length > 0) {
    promptContext += `\n\nOPINIONES DE OTROS EN ESTE DEBATE:\n${previousOpinions
      .filter((o) => o.role !== member.role)
      .map((o) => `- [${o.role}]: ${o.position}`)
      .join('\n')}`;
    if (round === 2) promptContext += '\n\nROUND 2: Critica las posiciones que NO compartís. Sé directo.';
    if (round === 3) promptContext += '\n\nROUND 3: Después del debate, refiná o mantené tu posición. ¿Cambias algo?';
  }

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    thinking: { type: 'adaptive' },
    system: `${member.systemPrompt} Devolvés JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `${promptContext}\n\nJSON: { "position": "tu recomendación concreta", "reasoning": "por qué", "confidence": 0-1, "agreesWith": ["roles"], "disagreesWith": ["roles"] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<CouncilOpinion>) : ({} as Partial<CouncilOpinion>);
  return {
    role: member.role,
    round,
    position: parsed.position ?? '',
    reasoning: parsed.reasoning ?? '',
    confidence: parsed.confidence ?? 0.5,
    agreesWith: parsed.agreesWith ?? [],
    disagreesWith: parsed.disagreesWith ?? [],
  };
};

// ── Council session ─────────────────────────────────────────────────────────

export const convenecouncil = async (
  brand: BrandProfile,
  question: string,
  context: Record<string, unknown> = {},
): Promise<CouncilDecision> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const decisionId = `decision-${Date.now()}`;
  log.info('[multiAgentCouncil] convening', { brandId, decisionId, question: question.slice(0, 80) });

  const fullContext = `BRAND: ${brand.name} (${brand.industryCategory ?? 'general'})
QUESTION: ${question}
CONTEXT: ${JSON.stringify(context).slice(0, 1500)}`;

  // ROUND 1: proposals paralelos
  const round1 = await Promise.all(MEMBERS.map((m) => queryMember(m, fullContext, [], 1)));

  // ROUND 2: critiques (cada uno ve opiniones de otros)
  const round2 = await Promise.all(MEMBERS.map((m) => queryMember(m, fullContext, round1, 2)));

  // ROUND 3: refinements
  const round3 = await Promise.all(MEMBERS.map((m) => queryMember(m, fullContext, round2, 3)));

  // Aggregation: vote weighted por confidence × voteWeight
  const positionTally: Record<string, number> = {};
  for (const opinion of round3) {
    const member = MEMBERS.find((m) => m.role === opinion.role)!;
    const weight = opinion.confidence * member.voteWeight;
    positionTally[opinion.position] = (positionTally[opinion.position] ?? 0) + weight;
  }
  const sorted = Object.entries(positionTally).sort((a, b) => b[1] - a[1]);
  const consensus = sorted[0]?.[0] ?? round3[0]!.position;
  const totalWeight = sorted.reduce((s, [, w]) => s + w, 0);
  const consensusConfidence = totalWeight > 0 ? (sorted[0]?.[1] ?? 0) / totalWeight : 0;

  // Minority report: position con menor weight pero confidence alta
  const dissenters = round3.filter((o) => o.position !== consensus && o.confidence > 0.7);
  const minorityReport =
    dissenters.length > 0
      ? { role: dissenters[0]!.role, position: dissenters[0]!.position, reasoning: dissenters[0]!.reasoning }
      : null;

  const dissentCount = round3.filter((o) => o.position !== consensus).length;

  const decision: CouncilDecision = {
    decisionId,
    brandId,
    question,
    context,
    rounds: [...round1, ...round2, ...round3],
    consensus,
    consensusConfidence,
    minorityReport,
    dissentCount: dissentCount,
    shippedAction: consensusConfidence > 0.6 ? consensus : 'requires-human-review',
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(COUNCIL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(COUNCIL_DIR, `${brandId}-${decisionId}.json`),
    JSON.stringify(decision, null, 2),
    'utf-8',
  );
  log.info('[multiAgentCouncil] decision', {
    brandId,
    decisionId,
    confidence: consensusConfidence.toFixed(2),
    dissent: dissentCount,
  });
  return decision;
};

export const getCouncilHistory = async (brandId: string, limit = 20): Promise<CouncilDecision[]> => {
  try {
    const files = await fs.readdir(COUNCIL_DIR);
    const brandFiles = files.filter((f) => f.startsWith(brandId)).slice(-limit);
    const decisions: CouncilDecision[] = [];
    for (const f of brandFiles) {
      decisions.push(JSON.parse(await fs.readFile(path.join(COUNCIL_DIR, f), 'utf-8')) as CouncilDecision);
    }
    return decisions.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch {
    return [];
  }
};
