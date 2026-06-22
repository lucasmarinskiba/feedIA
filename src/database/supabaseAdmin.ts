/**
 * Supabase Admin Adapter — acceso server-side con service role key.
 *
 * Usa este adaptador SOLO en el backend serverless (`api/*`) o en el
 * proceso largo. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` al frontend.
 *
 * Proporciona operaciones CRUD básicas sobre el schema Postgres/RLS
 * definido en `migrations/001_supabase_rls.sql`. Cuando Supabase no está
 * configurado, delega al SQLite local para compatibilidad local.
 */

import { getDb } from './db.js';
import {
  isSupabaseAvailable,
  isSupabaseServiceRoleAvailable,
  supabaseSelect,
  supabaseInsert,
  supabaseUpdate,
} from '../integrations/providers/supabase.js';

export interface AccountRecord {
  id: string;
  owner_id?: string;
  name: string;
  niche?: string;
  type?: string;
  meta_ig_business_id?: string;
  meta_page_id?: string;
  brand_json?: string;
  strategy_json?: string;
  created_at?: string;
  updated_at?: string;
}

const mapRowToAccount = (row: Record<string, unknown>): AccountRecord => ({
  id: String(row.id),
  owner_id: row.owner_id ? String(row.owner_id) : undefined,
  name: String(row.name),
  niche: row.niche ? String(row.niche) : undefined,
  type: row.type ? String(row.type) : undefined,
  meta_ig_business_id: row.meta_ig_business_id ? String(row.meta_ig_business_id) : undefined,
  meta_page_id: row.meta_page_id ? String(row.meta_page_id) : undefined,
  brand_json: row.brand_json ? String(row.brand_json) : undefined,
  strategy_json: row.strategy_json ? String(row.strategy_json) : undefined,
  created_at: row.created_at ? String(row.created_at) : undefined,
  updated_at: row.updated_at ? String(row.updated_at) : undefined,
});

const useSupabase = (): boolean => isSupabaseAvailable() && isSupabaseServiceRoleAvailable();

/**
 * Crea o actualiza una cuenta. Requiere owner_id para Supabase.
 */
export const upsertAccount = (account: AccountRecord): void => {
  if (useSupabase()) {
    // Upsert no está en el wrapper fetch; usamos update/insert simplificado.
    // En producción, preferir supabase-js para upsert nativo.
    const row: Record<string, import('../integrations/providers/supabase.js').Json> = {
      id: account.id,
      owner_id: account.owner_id ?? null,
      name: account.name,
      niche: account.niche ?? null,
      type: account.type ?? null,
      meta_ig_business_id: account.meta_ig_business_id ?? null,
      meta_page_id: account.meta_page_id ?? null,
      brand_json: account.brand_json ?? null,
      strategy_json: account.strategy_json ?? null,
    };
    supabaseInsert('accounts', row, true).catch(() => {
      supabaseUpdate('accounts', { id: account.id }, row, true).catch(() => undefined);
    });
    return;
  }

  // Fallback SQLite (sin RLS real — solo local/dev)
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, niche, type, meta_ig_business_id, meta_page_id, brand_json, strategy_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      niche=excluded.niche,
      type=excluded.type,
      meta_ig_business_id=excluded.meta_ig_business_id,
      meta_page_id=excluded.meta_page_id,
      brand_json=excluded.brand_json,
      strategy_json=excluded.strategy_json,
      updated_at=datetime('now')
  `);
  stmt.run(
    account.id,
    account.name,
    account.niche ?? null,
    account.type ?? null,
    account.meta_ig_business_id ?? null,
    account.meta_page_id ?? null,
    account.brand_json ?? null,
    account.strategy_json ?? null,
  );
};

/**
 * Obtiene una cuenta por ID. En Supabase usa service role (bypass RLS).
 */
export const getAccount = async (id: string): Promise<AccountRecord | undefined> => {
  if (useSupabase()) {
    const res = await supabaseSelect<Record<string, unknown>>('accounts', {
      filter: { id },
      limit: 1,
      useServiceRole: true,
    });
    if (!res.ok || !res.data?.[0]) return undefined;
    return mapRowToAccount(res.data[0]);
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapRowToAccount(row);
};

/**
 * Lista todas las accounts (solo para admin/owner; en producción filtrar por user).
 */
export const listAccounts = async (): Promise<AccountRecord[]> => {
  if (useSupabase()) {
    const res = await supabaseSelect<Record<string, unknown>>('accounts', {
      orderBy: 'name',
      orderAsc: true,
      useServiceRole: true,
    });
    if (!res.ok || !res.data) return [];
    return res.data.map(mapRowToAccount);
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM accounts ORDER BY name').all() as Array<Record<string, unknown>>;
  return rows.map(mapRowToAccount);
};

export const deleteAccount = async (id: string): Promise<void> => {
  if (useSupabase()) {
    await supabaseUpdate('accounts', { id }, { deleted: true }, true);
    return;
  }
  const db = getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
};
