// @ts-nocheck
/**
 * Cross-User Knowledge — knowledge graph agregado y privacy-safe.
 *
 * Cuando muchos users usan FeedIA, el cerebro aprende patrones colectivos:
 *   - Qué tipos de prompts producen mejores outcomes (cross-user)
 *   - Qué hooks funcionan en qué nichos
 *   - Qué horarios de publicación rinden en qué regiones
 *   - Qué léxico/expresiones están "in" vs "out"
 *
 * Reglas de privacidad:
 *   - Solo agrega datos cuando hay >= N users contribuyendo (N=5 default)
 *   - Nunca expone PII (ni email, ni handle real, ni brand name)
 *   - Solo expone patrones generalizados
 *   - Users pueden opt-out via consent flag
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const CROSS_DIR = path.resolve('data/neural/cross-user');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AnonymizedSignal {
  signalId: string; // hash, no userId
  nicheCategory: string;
  brandTypeAnonymous: string; // 'empresa-pequena' | 'creator-mid' | etc
  region: string;
  signal: {
    type: 'prompt-pattern' | 'output-quality' | 'engagement-outcome' | 'lexicon';
    payload: Record<string, unknown>;
    outcome: 'success' | 'neutral' | 'failure';
    rewardScore: number;
  };
  timestamp: string;
}

export interface CrossUserPattern {
  id: string;
  patternType:
    | 'prompt-template'
    | 'hook-formula'
    | 'time-of-day'
    | 'lexicon-trend'
    | 'format-preference'
    | 'business-model-insight';
  description: string;
  contributorCount: number; // cuántos users distintos contribuyeron
  successRate: number; // % de outcomes positivos
  nicheCategories: string[]; // dónde aplica
  regions: string[];
  detectedAt: string;
  lastReinforced: string;
  examples: string[]; // ejemplos anonimizados
  contraindications: string[]; // cuándo NO aplica
  confidence: number; // 0-1
}

export interface CrossUserBrainState {
  totalAnonymousSignals: number;
  totalContributors: number;
  patterns: CrossUserPattern[];
  lastConsolidation: string;
  optedInUsers: number;
  optedOutUsers: number;
}

// ── Anonymization ────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

const anonymizeUserId = (userId: string, salt: string): string => {
  return createHash('sha256').update(`${userId}:${salt}`).digest('hex').slice(0, 16);
};

const generalizeBrandType = (brand: { type?: string; followersTier?: string }): string => {
  const type = brand.type ?? 'empresa';
  const tier = brand.followersTier ?? 'small';
  return `${type}-${tier}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureCrossDir = async (): Promise<void> => {
  await fs.mkdir(CROSS_DIR, { recursive: true });
};

const SIGNALS_FILE = path.join(CROSS_DIR, 'anonymized-signals.json');
const PATTERNS_FILE = path.join(CROSS_DIR, 'cross-user-patterns.json');
const STATE_FILE = path.join(CROSS_DIR, 'state.json');

const loadAnonymizedSignals = async (): Promise<AnonymizedSignal[]> => {
  try {
    return JSON.parse(await fs.readFile(SIGNALS_FILE, 'utf-8')) as AnonymizedSignal[];
  } catch {
    return [];
  }
};

const saveAnonymizedSignals = async (signals: AnonymizedSignal[]): Promise<void> => {
  await ensureCrossDir();
  // Cap a 100K signals para evitar explosión
  await fs.writeFile(SIGNALS_FILE, JSON.stringify(signals.slice(-100_000), null, 2), 'utf-8');
};

// ── API ───────────────────────────────────────────────────────────────────────

const SALT = process.env['CROSS_USER_SALT'] ?? 'feedia-default-salt';
const MIN_CONTRIBUTORS = 5;

/** Captura signal anonimizado. Solo se llama si user opted-in. */
export const contributeSignal = async (
  userId: string,
  brand: { type?: string; followersTier?: string; industryCategory?: string; region?: string },
  signal: AnonymizedSignal['signal'],
): Promise<void> => {
  const signals = await loadAnonymizedSignals();
  signals.push({
    signalId: anonymizeUserId(userId, SALT) + '-' + Date.now(),
    nicheCategory: brand.industryCategory ?? 'general',
    brandTypeAnonymous: generalizeBrandType(brand),
    region: brand.region ?? 'unknown',
    signal,
    timestamp: new Date().toISOString(),
  });
  await saveAnonymizedSignals(signals);
};

/** Consolida signals → patterns con threshold de contributors. */
export const consolidateCrossUserPatterns = async (): Promise<CrossUserPattern[]> => {
  const signals = await loadAnonymizedSignals();
  if (signals.length < 50) {
    log.info('[crossUser] insufficient signals for consolidation', { count: signals.length });
    return [];
  }

  log.info('[crossUser] consolidating', { signals: signals.length });

  // Agrupar signals por niche
  const byNiche: Record<string, AnonymizedSignal[]> = {};
  for (const s of signals) {
    byNiche[s.nicheCategory] = byNiche[s.nicheCategory] ?? [];
    byNiche[s.nicheCategory]!.push(s);
  }

  const allPatterns: CrossUserPattern[] = [];

  for (const [niche, nicheSignals] of Object.entries(byNiche)) {
    // Contar contribuidores únicos (por signal prefix antes del timestamp)
    const contributors = new Set(nicheSignals.map((s) => s.signalId.split('-')[0]));
    if (contributors.size < MIN_CONTRIBUTORS) continue;

    // Calcular successRate
    const successes = nicheSignals.filter((s) => s.signal.outcome === 'success').length;
    const successRate = successes / nicheSignals.length;

    // Pedir a Claude que extraiga patterns
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: `Analista de patrones cross-user. Extraés reglas generalizables desde signals anonimizados.
Privacy first: nunca menciones identificadores individuales, solo patrones agregados.`,
      messages: [
        {
          role: 'user',
          content: `Analizá ${nicheSignals.length} signals anonimizados del nicho "${niche}" (${contributors.size} contribuidores únicos).

Sample de signals:
${nicheSignals
  .slice(0, 30)
  .map(
    (s) =>
      `- ${s.signal.type} | outcome: ${s.signal.outcome} | reward: ${s.signal.rewardScore.toFixed(2)} | payload: ${JSON.stringify(s.signal.payload).slice(0, 200)}`,
  )
  .join('\n')}

Extraé 3-7 cross-user patterns reales:
{
  "patterns": [{
    "patternType": "prompt-template|hook-formula|time-of-day|lexicon-trend|format-preference|business-model-insight",
    "description": "regla generalizada",
    "successRate": 0-1,
    "examples": ["ejemplo anonimizado 1", "ejemplo 2"],
    "contraindications": ["cuándo NO usar este pattern"],
    "confidence": 0-1
  }]
}`,
        },
      ],
    });

    const msg = await stream.finalMessage();
    const textBlock = msg.content.find((b) => b.type === 'text');
    const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) continue;

    const result = JSON.parse(jsonMatch[0]) as {
      patterns: Omit<
        CrossUserPattern,
        'id' | 'contributorCount' | 'nicheCategories' | 'regions' | 'detectedAt' | 'lastReinforced'
      >[];
    };
    for (const p of result.patterns) {
      allPatterns.push({
        ...p,
        id: `xup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contributorCount: contributors.size,
        nicheCategories: [niche],
        regions: [...new Set(nicheSignals.map((s) => s.region))],
        detectedAt: new Date().toISOString(),
        lastReinforced: new Date().toISOString(),
        successRate: p.successRate ?? successRate,
      });
    }
  }

  await ensureCrossDir();
  let existing: CrossUserPattern[] = [];
  try {
    existing = JSON.parse(await fs.readFile(PATTERNS_FILE, 'utf-8')) as CrossUserPattern[];
  } catch {
    /* noop */
  }
  // Merge: refuerza existentes si re-aparecen, agrega nuevos
  const merged = mergePatterns(existing, allPatterns);
  await fs.writeFile(PATTERNS_FILE, JSON.stringify(merged, null, 2), 'utf-8');

  // Update state
  await updateState({
    totalAnonymousSignals: signals.length,
    totalContributors: new Set(signals.map((s) => s.signalId.split('-')[0])).size,
    patterns: merged,
    lastConsolidation: new Date().toISOString(),
  });

  log.info('[crossUser] consolidation done', { newPatterns: allPatterns.length, totalPatterns: merged.length });
  return merged;
};

const mergePatterns = (existing: CrossUserPattern[], fresh: CrossUserPattern[]): CrossUserPattern[] => {
  const result = [...existing];
  for (const f of fresh) {
    const match = result.find(
      (e) =>
        e.patternType === f.patternType &&
        e.description.toLowerCase().includes(f.description.toLowerCase().split(' ').slice(0, 4).join(' ')),
    );
    if (match) {
      // Refuerza confidence y contributors
      match.confidence = Math.min(1, match.confidence + 0.05);
      match.contributorCount = Math.max(match.contributorCount, f.contributorCount);
      match.lastReinforced = new Date().toISOString();
      match.successRate = (match.successRate + f.successRate) / 2;
    } else {
      result.push(f);
    }
  }
  return result.slice(-500); // cap a 500 patterns totales
};

const updateState = async (partial: Partial<CrossUserBrainState>): Promise<void> => {
  let state: CrossUserBrainState;
  try {
    state = JSON.parse(await fs.readFile(STATE_FILE, 'utf-8')) as CrossUserBrainState;
  } catch {
    state = {
      totalAnonymousSignals: 0,
      totalContributors: 0,
      patterns: [],
      lastConsolidation: '',
      optedInUsers: 0,
      optedOutUsers: 0,
    };
  }
  Object.assign(state, partial);
  await ensureCrossDir();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
};

export const getCrossUserState = async (): Promise<CrossUserBrainState> => {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf-8')) as CrossUserBrainState;
  } catch {
    return {
      totalAnonymousSignals: 0,
      totalContributors: 0,
      patterns: [],
      lastConsolidation: '',
      optedInUsers: 0,
      optedOutUsers: 0,
    };
  }
};

export const getCrossUserPatterns = async (
  filter: { niche?: string; minContributors?: number; minConfidence?: number } = {},
): Promise<CrossUserPattern[]> => {
  const state = await getCrossUserState();
  return state.patterns.filter((p) => {
    if (filter.niche && !p.nicheCategories.includes(filter.niche)) return false;
    if (filter.minContributors && p.contributorCount < filter.minContributors) return false;
    if (filter.minConfidence && p.confidence < filter.minConfidence) return false;
    return true;
  });
};

/** Inyecta patterns cross-user en prompt — privacy-safe. */
export const buildCrossUserEnrichment = async (niche: string): Promise<string> => {
  const patterns = await getCrossUserPatterns({ niche, minContributors: MIN_CONTRIBUTORS, minConfidence: 0.6 });
  if (patterns.length === 0) return '';

  const parts: string[] = ['[INTELIGENCIA COLECTIVA — agregado anónimo de otros users]'];
  for (const p of patterns.slice(0, 5)) {
    parts.push(
      `- [${p.patternType}] ${p.description} (${(p.successRate * 100).toFixed(0)}% éxito, ${p.contributorCount} contribuidores)`,
    );
  }
  parts.push('[FIN INTELIGENCIA COLECTIVA]');
  return parts.join('\n');
};

/** Opt-in/out tracking. */
export const setUserConsent = async (userId: string, optedIn: boolean): Promise<void> => {
  const state = await getCrossUserState();
  if (optedIn) state.optedInUsers++;
  else state.optedOutUsers++;
  await updateState(state);
  log.info('[crossUser] consent updated', { userId: anonymizeUserId(userId, SALT), optedIn });
};
