/**
 * Canva Connect — integración oficial sin browser.
 *
 * Canva Connect API (oficial, dev portal canva.dev) → OAuth2 + endpoints
 * para crear/editar diseños, aplicar brand kit, exportar PNG/PDF/MP4.
 *
 * Reemplaza la idea de "CU abre Canva en browser" (no funciona en serverless).
 * Esta es la versión REAL que funciona desde cualquier server.
 *
 * Requiere registrar app en canva.dev → env CANVA_CLIENT_ID, CANVA_CLIENT_SECRET,
 * CANVA_REDIRECT_URI. Sin esas vars → endpoints devuelven instrucciones.
 *
 * Docs: https://www.canva.dev/docs/connect/
 */

import * as store from './_store.js';

const ENV = process.env;
const CANVA_API = 'https://api.canva.com/rest/v1';
const CANVA_AUTH = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN = 'https://api.canva.com/rest/v1/oauth/token';
const CANVA_SCOPES = [
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  'asset:read',
  'asset:write',
  'brandtemplate:meta:read',
  'brandtemplate:content:read',
].join(' ');

export const canvaConfigured = () => Boolean(ENV.CANVA_CLIENT_ID && ENV.CANVA_CLIENT_SECRET && ENV.CANVA_REDIRECT_URI);

const tokenKey = (scope) => `feedia:canva:${scope || 'anon'}:token`;
const stateKey = (s) => `feedia:canva:state:${s}`;
const randState = () => `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const getToken = async (scope) => {
  try {
    return await store.get(tokenKey(scope));
  } catch {
    return null;
  }
};
const setToken = async (scope, val) => {
  try {
    await store.set(tokenKey(scope), val);
  } catch {}
};

// ── OAuth ────────────────────────────────────────────────────────────────────
export const canvaAuthUrl = async (scope) => {
  const state = randState();
  await store.set(stateKey(state), { scope }).catch(() => {});
  await store.expire(stateKey(state), 600).catch(() => {});
  const u = new URL(CANVA_AUTH);
  u.searchParams.set('client_id', ENV.CANVA_CLIENT_ID);
  u.searchParams.set('redirect_uri', ENV.CANVA_REDIRECT_URI);
  u.searchParams.set('scope', CANVA_SCOPES);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('state', state);
  return u.toString();
};

export const canvaExchangeCode = async (code, state) => {
  const st = await store.get(stateKey(state)).catch(() => null);
  const scope = st?.scope || 'anon';
  const basic = Buffer.from(`${ENV.CANVA_CLIENT_ID}:${ENV.CANVA_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(CANVA_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: ENV.CANVA_REDIRECT_URI }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`canva exchange: ${JSON.stringify(j).slice(0, 200)}`);
  const rec = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in || 14400) * 1000,
    scope,
  };
  await setToken(scope, rec);
  return rec;
};

// ── API helpers ──────────────────────────────────────────────────────────────
const apiCall = async (scope, path, opts = {}) => {
  const t = await getToken(scope);
  if (!t?.accessToken) return { error: 'not-connected' };
  const r = await fetch(`${CANVA_API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${t.accessToken}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = JSON.stringify(j).slice(0, 300);
    const orgDisabled = r.status === 403 && (msg.includes('organization') || msg.includes('org') || msg.includes('disabled'));
    if (orgDisabled) return { error: 'org-disabled', status: 403, message: 'El admin de tu organización Canva deshabilitó el acceso a apps. Ir a Canva → Configuración → Aplicaciones → activar acceso de desarrolladores. O usá una cuenta personal.' };
    return { error: 'canva-api', status: r.status, message: msg };
  }
  return j;
};

// Lista brand templates disponibles
export const listBrandTemplates = async (scope) => apiCall(scope, '/brand-templates?limit=20');

// Crea diseño desde un brand template + autofill data
export const createFromBrandTemplate = async (scope, { templateId, data }) =>
  apiCall(scope, `/autofills`, { method: 'POST', body: JSON.stringify({ brand_template_id: templateId, data }) });

// Crea diseño en blanco con tipo
export const createDesign = async (scope, { designType = 'instagram-post' }) =>
  apiCall(scope, '/designs', {
    method: 'POST',
    body: JSON.stringify({ design_type: { type: 'preset', name: designType } }),
  });

// Exporta a PNG/JPG/PDF/MP4
export const exportDesign = async (scope, { designId, format = 'png' }) => {
  const job = await apiCall(scope, '/exports', {
    method: 'POST',
    body: JSON.stringify({ design_id: designId, format: { type: format } }),
  });
  return job; // { job: { id, status, urls: [...] } }
};

export const getExportStatus = async (scope, jobId) => apiCall(scope, `/exports/${jobId}`);

// Sube asset (foto del usuario)
export const uploadAsset = async (scope, { name, url }) =>
  apiCall(scope, '/asset-uploads', {
    method: 'POST',
    body: JSON.stringify({ name_base64: Buffer.from(name).toString('base64'), source: { type: 'url', url } }),
  });

// ── Connection status ───────────────────────────────────────────────────────
export const canvaStatus = async (scope) => {
  const t = await getToken(scope);
  return { configured: canvaConfigured(), connected: Boolean(t?.accessToken), expiresAt: t?.expiresAt || null };
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleCanvaConnect = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };
  const redirect = (url) => {
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.end();
    return true;
  };
  const setupMsg =
    'Canva no configurado. Faltan env vars CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI. Crear app en canva.dev → activar Connect API.';

  if (path === '/api/canva/status' && m === 'GET') return json(200, await canvaStatus(scope));

  if (path === '/api/canva/start' && m === 'GET') {
    if (!canvaConfigured()) return json(200, { error: 'not-configured', message: setupMsg });
    return redirect(await canvaAuthUrl(scope));
  }
  if (path === '/api/canva/callback' && m === 'GET') {
    if (!canvaConfigured()) return json(200, { error: 'not-configured', message: setupMsg });
    try {
      const url = new URL(req.url, 'http://x');
      const code = url.searchParams.get('code'),
        state = url.searchParams.get('state');
      if (!code) return json(400, { error: 'no-code' });
      await canvaExchangeCode(code, state);
      return redirect('/?connected=canva');
    } catch (e) {
      return json(500, { error: 'callback', message: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/canva/templates' && m === 'GET') return json(200, await listBrandTemplates(scope));

  if (path === '/api/canva/autofill' && m === 'POST') {
    return json(200, await createFromBrandTemplate(scope, { templateId: body?.templateId, data: body?.data || {} }));
  }
  if (path === '/api/canva/export' && m === 'POST') {
    return json(200, await exportDesign(scope, { designId: body?.designId, format: body?.format || 'png' }));
  }
  if (path === '/api/canva/export-status' && m === 'GET') {
    const url = new URL(req.url, 'http://x');
    return json(200, await getExportStatus(scope, url.searchParams.get('jobId')));
  }
  if (path === '/api/canva/upload-asset' && m === 'POST') {
    return json(200, await uploadAsset(scope, { name: body?.name || 'feedia-asset', url: body?.url }));
  }

  return false;
};
