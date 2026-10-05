/**
 * Proyectos de contenido por marca: campañas o series para TikTok e Instagram, con tareas, fechas
 * y estado. Persistencia en JSON con cola de escrituras por marca.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type PlataformaProyecto = 'instagram' | 'tiktok' | 'ambas';
export type EstadoProyecto = 'planificado' | 'en-curso' | 'pausado' | 'completado';

export interface TareaProyecto {
  id: string;
  texto: string;
  hecha: boolean;
}

export interface Proyecto {
  id: string;
  nombre: string;
  plataforma: PlataformaProyecto;
  objetivo: string;
  inicio: string | null;
  fin: string | null;
  estado: EstadoProyecto;
  tareas: TareaProyecto[];
  creadoEn: string;
  actualizadoEn: string;
}

export const ESTADOS_PROYECTO: EstadoProyecto[] = ['planificado', 'en-curso', 'pausado', 'completado'];
const PLATAFORMAS: PlataformaProyecto[] = ['instagram', 'tiktok', 'ambas'];
const MAX_TAREAS = 30;
const MAX_PROYECTOS = 200;

export const progresoProyecto = (p: Proyecto): { hechas: number; total: number; pct: number } => {
  const total = p.tareas.length;
  const hechas = p.tareas.filter((t) => t.hecha).length;
  return { hechas, total, pct: total === 0 ? 0 : Math.round((hechas / total) * 100) };
};

const limpio = (v: unknown, max: number): string =>
  typeof v === 'string'
    ? v
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, max)
    : '';

const fechaValida = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

export const validarProyecto = (
  body: unknown,
):
  | { ok: true; valor: Omit<Proyecto, 'id' | 'estado' | 'creadoEn' | 'actualizadoEn'> }
  | { ok: false; error: string } => {
  const datos = (body ?? {}) as Record<string, unknown>;
  const nombre = limpio(datos['nombre'], 80);
  if (nombre.length < 3) return { ok: false, error: 'El nombre del proyecto debe tener al menos 3 caracteres.' };
  const plataforma = (datos['plataforma'] ?? 'ambas') as PlataformaProyecto;
  if (!PLATAFORMAS.includes(plataforma)) return { ok: false, error: 'Plataforma no válida.' };
  const objetivo = limpio(datos['objetivo'], 200);
  const inicio = fechaValida(datos['inicio']);
  const fin = fechaValida(datos['fin']);
  if (inicio && fin && fin < inicio) return { ok: false, error: 'La fecha de fin es anterior al inicio.' };
  const tareasCrudas = Array.isArray(datos['tareas']) ? datos['tareas'] : [];
  const tareas = tareasCrudas
    .map((t) => limpio(t, 160))
    .filter((t) => t.length > 0)
    .slice(0, MAX_TAREAS)
    .map((texto) => ({ id: `t-${randomUUID()}`, texto, hecha: false }));
  return { ok: true, valor: { nombre, plataforma, objetivo, inicio, fin, tareas } };
};

const archivo = (marcaId: string): string =>
  path.join(path.resolve('data/executive/proyectos'), `${marcaId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

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

export const leerProyectos = async (marcaId: string): Promise<Proyecto[]> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as unknown;
    return Array.isArray(datos) ? (datos as Proyecto[]) : [];
  } catch {
    return [];
  }
};

const guardar = async (marcaId: string, proyectos: Proyecto[]): Promise<void> => {
  const destino = archivo(marcaId);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(proyectos, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const modificarProyectos = <T>(
  marcaId: string,
  mutar: (proyectos: Proyecto[]) => { resultado: T } | { error: string } | null,
): Promise<T | { error: string } | null> =>
  enCola(marcaId, async () => {
    const proyectos = await leerProyectos(marcaId);
    const salida = mutar(proyectos);
    if (salida === null) return null;
    if ('error' in salida) return salida;
    await guardar(marcaId, proyectos);
    return salida.resultado;
  });

export const nuevoProyecto = (valor: Omit<Proyecto, 'id' | 'estado' | 'creadoEn' | 'actualizadoEn'>): Proyecto => {
  const ahora = new Date().toISOString();
  return { id: `pry-${randomUUID()}`, ...valor, estado: 'planificado', creadoEn: ahora, actualizadoEn: ahora };
};

export const LIMITE_PROYECTOS = MAX_PROYECTOS;
