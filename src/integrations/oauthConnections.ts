/**
 * oauthConnections — persistencia de tokens OAuth por brand/account.
 *
 * Orden de preferencia:
 *  1. Base de datos cifrada (Supabase → SQLite) vía src/database/oauthTokens.ts
 *  2. Archivo legacy data/oauth/{brandId}-{platform}.json (local/dev sin cifrado)
 *
 * El requisito de cifrado se activa con OAUTH_TOKEN_SECRET. Sin él los tokens se
 * mantienen en archivos planos para compatibilidad de desarrollo local.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../agent/logger.js';
import {
  saveOAuthToken,
  getOAuthToken,
  deleteOAuthToken,
  listOAuthTokensForBrand,
  type ConnectionPlatform,
  type OAuthConnection,
} from '../database/oauthTokens.js';
import { isEncryptionAvailable } from './oauthTokenCrypto.js';

const OAUTH_DIR = path.resolve('data/oauth');

export type { ConnectionPlatform, OAuthConnection };

const connectionPath = (brandId: string, platform: ConnectionPlatform): string =>
  path.join(OAUTH_DIR, `${brandId}-${platform}.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(OAUTH_DIR, { recursive: true });
};

const saveConnectionToFile = async (conn: OAuthConnection): Promise<void> => {
  await ensureDir();
  await fs.writeFile(connectionPath(conn.brandId, conn.platform), JSON.stringify(conn, null, 2), 'utf-8');
};

const getConnectionFromFile = async (
  brandId: string,
  platform: ConnectionPlatform,
): Promise<OAuthConnection | null> => {
  try {
    return JSON.parse(await fs.readFile(connectionPath(brandId, platform), 'utf-8')) as OAuthConnection;
  } catch {
    return null;
  }
};

const deleteConnectionFromFile = async (brandId: string, platform: ConnectionPlatform): Promise<boolean> => {
  try {
    await fs.unlink(connectionPath(brandId, platform));
    return true;
  } catch {
    return false;
  }
};

export const saveConnection = async (conn: OAuthConnection): Promise<void> => {
  await saveConnectionToFile(conn);

  if (isEncryptionAvailable()) {
    const saved = await saveOAuthToken(conn);
    if (!saved) {
      log.warn('[oauthConnections] No se pudo guardar token cifrado en DB; quedó solo en archivo legacy', {
        brandId: conn.brandId,
        platform: conn.platform,
      });
    }
  } else {
    log.debug('[oauthConnections] OAUTH_TOKEN_SECRET no configurado; token guardado solo en archivo legacy', {
      brandId: conn.brandId,
      platform: conn.platform,
    });
  }

  log.info('[oauthConnections] saved', { brandId: conn.brandId, platform: conn.platform });
};

export const getConnection = async (
  brandId: string,
  platform: ConnectionPlatform,
): Promise<OAuthConnection | null> => {
  if (isEncryptionAvailable()) {
    const fromDb = await getOAuthToken(brandId, platform);
    if (fromDb) return fromDb;
  }
  return getConnectionFromFile(brandId, platform);
};

export const deleteConnection = async (brandId: string, platform: ConnectionPlatform): Promise<boolean> => {
  let deleted = false;
  if (isEncryptionAvailable()) {
    deleted = await deleteOAuthToken(brandId, platform);
  }
  const fileDeleted = await deleteConnectionFromFile(brandId, platform);
  if (fileDeleted || deleted) {
    log.info('[oauthConnections] deleted', { brandId, platform });
    return true;
  }
  return false;
};

export const listConnectionsForBrand = async (brandId: string): Promise<OAuthConnection[]> => {
  if (isEncryptionAvailable()) {
    return listOAuthTokensForBrand(brandId);
  }
  const conns: OAuthConnection[] = [];
  for (const platform of ['instagram', 'tiktok'] as const) {
    const c = await getConnectionFromFile(brandId, platform);
    if (c) conns.push(c);
  }
  return conns;
};

export const isExpired = (conn: OAuthConnection): boolean => {
  if (!conn.expiresAtIso) return false;
  return new Date(conn.expiresAtIso).getTime() < Date.now();
};

/* ───────── OAuth state token (CSRF protection) ───────── */

const STATE_DIR = path.resolve('data/oauth/states');
const STATE_TTL_MS = 10 * 60_000;

const stateFile = (state: string): string => path.join(STATE_DIR, `${state}.json`);

export const issueOAuthState = async (data: {
  brandId: string;
  platform: ConnectionPlatform;
  redirectAfter?: string;
  userId?: string;
}): Promise<string> => {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const state = `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await fs.writeFile(stateFile(state), JSON.stringify({ ...data, createdAt: Date.now() }), 'utf-8');
  return state;
};

export const consumeOAuthState = async (
  state: string,
): Promise<{ brandId: string; platform: ConnectionPlatform; redirectAfter?: string; userId?: string } | null> => {
  try {
    const raw = JSON.parse(await fs.readFile(stateFile(state), 'utf-8')) as {
      brandId: string;
      platform: ConnectionPlatform;
      redirectAfter?: string;
      userId?: string;
      createdAt: number;
    };
    await fs.unlink(stateFile(state)).catch(() => undefined);
    if (Date.now() - raw.createdAt > STATE_TTL_MS) return null;
    return { brandId: raw.brandId, platform: raw.platform, redirectAfter: raw.redirectAfter, userId: raw.userId };
  } catch {
    return null;
  }
};
