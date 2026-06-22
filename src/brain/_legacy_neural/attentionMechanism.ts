// @ts-nocheck
/**
 * Attention Mechanism — Capa de atención multi-head.
 *
 * Simula el mecanismo de atención de transformers:
 *   - Multi-head attention sobre features de entrada
 *   - Pesos de atención calculados dinámicamente
 *   - Foco selectivo en señales más relevantes
 *
 * Permite que FeedIA "preste atención" a las features más importantes
 * de cada situación en vez de pesarlas igual.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const ATTENTION_DIR = path.resolve('data/neural/attention');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AttentionHead {
  headId: number;
  query: number[];
  key: number[];
  value: number[];
  attentionWeights: number[]; // peso por feature
  output: number[];
}

export interface AttentionLayer {
  name: string;
  inputDim: number;
  numHeads: number;
  headDim: number;
  heads: AttentionHead[];
  aggregatedOutput: number[];
  focusedFeatures: Array<{ featureName: string; weight: number; rank: number }>;
}

export interface FeatureVector {
  name: string;
  values: number[]; // valores normalizados [0,1]
  featureNames: string[]; // nombres de cada dimensión
}

// ── Operaciones matemáticas ───────────────────────────────────────────────────

const dotProduct = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
};

const scaledDotProductAttention = (
  query: number[],
  key: number[],
  value: number[],
): { weights: number[]; output: number[] } => {
  // Atención = softmax(QK^T / sqrt(d_k)) * V
  const scale = Math.sqrt(key.length);
  const scores = value.map((_, i) => dotProduct(query, [key[i] ?? 0]) / scale);

  // Softmax
  const maxScore = Math.max(...scores);
  const expScores = scores.map((s) => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const weights = expScores.map((e) => e / sumExp);

  // Output = weights * value
  const output = value.map((v, i) => v * (weights[i] ?? 0));
  return { weights, output };
};

// ── Inicialización de pesos ───────────────────────────────────────────────────

const initRandomMatrix = (dim: number, seed = 0): number[] => {
  return Array.from({ length: dim }, (_, i) => {
    // Pseudo-random determinístico
    const x = Math.sin(seed + i * 1.7) * 10000;
    return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
  });
};

// ── Multi-head attention ──────────────────────────────────────────────────────

/** Procesa input a través de capa multi-head attention. */
export const runMultiHeadAttention = (input: FeatureVector, numHeads = 4): AttentionLayer => {
  const inputDim = input.values.length;
  const headDim = Math.max(1, Math.floor(inputDim / numHeads));

  const heads: AttentionHead[] = [];

  for (let h = 0; h < numHeads; h++) {
    // Cada head usa una proyección distinta (simulada con seed diferente)
    const queryProj = initRandomMatrix(inputDim, h * 100);
    const keyProj = initRandomMatrix(inputDim, h * 100 + 50);
    const valueProj = initRandomMatrix(inputDim, h * 100 + 25);

    const query = input.values.map((v, i) => v * (queryProj[i] ?? 1));
    const key = input.values.map((v, i) => v * (keyProj[i] ?? 1));
    const value = input.values.map((v, i) => v * (valueProj[i] ?? 1));

    const { weights, output } = scaledDotProductAttention(query, key, value);

    heads.push({
      headId: h,
      query,
      key,
      value,
      attentionWeights: weights,
      output,
    });
  }

  // Agregar outputs de todos los heads (mean)
  const aggregatedOutput = input.values.map((_, i) => {
    const sum = heads.reduce((s, h) => s + (h.output[i] ?? 0), 0);
    return sum / numHeads;
  });

  // Features con mayor atención (promediadas across heads)
  const meanWeights = input.values.map((_, i) => {
    return heads.reduce((s, h) => s + (h.attentionWeights[i] ?? 0), 0) / numHeads;
  });

  const focusedFeatures = meanWeights
    .map((w, i) => ({ featureName: input.featureNames[i] ?? `feat_${i}`, weight: w, rank: 0 }))
    .sort((a, b) => b.weight - a.weight)
    .map((f, idx) => ({ ...f, rank: idx + 1 }));

  return {
    name: input.name,
    inputDim,
    numHeads,
    headDim,
    heads,
    aggregatedOutput,
    focusedFeatures,
  };
};

/** Persiste estado de capa de atención para análisis. */
export const saveAttentionState = async (brandId: string, layer: AttentionLayer): Promise<void> => {
  await fs.mkdir(ATTENTION_DIR, { recursive: true });
  const file = path.join(ATTENTION_DIR, `${brandId}-attention.json`);
  let states: AttentionLayer[] = [];
  try {
    states = JSON.parse(await fs.readFile(file, 'utf-8')) as AttentionLayer[];
  } catch {
    /* noop */
  }
  states.push(layer);
  await fs.writeFile(file, JSON.stringify(states.slice(-100), null, 2), 'utf-8');
};

/** Obtiene los top-N features más atendidos del último ciclo. */
export const getTopAttendedFeatures = (
  layer: AttentionLayer,
  topN = 3,
): Array<{ featureName: string; weight: number }> => {
  return layer.focusedFeatures.slice(0, topN).map(({ featureName, weight }) => ({ featureName, weight }));
};

/** Combina varias capas de atención en cascada. */
export const stackAttentionLayers = (input: FeatureVector, layerCount = 2, numHeads = 4): AttentionLayer[] => {
  const layers: AttentionLayer[] = [];
  let currentInput = input;

  for (let l = 0; l < layerCount; l++) {
    const layer = runMultiHeadAttention(currentInput, numHeads);
    layers.push(layer);

    // Output de esta capa se convierte en input de la siguiente
    currentInput = {
      name: `${input.name}-layer-${l + 1}`,
      values: layer.aggregatedOutput,
      featureNames: input.featureNames,
    };
  }

  return layers;
};

/** Detecta features anómalos (atención muy alta o muy baja). */
export const detectAnomalousFeatures = (
  layer: AttentionLayer,
  threshold = 2.0, // desviaciones estándar
): Array<{ featureName: string; weight: number; zScore: number }> => {
  const weights = layer.focusedFeatures.map((f) => f.weight);
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
  const variance = weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length;
  const stdDev = Math.sqrt(variance) || 1;

  return layer.focusedFeatures
    .map((f) => ({ ...f, zScore: (f.weight - mean) / stdDev }))
    .filter((f) => Math.abs(f.zScore) > threshold)
    .map(({ featureName, weight, zScore }) => ({ featureName, weight, zScore }));
};

log.info('[attentionMechanism] module loaded');
