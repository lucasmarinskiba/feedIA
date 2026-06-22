/**
 * oauthTokens — persistencia cifrada de tokens OAuth por brand/account.
 *
 * Orden de preferencia:
 *  1. Supabase oauth_tokens (producción, centralizado)
 *  2. SQLite oauth_tokens (local/dev, fallback durable)
 *
 * Requisito: OAUTH_TOKEN_SECRET debe estar configurado para cifrar/descifrar.
 * Sin él, esta capa no almacena ni lee tokens y se delega a archivos planos
 * legacy en src/integrations/oauthConnections.ts.
 */

import { log } from '../agent/logger.js';
import {
  isSupabaseAvailable,
  isSupabaseServiceRoleAvailable,
  supabaseInsert,
  supabaseQuery,
  supabaseUpdate,
  type Json,
} from '../integrations/providers/supabase.js';
import { encryptToken, decryptToken, isEncryptionAvailable } from '../integrations/oauthTokenCrypto.js';
import { getDb } from './db.js';

export type ConnectionPlatform = 'instagram' | 'tiktok';

export interface OAuthConnection {
  platform: ConnectionPlatform;
  brandId: string;
  accessToken: string;
  refreshToken?: string;
  openId?: string;
  scope?: string;
  expiresAtIso?: string;
  metadata?: Record<string, string | number | boolean>;
  connectedAt: string;
  lastRefreshedAt?: string;
}

const scopesToArray = (scope?: string): string[] =>
  scope
    ?.split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const tokenBlobFromConnection = (conn: OAuthConnection): string =>
  JSON.stringify({
    accessToken: conn.accessToken,
    refreshToken: conn.refreshToken,
    openId: conn.openId,
    scope: conn.scope,
    expiresAtIso: conn.expiresAtIso,
    metadata: conn.metadata,
    connectedAt: conn.connectedAt,
    lastRefreshedAt: conn.lastRefreshedAt,
  });

const connectionFromTokenBlob = (brandId: string, platform: ConnectionPlatform, blob: string): OAuthConnection => {
  const parsed = JSON.parse(blob) as Omit<OAuthConnection, 'brandId' | 'platform'>;
  return { ...parsed, brandId, platform };
};

const useSupabase = (): boolean => isSupabaseAvailable() && isSupabaseServiceRoleAvailable();

/* ───────── SQLite helpers ───────── */

const ensureSQLiteSchema = (): void => {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      account_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_token TEXT NOT NULL,
      scopes TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (account_id, provider)
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_tokens_account ON oauth_tokens(account_id);
  `);
};

/* ───────── Public API ───────── */

export const saveOAuthToken = async (conn: OAuthConnection): Promise<boolean> => {
  if (!isEncryptionAvailable()) return false;
  const ciphertext = encryptToken(tokenBlobFromConnection(conn));
  if (!ciphertext) return false;

  const scopes = scopesToArray(conn.scope);
  const expiresAt = conn.expiresAtIso ?? null;

  if (useSupabase()) {
    const row: Record<string, Json> = {
      account_id: conn.brandId,
      provider: conn.platform,
      encrypted_token: ciphertext,
      scopes,
      expires_at: expiresAt,
    };
    const insertRes = await supabaseInsert('oauth_tokens', row, true);
    if (insertRes.ok) {
      log.debug('[oauthTokens] guardado en Supabase', { brandId: conn.brandId, platform: conn.platform });
      return true;
    }
    const updateRes = await supabaseUpdate(
      'oauth_tokens',
      { account_id: conn.brandId, provider: conn.platform },
      row,
      true,
    );
    if (updateRes.ok) {
      log.debug('[oauthTokens] actualizado en Supabase', { brandId: conn.brandId, platform: conn.platform });
      return true;
    }
    log.warn(`[oauthTokens] Supabase falló: ${updateRes.error}`);
  }

  // Fallback SQLite
  try {
    ensureSQLiteSchema();
    const stmt = getDb().prepare(
      `
      INSERT INTO oauth_tokens (account_id, provider, encrypted_token, scopes, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(account_id, provider) DO UPDATE SET
        encrypted_token = excluded.encrypted_token,
        scopes = excluded.scopes,
        expires_at = excluded.expires_at,
        updated_at = datetime('now')
      `,
    );
    stmt.run(conn.brandId, conn.platform, ciphertext, JSON.stringify(scopes), expiresAt);
    log.debug('[oauthTokens] guardado en SQLite', { brandId: conn.brandId, platform: conn.platform });
    return true;
  } catch (err) {
    log.warn(`[oauthTokens] SQLite falló: ${(err as Error).message}`);
    return false;
  }
};

export const getOAuthToken = async (
  brandId: string,
  platform: ConnectionPlatform,
): Promise<OAuthConnection | null> => {
  if (!isEncryptionAvailable()) return null;

  let ciphertext: string | null = null;

  if (useSupabase()) {
    const res = await supabaseQuery<{ encrypted_token: string }>('oauth_tokens', {
      select: 'encrypted_token',
      filters: [
        { column: 'account_id', op: 'eq', value: brandId },
        { column: 'provider', op: 'eq', value: platform },
      ],
      limit: 1,
      useServiceRole: true,
    });
    if (res.ok && res.data?.[0]) {
      ciphertext = res.data[0].encrypted_token;
    }
  }

  if (!ciphertext) {
    try {
      ensureSQLiteSchema();
      const row = getDb()
        .prepare('SELECT encrypted_token FROM oauth_tokens WHERE account_id = ? AND provider = ?')
        .get(brandId, platform) as { encrypted_token: string } | undefined;
      ciphertext = row?.encrypted_token ?? null;
    } catch (err) {
      log.warn(`[oauthTokens] SQLite read failed: ${(err as Error).message}`);
    }
  }

  if (!ciphertext) return null;

  const plaintext = decryptToken(ciphertext);
  if (!plaintext) return null;

  try {
    return connectionFromTokenBlob(brandId, platform, plaintext);
  } catch (err) {
    log.warn(`[oauthTokens] token corrupto para ${brandId}/${platform}: ${(err as Error).message}`);
    return null;
  }
};

export const deleteOAuthToken = async (brandId: string, platform: ConnectionPlatform): Promise<boolean> => {
  if (!isEncryptionAvailable()) return false;
  let ok = false;

  if (useSupabase()) {
    const res = await supabaseUpdate(
      'oauth_tokens',
      { account_id: brandId, provider: platform },
      { encrypted_token: encryptToken('{}') ?? '{}' },
      true,
    );
    ok = res.ok;
    if (!res.ok) log.warn(`[oauthTokens] delete Supabase failed: ${res.error}`);
  }

  try {
    ensureSQLiteSchema();
    const stmt = getDb().prepare('DELETE FROM oauth_tokens WHERE account_id = ? AND provider = ?');
    const info = stmt.run(brandId, platform);
    if (info.changes > 0) ok = true;
  } catch (err) {
    log.warn(`[oauthTokens] delete SQLite failed: ${(err as Error).message}`);
  }

  return ok;
};

export const listOAuthTokensForBrand = async (brandId: string): Promise<OAuthConnection[]> => {
  const conns: OAuthConnection[] = [];
  for (const platform of ['instagram', 'tiktok'] as const) {
    const c = await getOAuthToken(brandId, platform);
    if (c) conns.push(c);
  }
  return conns;
};
