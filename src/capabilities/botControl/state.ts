/**
 * Bot Control — estado persistente de los interruptores.
 *
 * Semántica del botón maestro (pedida por el usuario):
 *   - Apagar el maestro apaga TODOS los bots, pero el usuario puede reactivar
 *     los que quiera uno por uno. El maestro NO es una compuerta: es una acción
 *     en bloque; su estado se deriva de los bots (all-on / partial / all-off).
 *   - Encender el maestro restaura los bots que estaban prendidos antes de
 *     apagarlo (o, si no hay historial, los que prenden por defecto). Nunca
 *     prende de golpe algo que el usuario había dejado apagado: acá prender = gasto.
 *
 * El archivo se lee en cada consulta (barato) para que un cambio surta efecto al
 * instante y lo vean todos los procesos que comparten el disco.
 *
 * Fail-safe: si el archivo existe pero está corrupto, TODOS los bots se tratan
 * como apagados (la intención del usuario era controlar el gasto) y se avisa.
 * Si no existe (instalación nueva), rigen los defaults del registro.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import {
  BOTS,
  BOT_IDS,
  botsForJob,
  classifyJob,
  getBotDefinition,
  isBotId,
  type BotDefinition,
  type BotId,
} from './registry.js';

interface StoredBot {
  enabled: boolean;
  changedAt: string;
}

interface StoredState {
  version: 1;
  bots: Partial<Record<BotId, StoredBot>>;
  /** Bots que estaban prendidos cuando se apagó el maestro; el maestro los restaura al prenderse. */
  resume: BotId[];
  updatedAt: string;
}

const DEFAULT_PATH = resolve('data/runtime/bot-control.json');

let storePath: string | null = DEFAULT_PATH;
let memoryState: StoredState | null = null;
let lastCorruptLogAt = 0;
const CORRUPT_LOG_EVERY_MS = 5 * 60 * 1000;

/** Cambia (o desactiva con null = solo memoria) el archivo. Los tests lo usan para no escribir en data/. */
export const configureBotControlStore = (path: string | null): void => {
  storePath = path;
  memoryState = null;
  lastCorruptLogAt = 0;
};

const fresh = (): StoredState => ({ version: 1, bots: {}, resume: [], updatedAt: new Date().toISOString() });

interface Loaded {
  state: StoredState;
  corrupt: boolean;
}

const load = (): Loaded => {
  if (!storePath) return { state: memoryState ?? fresh(), corrupt: false };
  if (!existsSync(storePath)) return { state: fresh(), corrupt: false };
  try {
    const raw = JSON.parse(readFileSync(storePath, 'utf-8')) as Partial<StoredState> | null;
    if (!raw || typeof raw !== 'object' || raw.version !== 1 || typeof raw.bots !== 'object' || raw.bots === null) {
      throw new Error('estructura inválida');
    }
    const bots: StoredState['bots'] = {};
    for (const [id, value] of Object.entries(raw.bots)) {
      if (isBotId(id) && value && typeof value.enabled === 'boolean') {
        bots[id] = { enabled: value.enabled, changedAt: String(value.changedAt ?? '') };
      }
    }
    const resume = Array.isArray(raw.resume)
      ? raw.resume.filter((v): v is BotId => typeof v === 'string' && isBotId(v))
      : [];
    return { state: { version: 1, bots, resume, updatedAt: String(raw.updatedAt ?? '') }, corrupt: false };
  } catch (err) {
    // Se consulta en cada disparo de job: sin este límite el mismo error se loguearía cada minuto.
    if (Date.now() - lastCorruptLogAt > CORRUPT_LOG_EVERY_MS) {
      lastCorruptLogAt = Date.now();
      log.error(
        `[BotControl] ${storePath} ilegible (${err instanceof Error ? err.message : String(err)}): ` +
          'TODOS los bots quedan APAGADOS hasta que se reactiven a mano.',
      );
    }
    return { state: fresh(), corrupt: true };
  }
};

/** Escritura atómica: un corte a mitad de escritura nunca deja el archivo a medias. */
const save = (state: StoredState): void => {
  const next: StoredState = { ...state, updatedAt: new Date().toISOString() };
  if (!storePath) {
    memoryState = next;
    return;
  }
  mkdirSync(dirname(storePath), { recursive: true });
  const tmp = `${storePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8');
  renameSync(tmp, storePath);
};

const effective = (loaded: Loaded, def: BotDefinition): boolean => {
  if (loaded.corrupt) return false;
  return loaded.state.bots[def.id]?.enabled ?? def.defaultEnabled;
};

/**
 * Punto de partida para modificar: si el archivo estaba corrupto, todo arranca
 * explícitamente en OFF (lo que ya se estaba aplicando) para que tocar UN bot no
 * reactive los demás por accidente.
 */
const baseline = (loaded: Loaded): StoredState => {
  if (!loaded.corrupt) return loaded.state;
  const now = new Date().toISOString();
  const bots: StoredState['bots'] = {};
  for (const id of BOT_IDS) bots[id] = { enabled: false, changedAt: now };
  return { version: 1, bots, resume: [], updatedAt: now };
};

export const isBotEnabled = (id: BotId): boolean => effective(load(), getBotDefinition(id));

/** ¿Alguno de estos bots está prendido? (lista vacía = infraestructura → true). */
export const isAnyBotEnabled = (ids: readonly BotId[]): boolean => {
  if (ids.length === 0) return true;
  const loaded = load();
  return ids.some((id) => effective(loaded, getBotDefinition(id)));
};

export type MasterState = 'all-on' | 'partial' | 'all-off';

export interface MasterInfo {
  state: MasterState;
  enabled: number;
  total: number;
}

const masterFrom = (loaded: Loaded): MasterInfo => {
  const enabled = BOTS.filter((b) => effective(loaded, b)).length;
  const state: MasterState = enabled === 0 ? 'all-off' : enabled === BOTS.length ? 'all-on' : 'partial';
  return { state, enabled, total: BOTS.length };
};

export const getMasterState = (): MasterInfo => masterFrom(load());

export const setBotEnabled = (id: BotId, enabled: boolean): void => {
  const loaded = load();
  const state = baseline(loaded);
  getBotDefinition(id); // valida
  state.bots[id] = { enabled, changedAt: new Date().toISOString() };
  save(state);
  log.info(`[BotControl] ${id} → ${enabled ? 'ON' : 'OFF'}`);
};

/**
 * Botón maestro. `enabled=false` apaga todo y recuerda qué estaba prendido;
 * `enabled=true` restaura esos bots (o los defaults si no hay historial).
 */
export const setAllBots = (enabled: boolean): void => {
  const loaded = load();
  const state = baseline(loaded);
  const now = new Date().toISOString();

  if (!enabled) {
    const wasOn = BOTS.filter((b) => effective({ state, corrupt: false }, b)).map((b) => b.id);
    // Unión con el historial previo: apagar de nuevo desde un estado parcial (o hacer doble clic) no pierde qué había antes.
    state.resume = [...new Set<BotId>([...state.resume, ...wasOn])];
    for (const id of BOT_IDS) state.bots[id] = { enabled: false, changedAt: now };
  } else {
    const restore = new Set<BotId>(
      state.resume.length > 0 ? state.resume : BOTS.filter((b) => b.defaultEnabled).map((b) => b.id),
    );
    // Lo que el usuario ya reactivó mientras el maestro estaba apagado se mantiene.
    for (const b of BOTS) if (effective({ state, corrupt: false }, b)) restore.add(b.id);
    for (const id of BOT_IDS) state.bots[id] = { enabled: restore.has(id), changedAt: now };
    state.resume = [];
  }
  save(state);
  log.info(`[BotControl] maestro → ${enabled ? 'ON (restaura los que estaban prendidos)' : 'OFF (todos apagados)'}`);
};

export interface JobDecision {
  run: boolean;
  /** Bots que gobiernan el job (vacío = infraestructura). */
  bots: readonly BotId[];
  reason?: string;
}

/** ¿Debe correr este job disparado por el scheduler? Corre si es infraestructura o si ALGUNO de sus bots está prendido. */
export const shouldRunJob = (jobName: string): JobDecision => {
  const bots = botsForJob(jobName);
  if (bots.length === 0) return { run: true, bots };
  const loaded = load();
  const anyOn = bots.some((id) => effective(loaded, getBotDefinition(id)));
  return anyOn ? { run: true, bots } : { run: false, bots, reason: `bot apagado: ${bots.join(', ')}` };
};

export interface BotView {
  id: BotId;
  label: string;
  description: string;
  costly: boolean;
  enabled: boolean;
  changedAt?: string;
  views: string[];
  /** Cantidad de jobs del scheduler que gobierna (solo si se pasó la lista de jobs). */
  jobs?: number;
}

export interface BotControlSnapshot {
  master: MasterInfo;
  bots: BotView[];
  /** El archivo de estado estaba ilegible: todo está apagado por seguridad. */
  corrupt: boolean;
  infraJobs?: number;
}

export const getBotControlSnapshot = (jobNames?: readonly string[]): BotControlSnapshot => {
  const loaded = load();
  const bots: BotView[] = BOTS.map((b) => ({
    id: b.id,
    label: b.label,
    description: b.description,
    costly: b.costly,
    enabled: effective(loaded, b),
    changedAt: loaded.state.bots[b.id]?.changedAt || undefined,
    views: [...b.views],
    ...(jobNames
      ? { jobs: jobNames.filter((n) => classifyJob(n).kind === 'bots' && botsForJob(n).includes(b.id)).length }
      : {}),
  }));
  return {
    master: masterFrom(loaded),
    bots,
    corrupt: loaded.corrupt,
    ...(jobNames ? { infraJobs: jobNames.filter((n) => classifyJob(n).kind === 'infra').length } : {}),
  };
};
