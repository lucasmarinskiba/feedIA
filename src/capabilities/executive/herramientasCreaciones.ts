/**
 * Biblioteca de creaciones de las herramientas IA: cada resultado se guarda por marca para poder
 * reabrirlo y enviarlo después a Calendario, Proyectos, OKR o Experimentos. Escrituras encadenadas
 * por marca para no perder cambios concurrentes.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AccionCreacion, Destino, ResultadoHerramienta } from './herramientasCatalogo.js';

const DIR = path.resolve('data/executive/herramientas');
const MAX_CREACIONES = 200;

export interface AplicacionCreacion {
  destino: Destino;
  aplicadoEn: string;
  resumen: string;
  referencias: string[];
}

export interface OrigenCreacion {
  creacionId: string;
  herramientaId: string;
  nombre: string;
}

export interface CreacionGuardada {
  id: string;
  herramientaId: string;
  nombre: string;
  creadaEn: string;
  valores: Record<string, string | number>;
  fuente: 'ia' | 'reglas';
  resultado: ResultadoHerramienta;
  accion: AccionCreacion;
  aplicaciones: AplicacionCreacion[];
  origen?: OrigenCreacion | null;
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

export const leerCreaciones = async (marcaId: string): Promise<CreacionGuardada[]> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as unknown;
    return Array.isArray(datos) ? (datos as CreacionGuardada[]) : [];
  } catch {
    return [];
  }
};

const guardar = async (marcaId: string, creaciones: CreacionGuardada[]): Promise<void> => {
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(creaciones.slice(0, MAX_CREACIONES), null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const nuevoIdCreacion = (): string => `cre-${randomUUID()}`;

export const agregarCreacion = (marcaId: string, creacion: CreacionGuardada): Promise<void> =>
  enCola(marcaId, async () => {
    const actuales = await leerCreaciones(marcaId);
    await guardar(marcaId, [creacion, ...actuales]);
  });

/** Modifica una creación y devuelve la versión final, o null si no existe. */
export const modificarCreacion = <T>(
  marcaId: string,
  id: string,
  mutar: (creacion: CreacionGuardada) => { creacion: CreacionGuardada; salida: T } | { error: string },
): Promise<{ salida: T } | { error: string } | null> =>
  enCola(marcaId, async () => {
    const creaciones = await leerCreaciones(marcaId);
    const indice = creaciones.findIndex((c) => c.id === id);
    const actual = creaciones[indice];
    if (indice < 0 || !actual) return null;
    const resultado = mutar(actual);
    if ('error' in resultado) return resultado;
    creaciones[indice] = resultado.creacion;
    await guardar(marcaId, creaciones);
    return { salida: resultado.salida };
  });

export const obtenerCreacion = async (marcaId: string, id: string): Promise<CreacionGuardada | null> =>
  (await leerCreaciones(marcaId)).find((c) => c.id === id) ?? null;
