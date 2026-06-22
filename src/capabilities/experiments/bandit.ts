/**
 * Thompson Sampling Bandit — el sistema aprende qué funciona y converge solo
 * ─────────────────────────────────────────────────────────────────────────
 * Cada "experimento" (ej: patrón de hook, formato, horario) tiene brazos.
 * Cada brazo es una Beta(α,β) Bernoulli: α = éxitos+1, β = fracasos+1.
 * `pickArm` muestrea cada Beta y elige el brazo con la muestra más alta
 * (Thompson Sampling): explora lo incierto y explota lo que rinde, sin
 * hiperparámetros. Se alimenta de los outcomes del reasoning-trace, así el
 * sistema mejora con su propia evidencia — sin LLM, determinista y barato.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { listTraces } from '../reasoningTrace/index.js';

interface Arm {
  id: string;
  alpha: number;
  beta: number;
  pulls: number;
}
interface Bandit {
  id: string;
  arms: Record<string, Arm>;
  updatedAt: string;
}
interface Store {
  bandits: Record<string, Bandit>;
  processedTraceIds: string[];
}

const PATH = resolve('data/runtime/bandits.json');
const PROCESSED_MAX = 4000;

const read = (): Store => {
  if (!existsSync(PATH)) return { bandits: {}, processedTraceIds: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
  } catch {
    return { bandits: {}, processedTraceIds: [] };
  }
};
const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.processedTraceIds.length > PROCESSED_MAX) {
    s.processedTraceIds.splice(0, s.processedTraceIds.length - PROCESSED_MAX);
  }
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const arm = (b: Bandit, id: string): Arm => {
  let a = b.arms[id];
  if (!a) {
    a = { id, alpha: 1, beta: 1, pulls: 0 };
    b.arms[id] = a;
  }
  return a;
};
const bandit = (s: Store, id: string): Bandit => {
  let b = s.bandits[id];
  if (!b) {
    b = { id, arms: {}, updatedAt: new Date().toISOString() };
    s.bandits[id] = b;
  }
  return b;
};

// ── Muestreo Gamma (Marsaglia–Tsang) → Beta = G(α)/(G(α)+G(β)) ────────────
const randn = (): number => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const gammaSample = (k: number): number => {
  if (k < 1) return gammaSample(k + 1) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let vv = 0;
    do {
      x = randn();
      vv = 1 + c * x;
    } while (vv <= 0);
    vv = vv * vv * vv;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * vv;
    if (Math.log(u) < 0.5 * x * x + d * (1 - vv + Math.log(vv))) return d * vv;
  }
};
const betaSample = (a: number, b: number): number => {
  const x = gammaSample(a);
  const y = gammaSample(b);
  return x / (x + y);
};

/** Elige el mejor brazo por Thompson Sampling. Crea brazos nuevos si hace falta. */
export const pickArm = (
  experimentId: string,
  armIds: string[],
): {
  armId: string;
  sampled: number;
  reason: string;
} => {
  if (armIds.length === 0) throw new Error('pickArm: sin brazos');
  const s = read();
  const b = bandit(s, experimentId);
  let best = armIds[0]!;
  let bestSample = -1;
  for (const id of armIds) {
    const a = arm(b, id);
    const sample = betaSample(a.alpha, a.beta);
    if (sample > bestSample) {
      bestSample = sample;
      best = id;
    }
  }
  arm(b, best).pulls += 1;
  b.updatedAt = new Date().toISOString();
  write(s);
  return {
    armId: best,
    sampled: Number(bestSample.toFixed(3)),
    reason: `Thompson sampling sobre ${armIds.length} brazos de "${experimentId}"`,
  };
};

/** Actualiza un brazo con el resultado observado. */
export const rewardArm = (experimentId: string, armId: string, success: boolean): void => {
  const s = read();
  const a = arm(bandit(s, experimentId), armId);
  if (success) a.alpha += 1;
  else a.beta += 1;
  s.bandits[experimentId]!.updatedAt = new Date().toISOString();
  write(s);
};

export interface ArmStat {
  armId: string;
  mean: number;
  pulls: number;
  alpha: number;
  beta: number;
}
export const banditStats = (
  experimentId: string,
): {
  experimentId: string;
  arms: ArmStat[];
  best?: string;
} => {
  const b = read().bandits[experimentId];
  if (!b) return { experimentId, arms: [] };
  const arms = Object.values(b.arms)
    .map((a) => ({
      armId: a.id,
      mean: Number((a.alpha / (a.alpha + a.beta)).toFixed(3)),
      pulls: a.pulls,
      alpha: a.alpha,
      beta: a.beta,
    }))
    .sort((x, y) => y.mean - x.mean);
  return { experimentId, arms, best: arms[0]?.armId };
};

export const listBandits = (): string[] => Object.keys(read().bandits);

/**
 * Sincroniza los bandits con los outcomes del reasoning-trace.
 * Cada traza con outcome se mapea a (experimento=decisionType, brazo=chosen)
 * y ranking 'better' → éxito. Idempotente: no re-procesa trazas ya vistas.
 */
export const syncBanditsFromTraces = (
  brandId?: string,
): {
  processed: number;
  skipped: number;
} => {
  const s = read();
  const seen = new Set(s.processedTraceIds);
  const traces = listTraces({ brandId, withOutcomeOnly: true, limit: 1000 });
  let processed = 0;
  for (const t of traces) {
    if (seen.has(t.id) || !t.outcome) continue;
    const b = bandit(s, t.decisionType);
    const a = arm(b, t.chosen || 'desconocido');
    if (t.outcome.ranking === 'better') a.alpha += 1;
    else if (t.outcome.ranking === 'worse') a.beta += 1;
    else {
      a.alpha += 0.5;
      a.beta += 0.5;
    }
    b.updatedAt = new Date().toISOString();
    s.processedTraceIds.push(t.id);
    seen.add(t.id);
    processed += 1;
  }
  write(s);
  return { processed, skipped: traces.length - processed };
};
