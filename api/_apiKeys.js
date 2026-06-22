/**
 * API Keys — Premium feature: API access + SDK.
 *
 * User Premium genera key. Key auth middleware permite usar /api/* endpoints
 * desde clientes externos (Zapier, Make, n8n, custom).
 *
 * Persistencia KV. Key format: feedia_ak_<32-byte-hex>.
 * Rotation + revoke supported.
 */

import crypto from 'node:crypto';
import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';
import { hasFeature } from './_planFeatures.js';

const generateKey = () => `feedia_ak_${crypto.randomBytes(32).toString('hex')}`;

const keyHash = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex');

const keyKvKey = (hash) => `feedia:apikey:${hash}`;
const userKeysKvKey = (userId) => `feedia:user:${userId}:apikeys`;

/**
 * Mint nueva key para user Premium.
 */
export const mintApiKey = async (userId, planId, opts = {}) => {
  if (!hasFeature(planId, 'enterprise.apiAccess')) {
    throw new Error(`API access requiere Premium. Plan actual: ${planId}.`);
  }
  const raw = generateKey();
  const hash = keyHash(raw);
  const metadata = {
    userId,
    hash,
    label: opts.label || 'default',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestsCount: 0,
    revokedAt: null,
    scopes: opts.scopes || ['read', 'write'],
  };
  await store.set(keyKvKey(hash), metadata);
  const userKeys = (await store.get(userKeysKvKey(userId))) || [];
  userKeys.push({ hash, label: metadata.label, createdAt: metadata.createdAt });
  await store.set(userKeysKvKey(userId), userKeys);
  // Devolvemos raw SOLO una vez. Después solo prefix masked.
  return { raw, hash, prefix: raw.slice(0, 14), metadata };
};

export const validateApiKey = async (rawKey) => {
  if (!rawKey || !rawKey.startsWith('feedia_ak_')) return null;
  const hash = keyHash(rawKey);
  const meta = await store.get(keyKvKey(hash));
  if (!meta || meta.revokedAt) return null;
  // Touch lastUsedAt
  meta.lastUsedAt = new Date().toISOString();
  meta.requestsCount = (meta.requestsCount || 0) + 1;
  await store.set(keyKvKey(hash), meta);
  return meta;
};

export const revokeApiKey = async (userId, hash) => {
  const meta = await store.get(keyKvKey(hash));
  if (!meta || meta.userId !== userId) return false;
  meta.revokedAt = new Date().toISOString();
  await store.set(keyKvKey(hash), meta);
  return true;
};

export const listUserApiKeys = async (userId) => {
  const refs = (await store.get(userKeysKvKey(userId))) || [];
  const out = [];
  for (const r of refs) {
    const meta = await store.get(keyKvKey(r.hash));
    if (meta) {
      out.push({
        hash: meta.hash,
        label: meta.label,
        createdAt: meta.createdAt,
        lastUsedAt: meta.lastUsedAt,
        requestsCount: meta.requestsCount,
        revokedAt: meta.revokedAt,
        prefix: `feedia_ak_${meta.hash.slice(0, 8)}...`,
      });
    }
  }
  return out;
};

export const handleApiKeys = async (req, res, path, m, body) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  if (path === '/api/keys' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });
    json(200, { keys: await listUserApiKeys(ctx.user.id) });
    return true;
  }

  if (path === '/api/keys' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });
    try {
      const result = await mintApiKey(ctx.user.id, ctx.user.plan || 'free', {
        label: (body || {}).label || 'default',
        scopes: (body || {}).scopes,
      });
      json(201, {
        apiKey: result.raw,
        hash: result.hash,
        prefix: result.prefix,
        metadata: result.metadata,
        warning: 'Guardá esta key ahora. No se mostrará de nuevo.',
      });
    } catch (err) {
      json(402, { error: String(err.message || err), upgradeUrl: '/pricing.html' });
    }
    return true;
  }

  if (path === '/api/keys/revoke' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });
    const hash = (body || {}).hash;
    if (!hash) return json(400, { error: 'hash requerido' });
    const ok = await revokeApiKey(ctx.user.id, hash);
    json(200, { revoked: ok });
    return true;
  }

  return false;
};
