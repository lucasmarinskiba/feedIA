/**
 * Cache layer sobre Upstash Redis / KV.
 *
 * Uso:
 *   const data = await withCache(`plans:matrix`, () => buildPlanMatrix(), 300);
 *
 * La capa de caché ayuda a escalar a 1.000 usuarios concurrentes sin saturar
 * la DB ni APIs externas con requests repetidos.
 */

import * as store from './_store.js';

const DEFAULT_TTL_SEC = 300;
const KEY_PREFIX = 'feedia:cache:';

const cacheKey = (key) => `${KEY_PREFIX}${key}`;

export const getCache = async (key) => {
  try {
    const raw = await store.get(cacheKey(key));
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export const setCache = async (key, value, ttlSec = DEFAULT_TTL_SEC) => {
  try {
    await store.set(cacheKey(key), JSON.stringify(value));
    await store.expire(cacheKey(key), ttlSec);
    return true;
  } catch {
    return false;
  }
};

export const delCache = async (key) => {
  try {
    await store.del(cacheKey(key));
    return true;
  } catch {
    return false;
  }
};

/**
 * Cache-aside con TTL. Si falla el factory, no cachea.
 */
export const withCache = async (key, factory, ttlSec = DEFAULT_TTL_SEC) => {
  const cached = await getCache(key);
  if (cached !== undefined) return cached;
  const value = await factory();
  if (value !== undefined && value !== null) await setCache(key, value, ttlSec);
  return value;
};

/**
 * Cache-tag invalidation: invalida todas las keys que empiecen con un tag.
 * Upstash Redis soporta KEYS; en memoria simulamos un scan parcial.
 */
export const invalidateTag = async (tag) => {
  try {
    const prefix = cacheKey(tag);
    if (store.STORE_REAL) {
      // Scan + del en Redis. Simplificado con KEYS (cuidado en grandes datasets).
      const keys = await store.keys(`${prefix}*`);
      for (const k of keys) await store.del(k);
      return keys.length;
    }
    // Fallback memoria: no hay forma de enumerar keys en el Map expuesto,
    // así que invalidamos solo la key exacta del tag.
    await delCache(tag);
    return 1;
  } catch {
    return 0;
  }
};
