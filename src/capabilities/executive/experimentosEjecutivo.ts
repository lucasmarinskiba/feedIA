/**
 * Experimentos por marca: persistencia en JSON, cola de escrituras por marca y sugerencias
 * de hipótesis con IA (con plantillas de respaldo cuando la IA no responde).
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { askJson } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import {
  METRICAS_EXPERIMENTO,
  validarEntrada,
  type EntradaExperimento,
  type Experimento,
  type MetricaExperimento,
} from './experimentosMetricas.js';

const DIR = path.resolve('data/executive/experimentos');

const archivo = (marcaId: string): string => path.join(DIR, `${marcaId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

const colas = new Map<string, Promise<unknown>>();

const enCola = <T>(marcaId: string, tarea: () => Promise<T>): Promise<T> => {
  const previa = colas.get(marcaId) ?? Promise.resolve();
  const siguiente = previa.catch(() => undefined).then(tarea);
  colas.set(
    marcaId,
    siguiente.catch(() => undefined),
  );
  return siguiente;
};

export const leerExperimentos = async (marcaId: string): Promise<Experimento[]> => {
  try {
    const raw = await fs.readFile(archivo(marcaId), 'utf-8');
    const datos = JSON.parse(raw) as unknown;
    return Array.isArray(datos) ? (datos as Experimento[]) : [];
  } catch {
    return [];
  }
};

const guardar = async (marcaId: string, experimentos: Experimento[]): Promise<void> => {
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(experimentos, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const agregarExperimento = (marcaId: string, exp: Experimento): Promise<void> =>
  enCola(marcaId, async () => {
    const todos = await leerExperimentos(marcaId);
    await guardar(marcaId, [...todos, exp]);
  });

export const modificarExperimento = (
  marcaId: string,
  id: string,
  mutar: (exp: Experimento) => string | null,
): Promise<{ exp: Experimento } | { error: string } | null> =>
  enCola(marcaId, async () => {
    const todos = await leerExperimentos(marcaId);
    const exp = todos.find((e) => e.id === id);
    if (!exp) return null;
    const error = mutar(exp);
    if (error) return { error };
    await guardar(marcaId, todos);
    return { exp };
  });

export const nuevoIdExperimento = (): string => `exp-${randomUUID()}`;

export interface SugerenciaExperimento extends EntradaExperimento {
  razon: string;
}

const PLANTILLAS: SugerenciaExperimento[] = [
  {
    hipotesis:
      'Si publico carruseles con tips concretos en vez de imágenes sueltas, sube el número de guardados por persona alcanzada.',
    variable: 'Formato: carrusel de tips vs imagen única',
    metrica: 'guardados',
    umbralMejora: 15,
    duracionDias: 14,
    nombreA: 'Imagen única',
    nombreB: 'Carrusel',
    razon: 'Los guardados son la señal más fuerte de utilidad percibida y suelen responder al formato.',
  },
  {
    hipotesis: 'Si cierro la publicación con una pregunta concreta, sube la tasa de interacciones por alcance.',
    variable: 'Cierre: pregunta concreta vs cierre sin pregunta',
    metrica: 'interacciones',
    umbralMejora: 10,
    duracionDias: 7,
    nombreA: 'Sin pregunta',
    nombreB: 'Con pregunta',
    razon: 'Una pregunta específica invita a responder; las genéricas pasan desapercibidas.',
  },
  {
    hipotesis: 'Si el gancho del primer segundo promete un resultado concreto, sube la tasa de compartidos.',
    variable: 'Gancho: promesa concreta vs pregunta abierta',
    metrica: 'compartidos',
    umbralMejora: 20,
    duracionDias: 14,
    nombreA: 'Pregunta abierta',
    nombreB: 'Promesa concreta',
    razon: 'Compartir ocurre cuando el contenido sirve a otra persona; una promesa concreta lo vuelve reenviable.',
  },
];

const esMetrica = (valor: unknown): valor is MetricaExperimento =>
  typeof valor === 'string' && valor in METRICAS_EXPERIMENTO;

const validarSugerencias = (raw: unknown): SugerenciaExperimento[] => {
  if (!Array.isArray(raw)) return [];
  const validas: SugerenciaExperimento[] = [];
  for (const item of raw) {
    const datos = item as Record<string, unknown>;
    const entrada = validarEntrada({
      ...datos,
      nombreA: datos['nombreA'] ?? 'Original',
      nombreB: datos['nombreB'] ?? 'Variante',
    });
    if (!entrada.ok || !esMetrica(datos['metrica'])) continue;
    const razon = typeof datos['razon'] === 'string' ? datos['razon'].slice(0, 300) : '';
    validas.push({ ...entrada.valor, razon });
  }
  return validas.slice(0, 3);
};

export const sugerirExperimentos = async (contexto: {
  plataformas: string[];
  formatoDestacado: string | null;
}): Promise<{ fuente: 'ia' | 'plantilla'; sugerencias: SugerenciaExperimento[] }> => {
  const prompt = `Diseñá 3 experimentos A/B para Instagram/TikTok de esta cuenta.
Plataformas conectadas: ${contexto.plataformas.join(', ') || 'ninguna'}.
Formato con mejor desempeño reciente: ${contexto.formatoDestacado ?? 'sin datos suficientes'}.

Reglas:
- Una sola variable por experimento.
- La métrica es una de: guardados, compartidos, likes, interacciones (tasa por alcance).
- umbralMejora: número entre 1 y 100 (porcentaje de mejora mínima).
- duracionDias: entero entre 1 y 60.
- hipotesis: 10 a 300 caracteres, formato "Si X, entonces Y".

JSON: array de objetos con keys hipotesis, variable, metrica, umbralMejora, duracionDias, nombreA, nombreB, razon.`;
  try {
    const raw = await askJson<unknown>(prompt, { fast: true, maxTokens: 1200, temperature: 0.7 });
    const validas = validarSugerencias(raw);
    if (validas.length > 0) return { fuente: 'ia', sugerencias: validas };
    log.warn('[Experimentos] IA sin sugerencias válidas, uso plantillas');
  } catch (err) {
    log.warn('[Experimentos] IA no disponible, uso plantillas', { error: String(err) });
  }
  return { fuente: 'plantilla', sugerencias: PLANTILLAS };
};
