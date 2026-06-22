// @ts-nocheck
/**
 * Dropout Layer — Regularización para robustez del modelo.
 *
 * Apaga aleatoriamente un % de neuronas durante entrenamiento.
 * Previene overfitting y fuerza al sistema a no depender de features individuales.
 *
 * También implementa:
 *   - Stochastic Depth (apagar capas completas con probabilidad)
 *   - Noise Injection (agregar ruido gaussiano controlado)
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DropoutConfig {
  rate: number; // % de neuronas a apagar (0-1)
  mode: 'training' | 'inference';
  seed?: number;
}

export interface DropoutResult {
  output: number[];
  mask: boolean[]; // qué neuronas fueron apagadas
  effectiveRate: number; // % real apagado (puede variar por azar)
  scalingFactor: number; // factor de escala aplicado (1 / (1 - rate))
}

export interface NoiseConfig {
  mean: number;
  stdDev: number;
  type: 'gaussian' | 'uniform' | 'salt-pepper';
}

// ── Random helpers ────────────────────────────────────────────────────────────

let rngSeed = Date.now();

const setSeed = (seed: number): void => {
  rngSeed = seed;
};

const random = (): number => {
  rngSeed = (rngSeed * 9301 + 49297) % 233280;
  return rngSeed / 233280;
};

const gaussianRandom = (mean = 0, stdDev = 1): number => {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// ── Dropout ───────────────────────────────────────────────────────────────────

/** Aplica dropout al vector de input. */
export const applyDropout = (input: number[], config: DropoutConfig): DropoutResult => {
  if (config.seed !== undefined) setSeed(config.seed);

  // En inference no aplica dropout, solo escala
  if (config.mode === 'inference') {
    return {
      output: [...input],
      mask: new Array(input.length).fill(true),
      effectiveRate: 0,
      scalingFactor: 1,
    };
  }

  const mask = input.map(() => random() > config.rate);
  // Scaling: inverted dropout — multiplicar valores activos por 1/(1-rate)
  const scalingFactor = config.rate < 1 ? 1 / (1 - config.rate) : 0;
  const output = input.map((v, i) => (mask[i] ? v * scalingFactor : 0));
  const droppedCount = mask.filter((m) => !m).length;

  return {
    output,
    mask,
    effectiveRate: droppedCount / input.length,
    scalingFactor,
  };
};

/** Dropout adaptativo: aumenta rate si el modelo está overfitting. */
export const adaptiveDropout = (
  input: number[],
  trainingLoss: number,
  validationLoss: number,
  baseRate = 0.2,
): DropoutResult => {
  // Si valLoss >> trainLoss → overfitting → más dropout
  const overfitRatio = validationLoss / Math.max(trainingLoss, 0.001);
  const adaptedRate = Math.min(0.6, Math.max(0.05, baseRate * overfitRatio));

  log.info('[dropout] adaptive rate', { baseRate, adaptedRate, overfitRatio });
  return applyDropout(input, { rate: adaptedRate, mode: 'training' });
};

// ── Stochastic Depth (apagar capas completas) ────────────────────────────────

/** Decide si una capa entera se "salta" en este pass. */
export const stochasticDepth = (layerIndex: number, totalLayers: number, baseDropProb = 0.1): boolean => {
  // Capas más profundas tienen mayor probabilidad de drop (linear schedule)
  const dropProb = baseDropProb * (layerIndex / totalLayers);
  return random() < dropProb;
};

// ── Noise Injection ───────────────────────────────────────────────────────────

/** Inyecta ruido al input para forzar robustez. */
export const injectNoise = (input: number[], config: NoiseConfig): number[] => {
  switch (config.type) {
    case 'gaussian':
      return input.map((v) => v + gaussianRandom(config.mean, config.stdDev));
    case 'uniform':
      return input.map((v) => v + (random() * 2 - 1) * config.stdDev + config.mean);
    case 'salt-pepper': {
      const prob = config.stdDev; // usamos stdDev como probabilidad de corrupción
      return input.map((v) => {
        if (random() < prob / 2) return 0; // pepper (apagar)
        if (random() < prob / 2) return 1; // salt (saturar)
        return v;
      });
    }
  }
};

/** Estima robustez del modelo: cuánto cambia la salida con ruido. */
export const estimateRobustness = (
  modelFn: (input: number[]) => number[],
  input: number[],
  trials = 20,
  noiseStdDev = 0.1,
): { meanDeviation: number; maxDeviation: number; robustnessScore: number } => {
  const baseline = modelFn(input);
  const deviations: number[] = [];

  for (let t = 0; t < trials; t++) {
    const noisy = injectNoise(input, { mean: 0, stdDev: noiseStdDev, type: 'gaussian' });
    const noisyOutput = modelFn(noisy);
    const dev = baseline.reduce((sum, b, i) => sum + Math.abs(b - (noisyOutput[i] ?? 0)), 0);
    deviations.push(dev);
  }

  const meanDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const maxDev = Math.max(...deviations);
  // Score: 1 - (deviation normalizado). 1 = totalmente robusto, 0 = muy sensible
  const robustnessScore = Math.max(0, 1 - meanDev / Math.max(...baseline.map(Math.abs), 1));

  return { meanDeviation: meanDev, maxDeviation: maxDev, robustnessScore };
};

log.info('[dropoutLayer] regularization module loaded');
