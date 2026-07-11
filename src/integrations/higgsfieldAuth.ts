/**
 * Higgsfield per-user credential storage.
 *
 * Each FeedIA user connects their own Higgsfield account by entering their
 * API key in Settings → Connections. The key is stored in
 * data/runtime/users/{handle}/higgsfield.json (same pattern as canvaAuth.ts).
 *
 * Higgsfield API key: https://app.higgsfield.ai/settings/api (user's dashboard)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { log } from '../agent/logger.js';
import { updateUser } from './userRegistry.js';

const HIGGSFIELD_API_BASE = 'https://api.higgsfield.ai/v1';

export interface HiggsfieldCredentials {
  apiKey: string;
  connectedAt: string;
  plan?: string;
  availableModels?: string[];
}

const credFilePath = (handle: string): string =>
  resolve(`data/runtime/users/${handle.toLowerCase().trim()}/higgsfield.json`);

export const saveHiggsfieldCredentials = (
  handle: string,
  creds: HiggsfieldCredentials
): void => {
  const fp = credFilePath(handle);
  mkdirSync(dirname(fp), { recursive: true });
  writeFileSync(fp, JSON.stringify(creds, null, 2), 'utf-8');
  updateUser(handle, { higgsfieldConnected: true });
  log.info('[HiggsfieldAuth] Credentials saved', { handle });
};

export const loadHiggsfieldCredentials = (handle: string): HiggsfieldCredentials | null => {
  const fp = credFilePath(handle);
  if (!existsSync(fp)) return null;
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as HiggsfieldCredentials;
  } catch {
    return null;
  }
};

export const deleteHiggsfieldCredentials = (handle: string): boolean => {
  const fp = credFilePath(handle);
  if (!existsSync(fp)) return false;
  try {
    writeFileSync(
      fp,
      JSON.stringify({ revoked: true, revokedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
    updateUser(handle, { higgsfieldConnected: false });
    log.info('[HiggsfieldAuth] Credentials revoked', { handle });
    return true;
  } catch {
    return false;
  }
};

export const isHiggsfieldConnected = (handle: string): boolean => {
  const creds = loadHiggsfieldCredentials(handle);
  return Boolean(creds?.apiKey && !('revoked' in (creds as unknown as Record<string, unknown>)));
};

/**
 * Validate an API key against Higgsfield's /me or /models endpoint.
 * Returns available models on success, null on invalid key.
 */
export const validateHiggsfieldApiKey = async (
  apiKey: string
): Promise<{ valid: boolean; plan?: string; models?: string[] }> => {
  try {
    const res = await fetch(`${HIGGSFIELD_API_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      log.warn('[HiggsfieldAuth] API key validation failed', { status: res.status });
      return { valid: false };
    }

    const json = (await res.json()) as { models?: string[]; plan?: string };
    return {
      valid: true,
      plan: json.plan,
      models: json.models,
    };
  } catch (error) {
    log.warn('[HiggsfieldAuth] Validation request threw', { error: String(error) });
    return { valid: false };
  }
};
