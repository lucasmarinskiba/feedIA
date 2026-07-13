/* ════════════════════════════════════════════════════════
   api() — fetch JSON con: barra de progreso (eventos fx:net),
   de-dup de GET en vuelo y micro-caché (2s) de respuestas.
   Más velocidad percibida, menos carga al servidor.
   ════════════════════════════════════════════════════════ */

const _inflight = new Map(); // key → Promise (coalescing)
const _cache = new Map(); // key → { t, data }
const TTL = 2000;

const net = (delta) => {
  try {
    window.dispatchEvent(new CustomEvent('fx:net', { detail: { delta } }));
  } catch {
    /* noop */
  }
};

/** Parsea respuesta SIN explotar con "Unexpected token '<'": detecta HTML/text antes de JSON.parse */
const safeParseResponse = async (res, path) => {
  const ct = (res.headers.get('content-type') ?? '').toLowerCase();
  const text = await res.text();

  // Detecta HTML (caso típico: 404 que cae al index.html del static handler en servidores viejos)
  const trimmed = text.trim();
  const looksLikeHTML =
    trimmed.startsWith('<!') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<DOCTYPE') ||
    trimmed.startsWith('<!DOCTYPE');
  const looksLikeJSON = ct.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (looksLikeHTML && !looksLikeJSON) {
    // Endpoint no existe o servidor desactualizado — error claro, no críptico
    const err = new Error(
      `API_NOT_FOUND: ${path} no respondió JSON (recibió HTML). El servidor probablemente está desactualizado.`,
    );
    err.code = 'API_NOT_FOUND';
    err.path = path;
    err.status = res.status;
    err.hint = 'Reiniciá el servidor con `npm run build && npm start`.';
    throw err;
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    const err = new Error(`API_PARSE_ERROR: ${path} devolvió contenido no-JSON.`);
    err.code = 'API_PARSE_ERROR';
    err.path = path;
    err.bodyPreview = text.slice(0, 120);
    err.cause = parseErr;
    throw err;
  }
};

// Lee cookie por nombre (para CSRF token).
const readCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
};

const doFetch = async (path, opts) => {
  let res;
  try {
    const method = opts.method ?? (opts.body ? 'POST' : 'GET');
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const headers = { 'content-type': 'application/json' };
    if (isMutation) {
      const csrf = readCookie('feedia_csrf');
      if (csrf) headers['x-csrf-token'] = csrf;
    }
    res = await fetch(path, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
  } catch (networkErr) {
    const err = new Error(`API_NETWORK_ERROR: ${path} (servidor caído?)`);
    err.code = 'API_NETWORK_ERROR';
    err.path = path;
    err.cause = networkErr;
    throw err;
  }

  const payload = await safeParseResponse(res, path);
  if (!res.ok) {
    // 402 = quota exceeded → modal upgrade global
    if (res.status === 402 && payload?.error === 'quota-exceeded') {
      try {
        window.dispatchEvent(new CustomEvent('feedia:quotaExceeded', { detail: payload }));
      } catch {
        /* noop */
      }
    }
    const errMsg = (payload && (payload.error || payload.message)) || `HTTP ${res.status}`;
    const hint = payload && payload.hint ? ` — ${payload.hint}` : '';
    const err = new Error(`${path} → ${errMsg}${hint}`);
    err.code = payload?.error ?? `HTTP_${res.status}`;
    err.status = res.status;
    err.path = path;
    err.payload = payload;
    throw err;
  }
  return payload;
};

export const api = async (path, opts = {}) => {
  const method = opts.method ?? (opts.body ? 'POST' : 'GET');
  const cacheable = method === 'GET' && !opts.noCache;
  const key = `${method} ${path}`;

  if (cacheable) {
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.t < TTL) return hit.data;
    const flying = _inflight.get(key);
    if (flying) return flying; // GETs idénticas concurrentes → 1 sola request
  }

  net(1);
  const p = doFetch(path, opts)
    .then((data) => {
      if (cacheable) _cache.set(key, { t: Date.now(), data });
      return data;
    })
    .finally(() => {
      net(-1);
      if (cacheable) _inflight.delete(key);
    });

  if (cacheable) _inflight.set(key, p);
  return p;
};

/** Invalida la micro-caché (tras una mutación que cambia datos). */
export const apiBust = (match) => {
  for (const k of [..._cache.keys()]) if (!match || k.includes(match)) _cache.delete(k);
};

/**
 * apiSafe — wrapper que NUNCA tira. Devuelve { data, error }.
 * Usalo cuando la UI debe renderizar incluso si el backend no está disponible.
 *
 * Ej:
 *   const { data, error } = await apiSafe('/api/foo', { defaultValue: 'x' });
 *   if (error) showOfflineBadge();
 */
export const apiSafe = async (path, fallback = null, opts = {}) => {
  try {
    const data = await api(path, opts);
    return { data, error: null };
  } catch (error) {
    if (typeof window !== 'undefined' && window.console) {
      console.warn(`[apiSafe] ${path} falló (usando fallback):`, error.message); // eslint-disable-line no-console
    }
    return { data: fallback, error };
  }
};

/** Versión bulk: pide múltiples paths y devuelve {data, errors} con defaults por path */
export const apiSafeAll = async (paths) => {
  const entries = Object.entries(paths);
  const results = await Promise.all(
    entries.map(async ([key, spec]) => {
      const path = typeof spec === 'string' ? spec : spec.path;
      const fallback = typeof spec === 'string' ? null : spec.fallback;
      const { data, error } = await apiSafe(path, fallback);
      return [key, { data, error }];
    }),
  );
  return Object.fromEntries(results);
};
