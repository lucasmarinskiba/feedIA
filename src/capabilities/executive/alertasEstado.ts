/**
 * Silencios de alertas por marca. Una alerta silenciada deja de mostrarse hasta que vence el
 * plazo; las alertas no se borran, solo se ocultan mientras dura el silencio.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { SilenciosAlertas } from './alertasMetricas.js';

const DIR = path.resolve('data/executive/alertas');

const archivo = (marcaId: string): string => path.join(DIR, `${marcaId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

export const leerSilencios = async (marcaId: string): Promise<SilenciosAlertas> => {
  try {
    return JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as SilenciosAlertas;
  } catch {
    return {};
  }
};

const guardar = async (marcaId: string, silencios: SilenciosAlertas): Promise<void> => {
  const ahora = Date.now();
  const vigentes = Object.fromEntries(
    Object.entries(silencios).filter(([, s]) => Date.parse(s.silenciadaHasta) > ahora),
  );
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(vigentes, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const silenciarAlerta = async (marcaId: string, alertaId: string, silenciadaHasta: string): Promise<void> => {
  const silencios = await leerSilencios(marcaId);
  await guardar(marcaId, { ...silencios, [alertaId]: { silenciadaHasta } });
};

export const reactivarAlerta = async (marcaId: string, alertaId: string): Promise<void> => {
  const silencios = await leerSilencios(marcaId);
  const resto = { ...silencios };
  delete resto[alertaId];
  await guardar(marcaId, resto);
};
