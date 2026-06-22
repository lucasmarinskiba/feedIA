/**
 * Feature Flags / Control de versiones
 *
 * Lee flags desde Supabase (`public.feature_flags`) si está disponible,
 * o desde un fallback local para desarrollo/offline.
 *
 * Reglas:
 *  - Si `enabled=false` → nadie excepto owner/admin la ve.
 *  - Si `enabled=true` → visible para planes en `allowed_plans` y usuarios
 *    cuyo hash de id caiga dentro de `rollout_percent`.
 *  - Owner/admin siempre ven todas las flags.
 */

import crypto from 'node:crypto';
import { isSupabaseAvailable, supabaseSelect, type Json } from '../integrations/providers/supabase.js';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  allowedPlans: string[];
  rolloutPercent: number;
  description?: string;
}

// Fallback local cuando Supabase no está configurado.
const LOCAL_FLAGS: Record<string, FeatureFlag> = {
  canary_v2_dashboard: {
    key: 'canary_v2_dashboard',
    enabled: false,
    allowedPlans: ['owner', 'admin'],
    rolloutPercent: 0,
    description: 'Nuevo dashboard v2, visible solo para owner/admin hasta release general.',
  },
};

let cache: FeatureFlag[] | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

const mapFlag = (row: Record<string, Json>): FeatureFlag => ({
  key: String(row.key),
  enabled: Boolean(row.enabled),
  allowedPlans: Array.isArray(row.allowed_plans) ? row.allowed_plans.map(String) : [],
  rolloutPercent: Number(row.rollout_percent) || 0,
  description: row.description ? String(row.description) : undefined,
});

export const listFeatureFlags = async (): Promise<FeatureFlag[]> => {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;

  if (!isSupabaseAvailable()) {
    cache = Object.values(LOCAL_FLAGS);
    cacheAt = Date.now();
    return cache;
  }

  const res = await supabaseSelect<Record<string, Json>>('feature_flags', {
    select: 'key,enabled,allowed_plans,rollout_percent,description',
    useServiceRole: true,
  });

  if (!res.ok || !res.data) {
    cache = Object.values(LOCAL_FLAGS);
    cacheAt = Date.now();
    return cache;
  }

  cache = res.data.map(mapFlag);
  cacheAt = Date.now();
  return cache;
};

export const getFeatureFlag = async (key: string): Promise<FeatureFlag | undefined> => {
  const flags = await listFeatureFlags();
  return flags.find((f) => f.key === key);
};

interface FlagUser {
  id: string;
  plan?: string;
  role?: string;
}

const userInRollout = (userId: string, percent: number): boolean => {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < percent;
};

export const isFeatureEnabled = async (key: string, user?: FlagUser): Promise<boolean> => {
  const flag = await getFeatureFlag(key);
  if (!flag) return false;

  // Owner/admin siempre activo aunque enabled=false (para testing interno)
  if (user?.role === 'owner' || user?.role === 'admin' || user?.plan === 'owner') return true;

  if (!flag.enabled) return false;
  if (!user) return false;

  const plan = (user.plan || 'free').toLowerCase();
  const planAllowed = flag.allowedPlans.length === 0 || flag.allowedPlans.includes(plan);
  if (!planAllowed) return false;

  return userInRollout(user.id, flag.rolloutPercent);
};

/**
 * Determina si un usuario puede ver una versión/release canary.
 * Alias semántico para usar en endpoints de control de versiones.
 */
export const canUseRelease = isFeatureEnabled;
