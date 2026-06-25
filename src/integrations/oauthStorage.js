/**
 * OAuth Token Storage — Simple file-based persistence
 * In production, use a database (PostgreSQL, MongoDB, etc.)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TOKENS_PATH = join(process.cwd(), 'data', 'oauth', 'tokens.json');

const ensureDir = () => {
  const dir = join(process.cwd(), 'data', 'oauth');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

export const storeOAuthToken = async (service, code, state) => {
  try {
    ensureDir();
    let tokens = {};
    if (existsSync(TOKENS_PATH)) {
      tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
    }

    tokens[service] = {
      code,
      state,
      connectedAt: new Date().toISOString(),
      status: 'pending', // Waiting for token exchange
    };

    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');
    return tokens[service];
  } catch (err) {
    console.error(`[OAuth] Failed to store token for ${service}:`, err);
    throw err;
  }
};

export const getOAuthToken = (service) => {
  try {
    if (!existsSync(TOKENS_PATH)) return null;
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
    return tokens[service] || null;
  } catch (err) {
    console.error(`[OAuth] Failed to read token for ${service}:`, err);
    return null;
  }
};

export const removeOAuthToken = (service) => {
  try {
    if (!existsSync(TOKENS_PATH)) return true;
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
    delete tokens[service];
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[OAuth] Failed to remove token for ${service}:`, err);
    return false;
  }
};

export const getAllOAuthTokens = () => {
  try {
    if (!existsSync(TOKENS_PATH)) return {};
    return JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
  } catch (err) {
    console.error('[OAuth] Failed to read all tokens:', err);
    return {};
  }
};
