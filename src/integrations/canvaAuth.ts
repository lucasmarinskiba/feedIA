import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { updateUser } from './userRegistry.js';

const CANVA_API = 'https://api.canva.com/rest/v1';

export interface CanvaUserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: string;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

const tokenFilePath = (handle: string): string =>
  resolve(`data/runtime/users/${handle.toLowerCase().trim()}/canva.json`);

const inMemoryCache = new Map<string, TokenCacheEntry>();

export const saveCanvaTokens = (handle: string, tokens: CanvaUserTokens): void => {
  const fp = tokenFilePath(handle);
  mkdirSync(dirname(fp), { recursive: true });
  writeFileSync(fp, JSON.stringify(tokens, null, 2), 'utf-8');
  inMemoryCache.set(handle.toLowerCase().trim(), {
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt,
  });
  updateUser(handle, { canvaConnected: true });
};

export const loadCanvaTokens = (handle: string): CanvaUserTokens | null => {
  const fp = tokenFilePath(handle);
  if (!existsSync(fp)) return null;
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as CanvaUserTokens;
  } catch {
    return null;
  }
};

export const deleteCanvaTokens = (handle: string): boolean => {
  const fp = tokenFilePath(handle);
  if (!existsSync(fp)) return false;
  try {
    writeFileSync(fp, JSON.stringify({ revoked: true, revokedAt: new Date().toISOString() }, null, 2), 'utf-8');
    inMemoryCache.delete(handle.toLowerCase().trim());
    updateUser(handle, { canvaConnected: false });
    return true;
  } catch {
    return false;
  }
};

export const refreshUserAccessToken = async (handle: string): Promise<string | null> => {
  const key = handle.toLowerCase().trim();

  // Use in-memory cache if still valid
  const cached = inMemoryCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const stored = loadCanvaTokens(handle);
  if (!stored) return null;

  if (!env.canva.clientId || !env.canva.clientSecret) {
    log.warn('canvaAuth: CANVA_CLIENT_ID o CANVA_CLIENT_SECRET no configurados');
    return null;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
  });
  const auth = Buffer.from(`${env.canva.clientId}:${env.canva.clientSecret}`).toString('base64');

  const res = await fetch(`${CANVA_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    log.error(`canvaAuth: refresh falló para ${handle} — ${res.status}: ${await res.text()}`);
    return null;
  }

  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };

  const newTokens: CanvaUserTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? stored.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
    connectedAt: stored.connectedAt,
  };

  saveCanvaTokens(handle, newTokens);
  return newTokens.accessToken;
};

export const getUserAccessToken = async (handle: string): Promise<string | null> => {
  const key = handle.toLowerCase().trim();
  const cached = inMemoryCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }
  return refreshUserAccessToken(handle);
};

// PKCE helpers for OAuth flow
export const generateCodeVerifier = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < 128; i += 1) {
    verifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return verifier;
};

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const buildCanvaAuthUrl = async (
  clientId: string,
  redirectUri: string,
  state: string,
): Promise<{ url: string; verifier: string }> => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const url = new URL('https://www.canva.com/api/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'design:read design:write asset:read asset:write');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url: url.toString(), verifier };
};

export const exchangeCanvaCode = async (
  code: string,
  verifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${CANVA_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    log.error(`canvaAuth: exchange falló — ${res.status}: ${await res.text()}`);
    return null;
  }

  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
};
