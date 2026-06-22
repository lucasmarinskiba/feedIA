/**
 * Account Brands — carga BrandProfile desde Supabase/SQLite.
 *
 * Centraliza la resolución de marca activa para workers y APIs,
 * evitando depender de archivos JSON en producción.
 */

import { BrandProfileSchema, type BrandProfile } from '../config/types.js';
import {
  isSupabaseAvailable,
  isSupabaseServiceRoleAvailable,
  supabaseQuery,
} from '../integrations/providers/supabase.js';
import { getDb } from './db.js';
import { log } from '../agent/logger.js';

export interface BrandAccountRecord {
  id: string;
  ownerId?: string;
  name: string;
  niche?: string;
  type?: string;
  metaIgBusinessId?: string;
  metaPageId?: string;
  brandJson?: string;
  strategyJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapSupabaseRow = (row: Record<string, unknown>): BrandAccountRecord => ({
  id: String(row.id),
  ownerId: row.owner_id ? String(row.owner_id) : undefined,
  name: String(row.name),
  niche: row.niche ? String(row.niche) : undefined,
  type: row.type ? String(row.type) : undefined,
  metaIgBusinessId: row.meta_ig_business_id ? String(row.meta_ig_business_id) : undefined,
  metaPageId: row.meta_page_id ? String(row.meta_page_id) : undefined,
  brandJson: row.brand_json ? String(row.brand_json) : undefined,
  strategyJson: row.strategy_json ? String(row.strategy_json) : undefined,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

const mapSQLiteRow = (row: Record<string, unknown>): BrandAccountRecord => ({
  id: String(row.id),
  ownerId: row.owner_id ? String(row.owner_id) : undefined,
  name: String(row.name),
  niche: row.niche ? String(row.niche) : undefined,
  type: row.type ? String(row.type) : undefined,
  metaIgBusinessId: row.meta_ig_business_id ? String(row.meta_ig_business_id) : undefined,
  metaPageId: row.meta_page_id ? String(row.meta_page_id) : undefined,
  brandJson: row.brand_json ? String(row.brand_json) : undefined,
  strategyJson: row.strategy_json ? String(row.strategy_json) : undefined,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

export const getBrandAccount = async (id: string): Promise<BrandAccountRecord | undefined> => {
  if (isSupabaseAvailable() && isSupabaseServiceRoleAvailable()) {
    const res = await supabaseQuery<Record<string, unknown>>('accounts', {
      filters: [{ column: 'id', op: 'eq', value: id }],
      limit: 1,
      useServiceRole: true,
    });
    if (!res.ok || !res.data?.[0]) return undefined;
    return mapSupabaseRow(res.data[0]);
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapSQLiteRow(row);
};

export const listBrandAccounts = async (): Promise<BrandAccountRecord[]> => {
  if (isSupabaseAvailable() && isSupabaseServiceRoleAvailable()) {
    const res = await supabaseQuery<Record<string, unknown>>('accounts', {
      orderBy: 'name',
      orderAsc: true,
      useServiceRole: true,
    });
    if (!res.ok || !res.data) return [];
    return res.data.map(mapSupabaseRow);
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM accounts ORDER BY name').all() as Array<Record<string, unknown>>;
  return rows.map(mapSQLiteRow);
};

export const parseBrandProfile = (account: BrandAccountRecord): BrandProfile | undefined => {
  if (!account.brandJson) return undefined;
  try {
    const raw = JSON.parse(account.brandJson) as unknown;
    return BrandProfileSchema.parse(raw);
  } catch (err) {
    log.warn(`[accountBrands] BrandProfile inválido para account ${account.id}: ${(err as Error).message}`);
    return undefined;
  }
};

export const getBrandProfileForAccount = async (accountId: string): Promise<BrandProfile | undefined> => {
  const account = await getBrandAccount(accountId);
  if (!account) {
    log.warn(`[accountBrands] Account no encontrada: ${accountId}`);
    return undefined;
  }
  return parseBrandProfile(account);
};
