/**
 * Store persistente pluggable para la deploy serverless de FeedIA.
 *
 * - Si hay Vercel KV / Upstash Redis (env KV_REST_API_URL + KV_REST_API_TOKEN),
 *   usa su REST API → estado REAL persistente entre invocaciones.
 * - Si no, cae a un Map en memoria (efímero por invocación) para no romper la demo.
 *
 * API mínima: get(key), set(key,val), del(key), keys(prefix), lpush, lrange.
 * Valores se serializan a JSON.
 */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const STORE_REAL = Boolean(URL_ && TOKEN);

const mem = new Map(); // fallback efímero

// Ejecuta un comando Redis vía REST (Upstash/Vercel KV). Devuelve .result o null.
const cmd = async (args) => {
  if (!STORE_REAL) return null;
  try {
    const resp = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    return j ? j.result : null;
  } catch {
    return null;
  }
};

export const get = async (key) => {
  if (STORE_REAL) {
    const r = await cmd(['GET', key]);
    if (r == null) return null;
    try {
      return JSON.parse(r);
    } catch {
      return r;
    }
  }
  return mem.has(key) ? mem.get(key) : null;
};

export const set = async (key, val) => {
  const s = JSON.stringify(val);
  if (STORE_REAL) {
    await cmd(['SET', key, s]);
    return true;
  }
  mem.set(key, val);
  return true;
};

export const del = async (key) => {
  if (STORE_REAL) {
    await cmd(['DEL', key]);
    return true;
  }
  mem.delete(key);
  return true;
};

// Lista claves por prefijo (prefijo* en Redis).
export const keys = async (prefix) => {
  if (STORE_REAL) {
    const r = await cmd(['KEYS', `${prefix}*`]);
    return Array.isArray(r) ? r : [];
  }
  return [...mem.keys()].filter((k) => k.startsWith(prefix));
};

// Lista (para colas: schedule, eventos). lpush + lrange.
export const lpush = async (key, val) => {
  const s = JSON.stringify(val);
  if (STORE_REAL) {
    await cmd(['LPUSH', key, s]);
    return true;
  }
  const arr = mem.get(key) || [];
  arr.unshift(val);
  mem.set(key, arr);
  return true;
};

export const lrange = async (key, start = 0, stop = -1) => {
  if (STORE_REAL) {
    const r = await cmd(['LRANGE', key, String(start), String(stop)]);
    return Array.isArray(r)
      ? r.map((x) => {
          try {
            return JSON.parse(x);
          } catch {
            return x;
          }
        })
      : [];
  }
  const arr = mem.get(key) || [];
  return stop === -1 ? arr.slice(start) : arr.slice(start, stop + 1);
};

// Trim list to last N items (LTRIM for rate limit / log rings).
export const ltrim = async (key, start, stop) => {
  if (STORE_REAL) {
    await cmd(['LTRIM', key, String(start), String(stop)]);
    return true;
  }
  const arr = mem.get(key) || [];
  mem.set(key, arr.slice(start, stop + 1));
  return true;
};

// Atomic INCR — devuelve nuevo valor entero. Para rate-limit / counters.
export const incr = async (key) => {
  if (STORE_REAL) {
    const r = await cmd(['INCR', key]);
    return typeof r === 'number' ? r : Number(r) || 1;
  }
  const cur = Number(mem.get(key) || 0) + 1;
  mem.set(key, cur);
  return cur;
};

// Atomic INCRBY — incrementa en `delta`.
export const incrBy = async (key, delta) => {
  if (STORE_REAL) {
    const r = await cmd(['INCRBY', key, String(delta)]);
    return typeof r === 'number' ? r : Number(r) || delta;
  }
  const cur = Number(mem.get(key) || 0) + delta;
  mem.set(key, cur);
  return cur;
};

// EXPIRE — segundos hasta autodestruir la key.
export const expire = async (key, sec) => {
  if (STORE_REAL) {
    await cmd(['EXPIRE', key, String(sec)]);
    return true;
  }
  // En memoria: timeout fire-and-forget
  setTimeout(() => mem.delete(key), sec * 1000).unref?.();
  return true;
};

// TTL — segundos restantes (-1 = sin expiry, -2 = no existe).
export const ttl = async (key) => {
  if (STORE_REAL) {
    const r = await cmd(['TTL', key]);
    return typeof r === 'number' ? r : Number(r) || -2;
  }
  return mem.has(key) ? -1 : -2;
};

// ── RLS helpers — forzar namespace por userId ─────────────────────────────
// Cualquier dato de usuario debe pasar por estos helpers, no construir keys manualmente.
export const userKey = (userId, suffix) => {
  if (!userId) throw new Error('userKey: userId requerido');
  return `feedia:user:${userId}:${suffix}`;
};
export const getUser = async (userId, suffix) => get(userKey(userId, suffix));
export const setUser = async (userId, suffix, val) => set(userKey(userId, suffix), val);
export const delUser = async (userId, suffix) => del(userKey(userId, suffix));
export const lpushUser = async (userId, suffix, val) => lpush(userKey(userId, suffix), val);
export const lrangeUser = async (userId, suffix, start = 0, stop = -1) => lrange(userKey(userId, suffix), start, stop);
