/**
 * Base de respuestas aprobadas por marca: cada respuesta que el dueño aprueba queda disponible para la
 * herramienta Respuestas IA y para cualquier chatbot de la marca. Escrituras encadenadas por marca.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LIMITE_CONOCIMIENTO, type EntradaConocimiento } from './respuestasTriaje.js';

const DIR = path.resolve('data/executive/respuestas');

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

export const leerConocimiento = async (marcaId: string): Promise<EntradaConocimiento[]> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as unknown;
    return Array.isArray(datos) ? (datos as EntradaConocimiento[]) : [];
  } catch {
    return [];
  }
};

const guardar = async (marcaId: string, entradas: EntradaConocimiento[]): Promise<void> => {
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(entradas.slice(0, LIMITE_CONOCIMIENTO), null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const agregarConocimiento = (
  marcaId: string,
  datos: { pregunta: string; respuesta: string },
): Promise<EntradaConocimiento> =>
  enCola(marcaId, async () => {
    const actuales = await leerConocimiento(marcaId);
    const entrada: EntradaConocimiento = {
      id: `kb-${randomUUID()}`,
      pregunta: datos.pregunta,
      respuesta: datos.respuesta,
      creadaEn: new Date().toISOString(),
    };
    await guardar(marcaId, [entrada, ...actuales]);
    return entrada;
  });

export const eliminarConocimiento = (marcaId: string, id: string): Promise<boolean> =>
  enCola(marcaId, async () => {
    const actuales = await leerConocimiento(marcaId);
    const siguientes = actuales.filter((e) => e.id !== id);
    if (siguientes.length === actuales.length) return false;
    await guardar(marcaId, siguientes);
    return true;
  });
