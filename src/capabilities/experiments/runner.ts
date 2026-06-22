import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type ExperimentStatus = 'diseñado' | 'corriendo' | 'completado' | 'descartado';

export interface Experiment {
  id: string;
  hipotesis: string;
  variableManipulada: string;
  metricaPrimaria: string;
  metricaUmbralExito: string;
  duracionDias: number;
  status: ExperimentStatus;
  resultados?: { conclusion: string; metricasObservadas: Record<string, number>; aprendizaje: string };
  iniciadoEn?: string;
  completadoEn?: string;
}

const STORE = resolve('data/runtime/experiments.json');

const load = (): Experiment[] => (existsSync(STORE) ? (JSON.parse(readFileSync(STORE, 'utf-8')) as Experiment[]) : []);
const save = (exps: Experiment[]): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
  writeFileSync(STORE, JSON.stringify(exps, null, 2), 'utf-8');
};
const newId = (): string => `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

interface DesignedExperiment {
  hipotesis: string;
  variableManipulada: string;
  metricaPrimaria: string;
  metricaUmbralExito: string;
  duracionDias: number;
  razonamiento: string;
}

export const diseñarExperimentos = async (
  brand: BrandProfile,
  contextoActual: string,
  cantidad = 3,
): Promise<Experiment[]> => {
  const prompt = `Actuá como growth lead diseñando experimentos sobre Instagram.

${brandContext(brand)}

CONTEXTO ACTUAL DE LA CUENTA:
${contextoActual}

Diseñá ${cantidad} experimentos con UNA variable manipulada por experimento (no testees 5 cosas a la vez).

Reglas:
- Cada experimento debe ser ejecutable en ≤14 días.
- Métrica primaria debe ser observable en Insights (saves, shares, watch time, reach, profile visits).
- Umbral de éxito debe ser numérico ("saves > 200 en 48h" no "más saves").
- No experimentos que sacrifiquen marca por curiosidad ("decir algo polémico para ver qué pasa").

JSON: array
[{
  "hipotesis": "Si X entonces Y porque Z",
  "variableManipulada": "qué cambia respecto al baseline",
  "metricaPrimaria": "...",
  "metricaUmbralExito": "...",
  "duracionDias": 7,
  "razonamiento": "por qué este experimento ahora"
}]`;
  const designed = await askJson<DesignedExperiment[]>(prompt, { maxTokens: 3500 });
  const exps: Experiment[] = designed.map((d) => ({
    id: newId(),
    hipotesis: d.hipotesis,
    variableManipulada: d.variableManipulada,
    metricaPrimaria: d.metricaPrimaria,
    metricaUmbralExito: d.metricaUmbralExito,
    duracionDias: d.duracionDias,
    status: 'diseñado',
  }));
  const all = [...load(), ...exps];
  save(all);
  return exps;
};

export const lanzarExperimento = (id: string): Experiment | null => {
  const all = load();
  const exp = all.find((e) => e.id === id);
  if (!exp) return null;
  exp.status = 'corriendo';
  exp.iniciadoEn = new Date().toISOString();
  save(all);
  return exp;
};

export const completarExperimento = async (
  brand: BrandProfile,
  id: string,
  metricasObservadas: Record<string, number>,
): Promise<Experiment | null> => {
  const all = load();
  const exp = all.find((e) => e.id === id);
  if (!exp) return null;
  const prompt = `Evaluá el resultado de este experimento.

${brandContext(brand)}

EXPERIMENTO:
- Hipótesis: ${exp.hipotesis}
- Variable: ${exp.variableManipulada}
- Métrica: ${exp.metricaPrimaria}
- Umbral: ${exp.metricaUmbralExito}

MÉTRICAS OBSERVADAS:
${JSON.stringify(metricasObservadas, null, 2)}

JSON:
{ "conclusion": "se cumple|no se cumple|inconcluso", "metricasObservadas": ${JSON.stringify(metricasObservadas)}, "aprendizaje": "qué nos llevamos para futuras decisiones (no para vanidad)" }`;
  const resultados = await askJson<NonNullable<Experiment['resultados']>>(prompt, { maxTokens: 1500 });
  exp.status = 'completado';
  exp.completadoEn = new Date().toISOString();
  exp.resultados = resultados;
  save(all);
  return exp;
};

export const listarExperimentos = (status?: ExperimentStatus): Experiment[] =>
  status ? load().filter((e) => e.status === status) : load();

export const descartarExperimento = (id: string, motivo: string): Experiment | null => {
  const all = load();
  const exp = all.find((e) => e.id === id);
  if (!exp) return null;
  exp.status = 'descartado';
  exp.resultados = {
    conclusion: 'descartado',
    metricasObservadas: {},
    aprendizaje: motivo,
  };
  save(all);
  return exp;
};
