/**
 * Bot Control — estado POR CUENTA (bot_control_state), separado del interruptor
 * global de state.ts (que sigue gobernando el scheduler de la cuenta principal
 * hasta que exista ejecución por cuenta — ver plan de Stage 2).
 *
 * Cada fila es (user_id, bot_id) → enabled. Sin fila = arranca en el default del
 * registro (BotDefinition.defaultEnabled), igual que el store global.
 *
 * Persistencia: Postgres real cuando hay DATABASE_URL (producción). Sin eso
 * (dev local, tests) cae a un Map en memoria — getPool() degrada a un mock
 * que solo entiende las queries de user_tiers, así que confiar en él para una
 * tabla nueva perdería cada escritura en silencio; el Map en memoria es la
 * fuente de verdad real en ese caso, no un adorno.
 */

import { getPool } from '../../db/postgres-real.js';
import {
  BOTS,
  BOT_IDS,
  getBotDefinition,
  isBotId,
  tierUnlocksBot,
  type BotDefinition,
  type BotId,
} from './registry.js';
import type { UserTier } from '../../db/user-tiers.js';

const hasRealDb = (): boolean => !!process.env['DATABASE_URL'];

export const initializeBotControlStateTable = async (): Promise<void> => {
  if (!hasRealDb()) return;
  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bot_control_state (
        user_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        enabled BOOLEAN NOT NULL,
        changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, bot_id)
      );
      CREATE INDEX IF NOT EXISTS idx_bot_control_state_user ON bot_control_state (user_id);
    `);
  } catch (err) {
    console.error('[BotControl/account] Failed to initialize bot_control_state:', err);
  }
};

interface Row {
  bot_id: string;
  enabled: boolean;
  changed_at: string;
}
type BotRows = Map<BotId, { enabled: boolean; changedAt: string }>;

// Fallback in-memory (dev/tests, sin DATABASE_URL). Sobrevive mientras dure el
// proceso, se pierde en un reinicio — igual que el resto de la infraestructura
// de esta app sin Postgres configurado (ver src/db/accounts.ts).
const memoryStore = new Map<string, BotRows>();

/** Solo para tests: vuelve a arrancar el store en memoria entre casos. */
export const resetAccountBotStoreForTests = (): void => memoryStore.clear();

const loadRows = async (userId: string): Promise<BotRows> => {
  if (!hasRealDb()) return memoryStore.get(userId) ?? new Map();
  const map: BotRows = new Map();
  try {
    const result = await getPool().query(
      'SELECT bot_id, enabled, changed_at FROM bot_control_state WHERE user_id = $1',
      [userId],
    );
    for (const raw of result.rows as Row[]) {
      if (isBotId(raw.bot_id))
        map.set(raw.bot_id, { enabled: Boolean(raw.enabled), changedAt: String(raw.changed_at) });
    }
  } catch (err) {
    // Tabla todavía no inicializada u otro problema de conexión: se trata como
    // "sin filas" — cada bot cae a su default, igual que una cuenta nueva.
    console.warn('[BotControl/account] read fallback to defaults:', err instanceof Error ? err.message : String(err));
  }
  return map;
};

const writeRow = async (userId: string, id: BotId, enabled: boolean): Promise<void> => {
  const changedAt = new Date().toISOString();
  if (!hasRealDb()) {
    const bucket = memoryStore.get(userId) ?? new Map<BotId, { enabled: boolean; changedAt: string }>();
    bucket.set(id, { enabled, changedAt });
    memoryStore.set(userId, bucket);
    return;
  }
  try {
    await getPool().query(
      `INSERT INTO bot_control_state (user_id, bot_id, enabled, changed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, bot_id) DO UPDATE SET enabled = $3, changed_at = NOW()`,
      [userId, id, enabled],
    );
  } catch (err) {
    console.error(`[BotControl/account] write failed for ${userId}/${id}:`, err);
    throw err;
  }
};

const effective = (rows: BotRows, def: BotDefinition): boolean => rows.get(def.id)?.enabled ?? def.defaultEnabled;

export interface AccountBotView {
  id: BotId;
  label: string;
  description: string;
  costly: boolean;
  enabled: boolean;
  locked: boolean;
  requiredTier: UserTier;
  changedAt?: string;
  views: string[];
  jobs?: number;
}

export type AccountMasterState = 'all-on' | 'partial' | 'all-off';

export interface AccountMasterInfo {
  state: AccountMasterState;
  enabled: number;
  total: number;
  locked: number;
}

export interface AccountBotSnapshot {
  master: AccountMasterInfo;
  bots: AccountBotView[];
  tier: UserTier;
}

const isUnlocked = (tier: UserTier, isOwner: boolean, bot: BotDefinition): boolean =>
  isOwner || tierUnlocksBot(tier, bot);

/**
 * Estado completo para el panel: TODOS los bots siempre presentes (nunca se
 * filtra la lista — solo se marca `locked`), un bot bloqueado siempre se
 * reporta `enabled: false` aunque haya quedado una fila vieja de una cuenta
 * que bajó de plan (defensa en profundidad: el server nunca confía en un
 * "encendido" guardado de un plan que ya no tiene).
 */
export const getAccountSnapshot = async (
  userId: string,
  tier: UserTier,
  isOwner: boolean,
  jobCounter?: (bot: BotDefinition) => number | undefined,
): Promise<AccountBotSnapshot> => {
  const rows = await loadRows(userId);
  let enabledCount = 0;
  let lockedCount = 0;
  const bots: AccountBotView[] = BOTS.map((b) => {
    const unlocked = isUnlocked(tier, isOwner, b);
    const enabled = unlocked && effective(rows, b);
    if (enabled) enabledCount += 1;
    if (!unlocked) lockedCount += 1;
    return {
      id: b.id,
      label: b.label,
      description: b.description,
      costly: b.costly,
      enabled,
      locked: !unlocked,
      requiredTier: b.minTier,
      changedAt: rows.get(b.id)?.changedAt,
      views: [...b.views],
      ...(jobCounter ? { jobs: jobCounter(b) } : {}),
    };
  });
  // "all-on"/"all-off" se miden contra lo que el plan permite, no contra los 8
  // bots totales — si no, ninguna cuenta por debajo de agency vería "all-on"
  // jamás, aunque tenga prendido todo lo que su plan le da.
  const unlockedTotal = BOTS.length - lockedCount;
  const state: AccountMasterState =
    enabledCount === 0 ? 'all-off' : enabledCount === unlockedTotal ? 'all-on' : 'partial';
  return { master: { state, enabled: enabledCount, total: BOTS.length, locked: lockedCount }, bots, tier };
};

export type SetBotResult = { ok: true } | { ok: false; reason: 'tier-required'; requiredTier: UserTier };

export const setAccountBotEnabled = async (
  userId: string,
  tier: UserTier,
  isOwner: boolean,
  id: BotId,
  enabled: boolean,
): Promise<SetBotResult> => {
  const def = getBotDefinition(id);
  if (enabled && !isUnlocked(tier, isOwner, def)) {
    return { ok: false, reason: 'tier-required', requiredTier: def.minTier };
  }
  await writeRow(userId, id, enabled);
  return { ok: true };
};

/**
 * Maestro por cuenta. Apagar siempre está permitido (bajar gasto nunca se
 * bloquea). Prender solo restaura los bots que el plan actual desbloquea —
 * a diferencia del maestro global (state.ts) esta versión no lleva historial
 * de "qué estaba prendido antes": restaura a los defaults del registro,
 * intersectados con lo que el plan permite.
 */
export const setAllAccountBots = async (
  userId: string,
  tier: UserTier,
  isOwner: boolean,
  enabled: boolean,
): Promise<{ restored: BotId[]; skippedLocked: BotId[] }> => {
  const restored: BotId[] = [];
  const skippedLocked: BotId[] = [];
  for (const id of BOT_IDS) {
    const def = getBotDefinition(id);
    const unlocked = isUnlocked(tier, isOwner, def);
    if (enabled && !unlocked) {
      skippedLocked.push(id);
      continue;
    }
    const nextEnabled = enabled && unlocked && def.defaultEnabled;
    await writeRow(userId, id, nextEnabled);
    if (nextEnabled) restored.push(id);
  }
  return { restored, skippedLocked };
};
