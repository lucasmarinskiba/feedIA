// @ts-nocheck
/**
 * Value Alignment — guardrails éticos y brand-aligned.
 *
 * Cada acción del cerebro pasa por filter de valores antes de ejecutar:
 *   - Brand promise consistency
 *   - Ethical considerations (no deceptive, no manipulative)
 *   - Audience long-term wellbeing (no engagement bait dañino)
 *   - Cultural sensitivity
 *   - Legal compliance hints (FTC, GDPR)
 *
 * Bloquea o re-frame acciones que violen valores.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const VALUE_DIR = path.resolve('data/neural/value-alignment');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ValueDimension =
  | 'brand-promise'
  | 'honesty'
  | 'audience-wellbeing'
  | 'cultural-respect'
  | 'legal-compliance'
  | 'long-term-value'
  | 'inclusivity'
  | 'sustainability';

export interface BrandValues {
  brandId: string;
  promise: string; // qué la marca PROMETE entregar
  nonNegotiables: string[]; // valores que NO transaa
  audiencePrincples: string[]; // cómo trata audiencia
  redLines: string[]; // qué NUNCA hace
  preferredFraming: string[]; // cómo prefiere hablar
  prohibitedFraming: string[]; // cómo nunca hablaría
}

export interface AlignmentCheck {
  actionDescription: string;
  brandId: string;
  timestamp: string;
  overallScore: number; // 0-1 alignment
  dimensionScores: Record<ValueDimension, number>;
  violations: Array<{
    dimension: ValueDimension;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  recommendation: 'approve' | 'modify' | 'block' | 'escalate';
  suggestedRevisions: string[];
  reasoning: string;
}

// ── Setup brand values ───────────────────────────────────────────────────────

export const defineBrandValues = async (
  brand: BrandProfile,
  options: { customNonNegotiables?: string[] } = {},
): Promise<BrandValues> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: `Brand ethics advisor. Extraés valores explícitos + implícitos de una marca para guiar decisiones futuras.`,
    messages: [
      {
        role: 'user',
        content: `Definí brand values para ${brand.name}:

Nicho: ${brand.industryCategory ?? brand.niche ?? 'general'}
Tono: ${brand.voice?.tone?.join(', ') ?? 'profesional'}
Audiencia: ${brand.audience?.description ?? ''}
${options.customNonNegotiables?.length ? `Non-negotiables del user: ${options.customNonNegotiables.join('; ')}` : ''}

JSON: {
  "promise": "qué la marca promete entregar a audiencia",
  "nonNegotiables": ["valores que nunca transaa"],
  "audiencePrincples": ["cómo trata audiencia"],
  "redLines": ["qué NUNCA hace"],
  "preferredFraming": ["cómo prefiere hablar"],
  "prohibitedFraming": ["lenguaje que nunca usa"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<BrandValues>) : ({} as Partial<BrandValues>);

  const values: BrandValues = {
    brandId,
    promise: generated.promise ?? '',
    nonNegotiables: generated.nonNegotiables ?? [],
    audiencePrincples: generated.audiencePrincples ?? [],
    redLines: generated.redLines ?? [],
    preferredFraming: generated.preferredFraming ?? [],
    prohibitedFraming: generated.prohibitedFraming ?? [],
  };

  await fs.mkdir(VALUE_DIR, { recursive: true });
  await fs.writeFile(path.join(VALUE_DIR, `${brandId}-values.json`), JSON.stringify(values, null, 2), 'utf-8');
  log.info('[valueAlignment] values defined', { brandId });
  return values;
};

// ── Alignment check ─────────────────────────────────────────────────────────

export const checkAlignment = async (brand: BrandProfile, actionDescription: string): Promise<AlignmentCheck> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  let values: BrandValues;
  try {
    values = JSON.parse(await fs.readFile(path.join(VALUE_DIR, `${brandId}-values.json`), 'utf-8')) as BrandValues;
  } catch {
    values = await defineBrandValues(brand);
  }

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: `Ethics + brand alignment auditor.
Evaluás cada acción en 8 dimensiones de valor.
Sos firme con violations pero pragmático: bloqueás solo lo realmente problemático.`,
    messages: [
      {
        role: 'user',
        content: `Chequeá alignment de esta acción para ${brand.name}:

ACCIÓN: "${actionDescription}"

BRAND VALUES:
- Promise: ${values.promise}
- Non-negotiables: ${values.nonNegotiables.join('; ')}
- Red lines: ${values.redLines.join('; ')}
- Prohibited framing: ${values.prohibitedFraming.join('; ')}

Evalúa en 8 dimensiones (0-1):
- brand-promise: consistencia con promise
- honesty: no engañoso
- audience-wellbeing: bueno para audiencia long-term
- cultural-respect: respetuoso culturalmente
- legal-compliance: cumple normas (FTC disclosure si ads, GDPR si data)
- long-term-value: vs short-term hack
- inclusivity: no excluyente / discriminatorio
- sustainability: no daña reputation futura

JSON: {
  "overallScore": 0-1,
  "dimensionScores": {
    "brand-promise": 0-1,
    "honesty": 0-1,
    "audience-wellbeing": 0-1,
    "cultural-respect": 0-1,
    "legal-compliance": 0-1,
    "long-term-value": 0-1,
    "inclusivity": 0-1,
    "sustainability": 0-1
  },
  "violations": [{ "dimension": "...", "severity": "critical|high|medium|low", "description": "qué viola" }],
  "recommendation": "approve|modify|block|escalate",
  "suggestedRevisions": ["cómo mejorar"],
  "reasoning": "explicación breve"
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[valueAlignment] No check');

  const generated = JSON.parse(jsonMatch[0]) as Partial<AlignmentCheck>;
  const check: AlignmentCheck = {
    actionDescription,
    brandId,
    timestamp: new Date().toISOString(),
    overallScore: generated.overallScore ?? 0.5,
    dimensionScores: generated.dimensionScores ?? ({} as Record<ValueDimension, number>),
    violations: generated.violations ?? [],
    recommendation: generated.recommendation ?? 'modify',
    suggestedRevisions: generated.suggestedRevisions ?? [],
    reasoning: generated.reasoning ?? '',
  };

  // Persist history
  const file = path.join(VALUE_DIR, `${brandId}-checks.json`);
  let history: AlignmentCheck[] = [];
  try {
    history = JSON.parse(await fs.readFile(file, 'utf-8')) as AlignmentCheck[];
  } catch {
    /* noop */
  }
  history.push(check);
  await fs.writeFile(file, JSON.stringify(history.slice(-200), null, 2), 'utf-8');

  log.info('[valueAlignment] check done', {
    brandId,
    score: check.overallScore.toFixed(2),
    recommendation: check.recommendation,
  });
  return check;
};

export const getBrandValues = async (brandId: string): Promise<BrandValues | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(VALUE_DIR, `${brandId}-values.json`), 'utf-8')) as BrandValues;
  } catch {
    return null;
  }
};

export const getRecentChecks = async (brandId: string, limit = 20): Promise<AlignmentCheck[]> => {
  try {
    const all = JSON.parse(
      await fs.readFile(path.join(VALUE_DIR, `${brandId}-checks.json`), 'utf-8'),
    ) as AlignmentCheck[];
    return all.slice(-limit).reverse();
  } catch {
    return [];
  }
};
