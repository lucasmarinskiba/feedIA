/**
 * Meta Account Resolver — obtiene credenciales de Instagram por account.
 *
 * Orden de resolución:
 *  1. oauthConnections (Supabase → archivo legacy)
 *  2. Variables de entorno globales META_ACCESS_TOKEN / META_IG_BUSINESS_ID
 *
 * Centraliza el acceso para que publishToInstagram, insights y community
 * no dependan de un único token global.
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getConnection } from './oauthConnections.js';

export interface MetaAccountCredentials {
  accessToken: string;
  igBusinessId: string;
  pageId?: string;
  expiresAt?: string;
}

export const resolveMetaCredentials = async (accountId: string): Promise<MetaAccountCredentials | null> => {
  const conn = await getConnection(accountId, 'instagram');
  if (conn?.accessToken) {
    const igBusinessId = (conn.metadata?.igBusinessId as string) ?? env.meta.igBusinessId ?? '';
    if (!igBusinessId) {
      log.warn(`[metaAccountResolver] Token encontrado pero falta igBusinessId para account ${accountId}`);
      return null;
    }
    return {
      accessToken: conn.accessToken,
      igBusinessId,
      pageId: (conn.metadata?.pageId as string) ?? env.meta.pageId,
      expiresAt: conn.expiresAtIso,
    };
  }

  if (env.meta.accessToken && env.meta.igBusinessId) {
    log.debug(`[metaAccountResolver] credenciales resueltas desde env global para ${accountId}`);
    return {
      accessToken: env.meta.accessToken,
      igBusinessId: env.meta.igBusinessId,
      pageId: env.meta.pageId,
    };
  }

  log.warn(`[metaAccountResolver] No se encontraron credenciales de Meta para account ${accountId}`);
  return null;
};

export const hasMetaCredentials = async (accountId: string): Promise<boolean> => {
  const creds = await resolveMetaCredentials(accountId);
  return Boolean(creds?.accessToken && creds?.igBusinessId);
};
