/**
 * Bitácora: registro de las acciones de FeedIA por marca. Cada evento queda en un archivo
 * JSONL por marca. Registrar nunca debe romper la acción que lo origina.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import { ordenarRecientes, type CategoriaBitacora, type EventoBitacora } from './bitacoraMetricas.js';

const BITACORA_DIR = path.resolve('data/executive/bitacora');
const MAX_LINEAS_LEIDAS = 5000;

const archivo = (marcaId: string): string => path.join(BITACORA_DIR, `${marcaId}.jsonl`);

export const registrarEvento = async (
  marcaId: string,
  evento: { categoria: CategoriaBitacora; titulo: string; detalle: string; actor: string; resultado?: string | null },
): Promise<void> => {
  try {
    const registro: EventoBitacora = {
      id: randomUUID(),
      cuando: new Date().toISOString(),
      categoria: evento.categoria,
      titulo: evento.titulo,
      detalle: evento.detalle,
      actor: evento.actor,
      resultado: evento.resultado ?? null,
    };
    await fs.mkdir(BITACORA_DIR, { recursive: true });
    await fs.appendFile(archivo(marcaId), `${JSON.stringify(registro)}\n`, 'utf-8');
  } catch (err) {
    log.warn('[Bitacora] no se pudo registrar el evento', { marcaId, error: String(err) });
  }
};

export const listarEventos = async (marcaId: string): Promise<EventoBitacora[]> => {
  try {
    const raw = await fs.readFile(archivo(marcaId), 'utf-8');
    const lineas = raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .slice(-MAX_LINEAS_LEIDAS);
    const eventos = lineas.flatMap((l) => {
      try {
        return [JSON.parse(l) as EventoBitacora];
      } catch {
        return [];
      }
    });
    return ordenarRecientes(eventos);
  } catch {
    return [];
  }
};
