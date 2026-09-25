/**
 * Ice Breakers de Instagram — menú de preguntas rápidas que Meta muestra al
 * abrir el chat con la cuenta por primera vez (AUTO-003 allowedExample:
 * "Menú de Preguntas Frecuentes (Ice Breaker) al abrir el chat por primera vez").
 *
 * Es automatización reactiva 100% permitida: el usuario elige una opción, el
 * payload vuelve por webhook y el bot responde — nunca se inicia en frío.
 *
 * Configuración vía Graph API oficial de Meta (Messenger Platform, plataforma
 * Instagram): POST /{page-id}/messenger_profile?platform=instagram
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { metaFetch } from '../../integrations/metaApiClient.js';
import { resolveMetaCredentials } from '../../integrations/metaAccountResolver.js';
import { evaluate as complianceEvaluate } from '../../compliance/guardian.js';

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

// Meta limita el menú de Ice Breakers a 4 opciones visibles.
const MAX_ICE_BREAKERS = 4;
// Límite conservador de longitud de pregunta (menú compacto, legible en mobile).
const MAX_QUESTION_LENGTH = 80;

export interface IceBreaker {
  question: string;
  payload: string;
}

interface IceBreakerStore {
  version: number;
  byAccount: Record<string, IceBreaker[]>;
}

const DEFAULT_STORE: IceBreakerStore = { version: 1, byAccount: {} };

// INT-006: el flujo que atiende estos payloads debe aclarar al usuario, en el
// primer mensaje de respuesta, que está hablando con un sistema automatizado.
export const DEFAULT_ICE_BREAKERS: IceBreaker[] = [
  { question: '¿Cuánto cuesta?', payload: 'IB_PRICING' },
  { question: '¿Cómo funciona?', payload: 'IB_HOW_IT_WORKS' },
  { question: 'Quiero hablar con una persona', payload: 'IB_HUMAN_HANDOFF' },
];

const DEFAULT_DB_PATH = resolve('data/community/ice-breakers.json');
let dbPath: string | null = DEFAULT_DB_PATH;
let memoryState: IceBreakerStore | null = null;

/** path=null aísla el store en memoria (mismo patrón que rateLimiter/botControl para tests en paralelo). */
export const configureIceBreakerStore = (path: string | null): void => {
  dbPath = path;
  memoryState = null;
};

const ensureDir = (path: string): void => {
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): IceBreakerStore => {
  if (dbPath === null) return memoryState ?? { version: 1, byAccount: {} };
  if (!existsSync(dbPath)) return { ...DEFAULT_STORE, byAccount: {} };
  try {
    return JSON.parse(readFileSync(dbPath, 'utf-8')) as IceBreakerStore;
  } catch (err) {
    log.warn(`[iceBreakers] Store corrupto, reinicializando: ${err instanceof Error ? err.message : String(err)}`);
    return { ...DEFAULT_STORE, byAccount: {} };
  }
};

const saveStore = (store: IceBreakerStore): void => {
  if (dbPath === null) {
    memoryState = store;
    return;
  }
  ensureDir(dbPath);
  writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf-8');
};

export const getIceBreakers = (accountId: string): IceBreaker[] => {
  const store = loadStore();
  return store.byAccount[accountId] ?? DEFAULT_ICE_BREAKERS;
};

export interface SetIceBreakersResult {
  ok: boolean;
  reason?: string;
  iceBreakers?: IceBreaker[];
}

export const setIceBreakers = (accountId: string, items: IceBreaker[]): SetIceBreakersResult => {
  if (items.length === 0) {
    return { ok: false, reason: 'Debe haber al menos una opción en el menú.' };
  }
  if (items.length > MAX_ICE_BREAKERS) {
    return { ok: false, reason: `Meta permite máximo ${MAX_ICE_BREAKERS} Ice Breakers.` };
  }
  for (const item of items) {
    if (!item.question.trim() || !item.payload.trim()) {
      return { ok: false, reason: 'Cada opción necesita pregunta y payload.' };
    }
    if (item.question.length > MAX_QUESTION_LENGTH) {
      return { ok: false, reason: `"${item.question}" supera ${MAX_QUESTION_LENGTH} caracteres.` };
    }
  }

  // Validar el texto contra las reglas de contenido (CONT-002/003, INT-002)
  // antes de guardar — el menú es lo primero que ve cualquier usuario nuevo.
  const decision = complianceEvaluate('api_request', {
    actor: `ice-breakers:${accountId}`,
    contentText: items.map((i) => i.question).join(' | '),
  });
  if (!decision.allowed) {
    return { ok: false, reason: decision.reason ?? 'Bloqueado por compliance.' };
  }

  const store = loadStore();
  store.byAccount[accountId] = items;
  saveStore(store);
  log.info(`[iceBreakers] Menú actualizado para ${accountId}: ${items.map((i) => i.question).join(', ')}`);
  return { ok: true, iceBreakers: items };
};

export interface IceBreakerSyncResult {
  ok: boolean;
  dryRun: boolean;
  error?: string;
}

/** Sincroniza el menú configurado con la Graph API real de Meta. */
export const syncIceBreakersToMeta = async (accountId: string): Promise<IceBreakerSyncResult> => {
  const creds = await resolveMetaCredentials(accountId);
  if (!creds?.accessToken) {
    return { ok: false, dryRun: env.dryRun, error: 'no-credentials' };
  }
  if (!creds.pageId) {
    return { ok: false, dryRun: env.dryRun, error: 'missing-page-id' };
  }

  const iceBreakers = getIceBreakers(accountId);

  if (env.dryRun) {
    log.info(`[iceBreakers] DRY_RUN: simulando sync de ${iceBreakers.length} Ice Breakers para ${accountId}`);
    return { ok: true, dryRun: true };
  }

  try {
    const url = `${GRAPH_BASE}/${creds.pageId}/messenger_profile?platform=instagram&access_token=${encodeURIComponent(creds.accessToken)}`;
    await metaFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ice_breakers: iceBreakers }),
      },
      { description: `ice-breakers-sync:${accountId}` },
    );
    log.info(`[iceBreakers] Sincronizados ${iceBreakers.length} Ice Breakers con Meta para ${accountId}`);
    return { ok: true, dryRun: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`[iceBreakers] Falló sync con Meta para ${accountId}: ${message}`);
    return { ok: false, dryRun: false, error: message };
  }
};
