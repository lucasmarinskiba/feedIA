// @ts-nocheck
/**
 * Recurrent Neuron — Neurona recurrente (LSTM simplificada).
 *
 * Mantiene estado oculto a través del tiempo para procesar secuencias:
 *   - Decisiones que dependen del historial reciente
 *   - Tendencias temporales (ej: 5 posts seguidos con engagement bajo)
 *   - Predicción de próxima acción basada en secuencia previa
 *
 * Simula compuertas LSTM: forget gate, input gate, output gate.
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RecurrentCell {
  hiddenState: number[]; // h_t
  cellState: number[]; // c_t (memoria a largo plazo de LSTM)
  inputDim: number;
  hiddenDim: number;
  timestep: number;
}

export interface SequenceInput {
  timestep: number;
  features: number[]; // input en este timestep
  label?: string; // descripción opcional
}

export interface RecurrentOutput {
  finalState: RecurrentCell;
  outputs: number[][]; // h_t para cada timestep
  predictions: number[]; // predicción final
  importantTimesteps: Array<{ timestep: number; influence: number; label?: string }>;
}

// ── Activaciones ──────────────────────────────────────────────────────────────

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const tanh = (x: number): number => Math.tanh(x);

// ── LSTM gates ────────────────────────────────────────────────────────────────

/** Forget gate: qué olvidar del cellState anterior. */
const forgetGate = (input: number[], hiddenPrev: number[]): number[] => {
  return input.map((x, i) => sigmoid(x + (hiddenPrev[i] ?? 0)));
};

/** Input gate: qué información nueva agregar al cellState. */
const inputGate = (input: number[], hiddenPrev: number[]): number[] => {
  return input.map((x, i) => sigmoid(x + (hiddenPrev[i] ?? 0)));
};

/** Candidate cell state: nueva info candidata. */
const candidateState = (input: number[], hiddenPrev: number[]): number[] => {
  return input.map((x, i) => tanh(x + (hiddenPrev[i] ?? 0)));
};

/** Output gate: qué del cellState exponer como hiddenState. */
const outputGate = (input: number[], hiddenPrev: number[]): number[] => {
  return input.map((x, i) => sigmoid(x + (hiddenPrev[i] ?? 0)));
};

// ── Step de LSTM ──────────────────────────────────────────────────────────────

/** Un paso de la LSTM: cellState_t = forget * cellState_{t-1} + input * candidate */
export const lstmStep = (input: number[], prevCell: RecurrentCell): RecurrentCell => {
  const { hiddenState: hPrev, cellState: cPrev } = prevCell;

  const f = forgetGate(input, hPrev);
  const i = inputGate(input, hPrev);
  const cTilde = candidateState(input, hPrev);
  const o = outputGate(input, hPrev);

  // Update cell state: c_t = f * c_{t-1} + i * c~
  const cNew = cPrev.map((c, idx) => (f[idx] ?? 0) * c + (i[idx] ?? 0) * (cTilde[idx] ?? 0));

  // Update hidden state: h_t = o * tanh(c_t)
  const hNew = cNew.map((c, idx) => (o[idx] ?? 0) * tanh(c));

  return {
    hiddenState: hNew,
    cellState: cNew,
    inputDim: input.length,
    hiddenDim: hNew.length,
    timestep: prevCell.timestep + 1,
  };
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Inicializa una celda recurrente vacía. */
export const initRecurrentCell = (dim: number): RecurrentCell => ({
  hiddenState: new Array(dim).fill(0),
  cellState: new Array(dim).fill(0),
  inputDim: dim,
  hiddenDim: dim,
  timestep: 0,
});

/** Procesa una secuencia completa de inputs a través del LSTM. */
export const processSequence = (sequence: SequenceInput[]): RecurrentOutput => {
  if (sequence.length === 0) {
    return {
      finalState: initRecurrentCell(0),
      outputs: [],
      predictions: [],
      importantTimesteps: [],
    };
  }

  const dim = sequence[0]!.features.length;
  let cell = initRecurrentCell(dim);
  const outputs: number[][] = [];

  for (const step of sequence) {
    cell = lstmStep(step.features, cell);
    outputs.push([...cell.hiddenState]);
  }

  // Predicción final: hidden state final
  const predictions = cell.hiddenState;

  // Identificar timesteps importantes (mayor influencia en el estado final)
  const importantTimesteps = sequence
    .map((step, idx) => {
      const stepOutput = outputs[idx] ?? [];
      const magnitude = Math.sqrt(stepOutput.reduce((s, v) => s + v ** 2, 0));
      return { timestep: step.timestep, influence: magnitude, label: step.label };
    })
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 5);

  return {
    finalState: cell,
    outputs,
    predictions,
    importantTimesteps,
  };
};

/** Predice próximo valor de la secuencia (autoregresión). */
export const predictNext = (sequence: SequenceInput[], steps = 1): number[][] => {
  const { finalState, predictions } = processSequence(sequence);
  const dim = predictions.length;
  const futurePredictions: number[][] = [predictions];

  let currentCell = finalState;
  for (let s = 1; s < steps; s++) {
    // Usar predicción anterior como input
    const lastPred = futurePredictions[s - 1] ?? new Array(dim).fill(0);
    currentCell = lstmStep(lastPred, currentCell);
    futurePredictions.push([...currentCell.hiddenState]);
  }

  return futurePredictions;
};

/** Detecta tendencias en la secuencia (creciente, decreciente, estable, volátil). */
export const detectTrend = (
  sequence: SequenceInput[],
): {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  volatility: number;
} => {
  if (sequence.length < 3) return { direction: 'stable', slope: 0, volatility: 0 };

  // Magnitud por timestep
  const magnitudes = sequence.map((s) => Math.sqrt(s.features.reduce((sum, v) => sum + v ** 2, 0)));

  // Slope (regresión lineal simple)
  const n = magnitudes.length;
  const xMean = (n - 1) / 2;
  const yMean = magnitudes.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * ((magnitudes[i] ?? 0) - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  // Volatilidad (desviación estándar de diferencias)
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) {
    diffs.push((magnitudes[i] ?? 0) - (magnitudes[i - 1] ?? 0));
  }
  const diffMean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((s, d) => s + (d - diffMean) ** 2, 0) / diffs.length;
  const volatility = Math.sqrt(variance);

  let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  if (volatility > 0.3) direction = 'volatile';
  else if (slope > 0.05) direction = 'increasing';
  else if (slope < -0.05) direction = 'decreasing';
  else direction = 'stable';

  return { direction, slope, volatility };
};

log.info('[recurrentNeuron] LSTM module loaded');
