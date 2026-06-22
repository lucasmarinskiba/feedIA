/**
 * Feature Flags — control de versiones y release gating.
 *
 * Fallback local para desarrollo/demo. Si Supabase está configurado con
 * service role key, lee/escribe desde `public.feature_flags`.
 *
 * Reglas:
 *  - Owner/admin ven/usan cualquier flag (para testing interno).
 *  - enabled=false oculta la flag a usuarios normales.
 *  - enabled=true + allowed_plans filtra por plan.
 *  - rollout_percent decide si el usuario entra en el bucket (hash sha256).
 */

import crypto from 'node:crypto';
import * as store from './_store.js';

const LOCAL_FLAGS = {
  canary_v2_dashboard: {
    key: 'canary_v2_dashboard',
    enabled: false,
    allowed_plans: ['owner', 'admin'],
    rollout_percent: 0,
    description: 'Nuevo dashboard v2, visible solo para owner/admin hasta release general.',
  },
};

const supabaseCfg = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
};

const headers = (cfg) => ({
  apikey: cfg.key,
  authorization: `Bearer ${cfg.key}`,
  'content-type': 'application/json',
  prefer: 'return=representation',
});

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

export const listFlags = async () => {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;

  const cfg = supabaseCfg();
  if (!cfg) {
    cache = Object.values(LOCAL_FLAGS);
    cacheAt = Date.now();
    return cache;
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/feature_flags?select=*`, { headers: headers(cfg) });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const data = await res.json();
    cache = data;
    cacheAt = Date.now();
    return data;
  } catch {
    cache = Object.values(LOCAL_FLAGS);
    cacheAt = Date.now();
    return cache;
  }
};

export const getFlag = async (key) => {
  const flags = await listFlags();
  return flags.find((f) => f.key === key);
};

const inRollout = (userId, percent) => {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 100 < percent;
};

export const isEnabled = async (key, user) => {
  const flag = await getFlag(key);
  if (!flag) return false;
  if (user?.role === 'owner' || user?.role === 'admin' || user?.plan === 'owner') return true;
  if (!flag.enabled) return false;
  if (!user) return false;
  const plan = (user.plan || 'free').toLowerCase();
  const allowed = !flag.allowed_plans?.length || flag.allowed_plans.includes(plan);
  if (!allowed) return false;
  return inRollout(user.id, flag.rollout_percent || 0);
};

export const setFlag = async (key, updates) => {
  const cfg = supabaseCfg();
  if (!cfg) {
    LOCAL_FLAGS[key] = { ...(LOCAL_FLAGS[key] || { key }), ...updates, key };
    cache = null;
    return LOCAL_FLAGS[key];
  }
  const res = await fetch(`${cfg.url}/rest/v1/feature_flags?key=eq.${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: headers(cfg),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Supabase update ${res.status}`);
  cache = null;
  return await getFlag(key);
};

export const createFlag = async (flag) => {
  const cfg = supabaseCfg();
  if (!cfg) {
    LOCAL_FLAGS[flag.key] = flag;
    cache = null;
    return flag;
  }
  const res = await fetch(`${cfg.url}/rest/v1/feature_flags`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(flag),
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}`);
  cache = null;
  return await getFlag(flag.key);
};
