// @ts-nocheck
/**
 * Convolutional Layer — Capa convolucional para análisis de patrones visuales.
 *
 * Simula CNN aplicada al feed de Instagram:
 *   - Detecta patrones recurrentes en grids (3x3, 5x5)
 *   - Identifica estilos visuales emergentes
 *   - Pooling para reducir dimensionalidad
 *   - Activation maps que destacan "qué mira la red"
 *
 * Usado para análisis estético del feed y reconocimiento de patrones
 * de diseño en publicaciones competidoras.
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FeedMatrix {
  rows: number;
  cols: number;
  cells: number[][]; // valores normalizados [0,1] por celda
  cellLabels?: string[][]; // descripción opcional por celda
}

export interface ConvKernel {
  name: string;
  size: number; // ej 3 → 3x3
  weights: number[][]; // matriz de pesos
  bias: number;
  description: string; // qué detecta este kernel
}

export interface FeatureMap {
  kernelName: string;
  values: number[][]; // activation map post-convolución
  maxActivation: number;
  maxPosition: { row: number; col: number };
  meanActivation: number;
}

export interface ConvLayerResult {
  inputMatrix: FeedMatrix;
  featureMaps: FeatureMap[];
  pooledOutput: number[][];
  detectedPatterns: Array<{ pattern: string; strength: number; position: { row: number; col: number } }>;
  visualSummary: string;
}

// ── Kernels predefinidos ──────────────────────────────────────────────────────

/**
 * Cada kernel detecta un patrón visual específico en el grid del feed.
 * Inspirados en filtros de visión por computadora aplicados a Instagram.
 */
const PRESET_KERNELS: ConvKernel[] = [
  {
    name: 'horizontal-stripe',
    size: 3,
    weights: [
      [-1, -1, -1],
      [2, 2, 2],
      [-1, -1, -1],
    ],
    bias: 0,
    description: 'Detecta franjas horizontales (filas temáticas)',
  },
  {
    name: 'vertical-stripe',
    size: 3,
    weights: [
      [-1, 2, -1],
      [-1, 2, -1],
      [-1, 2, -1],
    ],
    bias: 0,
    description: 'Detecta franjas verticales (columnas temáticas)',
  },
  {
    name: 'checkerboard',
    size: 3,
    weights: [
      [1, -1, 1],
      [-1, 1, -1],
      [1, -1, 1],
    ],
    bias: 0,
    description: 'Detecta patrón ajedrez (alternancia clara/oscura)',
  },
  {
    name: 'edge-horizontal',
    size: 3,
    weights: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    bias: 0,
    description: 'Sobel filter horizontal — detecta cambios bruscos arriba/abajo',
  },
  {
    name: 'edge-vertical',
    size: 3,
    weights: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    bias: 0,
    description: 'Sobel filter vertical — detecta cambios bruscos izq/der',
  },
  {
    name: 'cluster-detector',
    size: 3,
    weights: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    bias: -4,
    description: 'Detecta clusters (3+ posts similares agrupados)',
  },
  {
    name: 'rainbow-gradient',
    size: 3,
    weights: [
      [0, 0, 0],
      [-1, 0, 1],
      [0, 0, 0],
    ],
    bias: 0,
    description: 'Detecta gradiente horizontal (rainbow pattern)',
  },
];

// ── Operaciones de convolución ────────────────────────────────────────────────

const relu = (x: number): number => Math.max(0, x);

/** Aplica un kernel sobre la matriz de input. */
const applyConvolution = (matrix: FeedMatrix, kernel: ConvKernel): FeatureMap => {
  const outRows = matrix.rows - kernel.size + 1;
  const outCols = matrix.cols - kernel.size + 1;
  const values: number[][] = [];

  let maxActivation = -Infinity;
  let maxPosition = { row: 0, col: 0 };
  let sum = 0;
  let count = 0;

  for (let r = 0; r < outRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < outCols; c++) {
      let conv = kernel.bias;
      for (let kr = 0; kr < kernel.size; kr++) {
        for (let kc = 0; kc < kernel.size; kc++) {
          const cellValue = matrix.cells[r + kr]?.[c + kc] ?? 0;
          const weight = kernel.weights[kr]?.[kc] ?? 0;
          conv += cellValue * weight;
        }
      }
      const activated = relu(conv);
      row.push(activated);
      if (activated > maxActivation) {
        maxActivation = activated;
        maxPosition = { row: r, col: c };
      }
      sum += activated;
      count++;
    }
    values.push(row);
  }

  return {
    kernelName: kernel.name,
    values,
    maxActivation,
    maxPosition,
    meanActivation: count > 0 ? sum / count : 0,
  };
};

/** Max pooling 2x2 para reducir dimensionalidad. */
const maxPooling = (matrix: number[][], poolSize = 2): number[][] => {
  const rows = Math.floor(matrix.length / poolSize);
  const cols = Math.floor((matrix[0]?.length ?? 0) / poolSize);
  const pooled: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      let maxVal = -Infinity;
      for (let pr = 0; pr < poolSize; pr++) {
        for (let pc = 0; pc < poolSize; pc++) {
          const val = matrix[r * poolSize + pr]?.[c * poolSize + pc] ?? 0;
          if (val > maxVal) maxVal = val;
        }
      }
      row.push(maxVal);
    }
    pooled.push(row);
  }

  return pooled;
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Procesa la matriz del feed por todos los kernels y devuelve análisis completo. */
export const runConvolutionalLayer = (matrix: FeedMatrix, customKernels: ConvKernel[] = []): ConvLayerResult => {
  const allKernels = [...PRESET_KERNELS, ...customKernels];
  const featureMaps = allKernels.map((k) => applyConvolution(matrix, k));

  // Pool la salida del kernel cluster-detector (suele ser la más útil)
  const clusterMap = featureMaps.find((f) => f.kernelName === 'cluster-detector');
  const pooledOutput = clusterMap ? maxPooling(clusterMap.values) : [[0]];

  // Detectar patrones dominantes (top 3 por max activation)
  const detectedPatterns = featureMaps
    .filter((f) => f.maxActivation > 0.3)
    .sort((a, b) => b.maxActivation - a.maxActivation)
    .slice(0, 3)
    .map((f) => {
      const kernel = allKernels.find((k) => k.name === f.kernelName)!;
      return {
        pattern: kernel.description,
        strength: f.maxActivation,
        position: f.maxPosition,
      };
    });

  // Resumen narrativo
  const visualSummary =
    detectedPatterns.length === 0
      ? 'Feed sin patrón visual dominante'
      : `Patrón dominante: "${detectedPatterns[0]?.pattern}" en posición (${detectedPatterns[0]?.position.row}, ${detectedPatterns[0]?.position.col}) con fuerza ${detectedPatterns[0]?.strength.toFixed(2)}`;

  return {
    inputMatrix: matrix,
    featureMaps,
    pooledOutput,
    detectedPatterns,
    visualSummary,
  };
};

/** Convierte un FeedGrid (slots) a FeedMatrix para procesamiento. */
export const slotsToMatrix = (
  slots: Array<{ visualWeight: 'light' | 'medium' | 'heavy'; dominantColors: string[]; format: string }>,
  cols = 3,
): FeedMatrix => {
  const rows = Math.ceil(slots.length / cols);
  const cells: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const slot = slots[r * cols + c];
      if (!slot) {
        row.push(0);
        continue;
      }
      // Valor normalizado: peso visual + score de color
      const weightVal = slot.visualWeight === 'light' ? 0.3 : slot.visualWeight === 'medium' ? 0.6 : 0.9;
      row.push(weightVal);
    }
    cells.push(row);
  }

  return { rows, cols, cells };
};

/** Permite registrar un kernel custom para detectar patrones específicos. */
export const createCustomKernel = (name: string, weights: number[][], description: string, bias = 0): ConvKernel => ({
  name,
  size: weights.length,
  weights,
  bias,
  description,
});

log.info('[convolutionalLayer] module loaded with', { presetKernels: PRESET_KERNELS.length });
