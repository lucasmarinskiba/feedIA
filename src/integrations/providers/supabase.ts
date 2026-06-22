/**
 * Supabase — Backend as a Service open-source.
 * PostgreSQL + Auth + Storage + Realtime + Edge Functions.
 * Free tier: 500 MB DB, 1 GB storage, 50.000 peticiones/mes.
 * Docs: https://supabase.com/docs
 * Self-host: https://supabase.com/docs/guides/self-hosting
 */

const getConfig = (): { url: string; anonKey: string; serviceRoleKey?: string } | null => {
  const url = process.env['SUPABASE_URL'];
  const anonKey = process.env['SUPABASE_ANON_KEY'];
  if (!url || !anonKey) return null;
  return { url, anonKey, serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] };
};

export const isSupabaseAvailable = (): boolean => Boolean(getConfig());

export const isSupabaseServiceRoleAvailable = (): boolean => Boolean(getConfig()?.serviceRoleKey);

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface SupabaseQueryResult<T = Record<string, Json>> {
  ok: boolean;
  data: T[] | null;
  count: number;
  error?: string;
}

export interface SupabaseMutationResult {
  ok: boolean;
  data: Record<string, Json> | null;
  error?: string;
}

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

export interface QueryFilter {
  column: string;
  op: FilterOp;
  value: Json;
}

const supabaseHeaders = (
  cfg: { anonKey: string; serviceRoleKey?: string },
  useServiceRole = false,
): Record<string, string> => {
  const token = useServiceRole && cfg.serviceRoleKey ? cfg.serviceRoleKey : cfg.anonKey;
  return {
    apikey: cfg.anonKey,
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    prefer: 'return=representation',
  };
};

export const supabaseSelect = async <T = Record<string, Json>>(
  table: string,
  opts: {
    select?: string;
    filter?: Record<string, string>;
    limit?: number;
    orderBy?: string;
    orderAsc?: boolean;
    useServiceRole?: boolean;
  } = {},
): Promise<SupabaseQueryResult<T>> => {
  const cfg = getConfig();
  if (!cfg) return { ok: false, data: null, count: 0, error: 'Supabase no configurado' };

  const params = new URLSearchParams();
  if (opts.select) params.set('select', opts.select);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.orderBy) {
    params.set('order', `${opts.orderBy}.${opts.orderAsc !== false ? 'asc' : 'desc'}`);
  }
  if (opts.filter) {
    for (const [key, val] of Object.entries(opts.filter)) {
      params.set(key, `eq.${val}`);
    }
  }

  try {
    const url = `${cfg.url}/rest/v1/${table}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { ...supabaseHeaders(cfg, opts.useServiceRole), prefer: 'count=exact' },
    });
    if (!response.ok) {
      const err = await response.text();
      return { ok: false, data: null, count: 0, error: `Supabase ${response.status}: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as T[];
    const countHeader = response.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1] ?? '0', 10) : data.length;
    return { ok: true, data, count };
  } catch (err) {
    return { ok: false, data: null, count: 0, error: (err as Error).message };
  }
};

export const supabaseInsert = async (
  table: string,
  row: Record<string, Json>,
  useServiceRole = false,
): Promise<SupabaseMutationResult> => {
  const cfg = getConfig();
  if (!cfg) return { ok: false, data: null, error: 'Supabase no configurado' };

  try {
    const response = await fetch(`${cfg.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: supabaseHeaders(cfg, useServiceRole),
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      const err = await response.text();
      return { ok: false, data: null, error: `Supabase insert ${response.status}: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as Record<string, Json>;
    return { ok: true, data: Array.isArray(data) ? ((data[0] as Record<string, Json>) ?? null) : data };
  } catch (err) {
    return { ok: false, data: null, error: (err as Error).message };
  }
};

export const supabaseUpdate = async (
  table: string,
  filter: Record<string, string>,
  updates: Record<string, Json>,
  useServiceRole = false,
): Promise<SupabaseMutationResult> => {
  const cfg = getConfig();
  if (!cfg) return { ok: false, data: null, error: 'Supabase no configurado' };

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filter)) params.set(key, `eq.${val}`);

  try {
    const response = await fetch(`${cfg.url}/rest/v1/${table}?${params.toString()}`, {
      method: 'PATCH',
      headers: supabaseHeaders(cfg, useServiceRole),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.text();
      return { ok: false, data: null, error: `Supabase update ${response.status}: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as Record<string, Json>;
    return { ok: true, data: Array.isArray(data) ? ((data[0] as Record<string, Json>) ?? null) : data };
  } catch (err) {
    return { ok: false, data: null, error: (err as Error).message };
  }
};

export const supabaseRpc = async (
  functionName: string,
  params: Record<string, Json> = {},
  useServiceRole = false,
): Promise<{ ok: boolean; data: Json; error?: string }> => {
  const cfg = getConfig();
  if (!cfg) return { ok: false, data: null, error: 'Supabase no configurado' };

  try {
    const response = await fetch(`${cfg.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: supabaseHeaders(cfg, useServiceRole),
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.text();
      return { ok: false, data: null, error: `Supabase RPC ${response.status}: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as Json;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: null, error: (err as Error).message };
  }
};

const encodeFilterValue = (value: Json): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `(${value.map((v) => encodeURIComponent(String(v))).join(',')})`;
  return encodeURIComponent(String(value));
};

export interface SupabaseQueryOptions {
  select?: string;
  filters?: QueryFilter[];
  limit?: number;
  orderBy?: string;
  orderAsc?: boolean;
  useServiceRole?: boolean;
}

/**
 * Query avanzada con filtros PostgREST (eq, neq, gt, gte, lt, lte, like, ilike, in, is).
 * Usar SOLO en backend con service role para datos de negocio.
 */
export const supabaseQuery = async <T = Record<string, Json>>(
  table: string,
  opts: SupabaseQueryOptions = {},
): Promise<SupabaseQueryResult<T>> => {
  const cfg = getConfig();
  if (!cfg) return { ok: false, data: null, count: 0, error: 'Supabase no configurado' };

  const params = new URLSearchParams();
  if (opts.select) params.set('select', opts.select);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.orderBy) {
    params.set('order', `${opts.orderBy}.${opts.orderAsc !== false ? 'asc' : 'desc'}`);
  }
  for (const f of opts.filters ?? []) {
    params.set(f.column, `${f.op}.${encodeFilterValue(f.value)}`);
  }

  try {
    const url = `${cfg.url}/rest/v1/${table}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { ...supabaseHeaders(cfg, opts.useServiceRole), prefer: 'count=exact' },
    });
    if (!response.ok) {
      const err = await response.text();
      return { ok: false, data: null, count: 0, error: `Supabase ${response.status}: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as T[];
    const countHeader = response.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1] ?? '0', 10) : data.length;
    return { ok: true, data, count };
  } catch (err) {
    return { ok: false, data: null, count: 0, error: (err as Error).message };
  }
};

/** Esquema recomendado para FeedIA en Supabase */
export const FEEDIA_SUPABASE_SCHEMA = `
-- Historial de posts publicados
create table posts (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  format text, content jsonb, caption text,
  published_at timestamptz, engagement jsonb,
  created_at timestamptz default now()
);
-- Leads capturados por DM
create table leads (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  instagram_username text, name text,
  score integer default 0, status text default 'new',
  notes text, created_at timestamptz default now()
);
-- Log de acciones de agentes
create table agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id text, action_type text, input jsonb,
  output jsonb, ok boolean, duration_ms integer,
  created_at timestamptz default now()
);
-- Métricas diarias
create table daily_metrics (
  id uuid primary key default gen_random_uuid(),
  brand_name text, date date, followers integer,
  reach integer, impressions integer, engagement_rate numeric,
  saves integer, shares integer, created_at timestamptz default now()
);
`;
