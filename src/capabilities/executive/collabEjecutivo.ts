/**
 * Collabs por marca: persistencia de prospectos y tipo de cuenta, perfil con datos reales de la
 * cuenta y búsqueda de ideas con IA (con recomendaciones de reglas si la IA no responde).
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { askJson } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import {
  recomendarColabs,
  type PerfilColab,
  type Prospecto,
  type Recomendacion,
  type TipoMarca,
} from './collabMetricas.js';

const DIR = path.resolve('data/executive/collabs');

interface ArchivoCollabs {
  tipoMarca: TipoMarca | null;
  prospectos: Prospecto[];
}

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

export const leerCollabs = async (marcaId: string): Promise<ArchivoCollabs> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as ArchivoCollabs;
    return { tipoMarca: datos.tipoMarca ?? null, prospectos: Array.isArray(datos.prospectos) ? datos.prospectos : [] };
  } catch {
    return { tipoMarca: null, prospectos: [] };
  }
};

const guardar = async (marcaId: string, datos: ArchivoCollabs): Promise<void> => {
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(datos, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const modificarCollabs = <T>(
  marcaId: string,
  mutar: (datos: ArchivoCollabs) => { resultado: T } | { error: string } | null,
): Promise<T | { error: string } | null> =>
  enCola(marcaId, async () => {
    const datos = await leerCollabs(marcaId);
    const salida = mutar(datos);
    if (salida === null) return null;
    if ('error' in salida) return salida;
    await guardar(marcaId, datos);
    return salida.resultado;
  });

export const perfilDeCuenta = async (
  cuentasId: string,
  brand: BrandProfile,
  tipoGuardado: TipoMarca | null,
): Promise<PerfilColab> => {
  const tipoMarca: TipoMarca = tipoGuardado ?? (brand.accountCategory === 'empresa' ? 'empresa' : 'personal');
  let seguidores: number | null = null;
  let tasaMediana: number | null = null;
  try {
    const analytics = await construirAnalytics(cuentasId);
    seguidores = analytics.instagram.cuenta.seguidores ?? analytics.tiktok.cuenta.seguidores ?? null;
  } catch (err) {
    log.warn('[Collabs] analytics no disponibles', { error: String(err) });
  }
  try {
    const bloques = await analizarPostsDeMarca(cuentasId);
    const bloque = bloques.instagram.conectado ? bloques.instagram : bloques.tiktok;
    const mediana = bloque.resumen.tasaMediana;
    tasaMediana = mediana === null ? null : mediana / 100;
  } catch (err) {
    log.warn('[Collabs] posts no disponibles', { error: String(err) });
  }
  return { tipoMarca, seguidores, tasaMediana, nicho: brand.niche };
};

export interface IdeaColab {
  titulo: string;
  criterio: string;
  busqueda: string;
}

const esIdea = (v: unknown): v is IdeaColab => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['titulo'] === 'string' &&
    typeof o['criterio'] === 'string' &&
    typeof o['busqueda'] === 'string' &&
    o['titulo'].length <= 120 &&
    o['criterio'].length <= 300 &&
    o['busqueda'].length <= 200
  );
};

export const ideasDeColab = async (
  perfil: PerfilColab,
  marca: string,
): Promise<{ fuente: 'ia' | 'reglas'; ideas: IdeaColab[]; recomendaciones: Recomendacion[] }> => {
  const recomendaciones = recomendarColabs(perfil);
  const contexto = `Marca: ${marca}. Tipo: ${perfil.tipoMarca === 'empresa' ? 'empresa' : 'marca personal'}. Nicho: ${perfil.nicho || 'sin definir'}. Seguidores: ${perfil.seguidores ?? 'desconocido'}. Tasa de interacción mediana: ${perfil.tasaMediana === null ? 'sin datos' : `${(perfil.tasaMediana * 100).toFixed(2)} %`}.`;
  const prompt = `Sugerí 3 tipos de colaboración para esta cuenta de Instagram/TikTok.
${contexto}

Reglas:
- Cada idea debe ser un tipo de colaborador concreto y su criterio de selección.
- "busqueda" es un texto que el dueño puede pegar en el buscador de Instagram o TikTok. No inventes nombres de cuentas.
- Respondé en español rioplatense neutro, sin relleno.

JSON: array de objetos con keys titulo, criterio, busqueda.`;
  try {
    const raw = await askJson<unknown>(prompt, { fast: true, maxTokens: 900, temperature: 0.6 });
    const ideas = Array.isArray(raw) ? raw.filter(esIdea).slice(0, 3) : [];
    if (ideas.length > 0) return { fuente: 'ia', ideas, recomendaciones };
    log.warn('[Collabs] IA sin ideas válidas, uso reglas');
  } catch (err) {
    log.warn('[Collabs] IA no disponible, uso reglas', { error: String(err) });
  }
  return {
    fuente: 'reglas',
    ideas: recomendaciones.map((r) => ({ titulo: r.titulo, criterio: r.porQue, busqueda: r.dondeBuscar })),
    recomendaciones,
  };
};
