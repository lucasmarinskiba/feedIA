/**
 * Social Connect — integración REAL con Instagram (Meta Graph API) y TikTok
 * (Content Posting API). OAuth + almacenamiento de tokens + publicación + lectura
 * de métricas reales que alimentan la memoria por cuenta.
 *
 * REQUIERE setup externo del usuario (no se puede saltar legalmente):
 *   Instagram — flujo "Instagram API with Instagram Login" (NO necesita Facebook Page):
 *     - App de Meta (developers.facebook.com) → producto Instagram → "API setup with Instagram login"
 *     - Cuenta IG Profesional (Business/Creator). NO requiere Página de Facebook.
 *     - Agregar la cuenta IG como Instagram Tester (y aceptar invite en la app IG)
 *     - App review de Meta para instagram_business_content_publish (solo para terceros; tu propia cuenta como tester no lo necesita)
 *     - Env: META_APP_ID/META_APP_SECRET = Instagram App ID/Secret; META_REDIRECT_URI
 *   TikTok:
 *     - App de TikTok (developers.tiktok.com) con scope video.publish/video.upload
 *     - App audit de TikTok para publicar público (sin audit = solo SELF_ONLY/sandbox)
 *     - Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI
 *
 * Sin estas env vars → los endpoints devuelven instrucciones claras (no rompen).
 * Diseño honesto: si no hay token/credenciales, dice exactamente qué falta.
 */

import * as store from './_store.js';
import { recordMetrics } from './_accountMemory.js';

const ENV = process.env;

// ── Config / disponibilidad ──
export const metaConfigured = () => Boolean(ENV.META_APP_ID && ENV.META_APP_SECRET && ENV.META_REDIRECT_URI);
export const tiktokConfigured = () =>
  Boolean(ENV.TIKTOK_CLIENT_KEY && ENV.TIKTOK_CLIENT_SECRET && ENV.TIKTOK_REDIRECT_URI);

const tokKey = (scope, platform) => `feedia:social:${scope || 'anon'}:${platform}`;
const stateKey = (state) => `feedia:social:oauthstate:${state}`;
const randState = () => `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

const getToken = async (scope, platform) => {
  try {
    return await store.get(tokKey(scope, platform));
  } catch {
    return null;
  }
};
const setToken = async (scope, platform, val) => {
  try {
    await store.set(tokKey(scope, platform), val);
  } catch {}
};

// ── Instagram OAuth — flujo "Instagram API with Instagram Login" (SIN Facebook Page) ──
// graph.instagram.com (no graph.facebook.com). META_APP_ID/SECRET = Instagram App ID/Secret.
const IG_GRAPH = 'https://graph.instagram.com';
const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
  'instagram_business_manage_comments',
].join(',');

export const igAuthUrl = async (scope) => {
  const state = randState();
  await store.set(stateKey(state), { scope, platform: 'instagram' }).catch(() => {});
  await store.expire(stateKey(state), 600).catch(() => {});
  const u = new URL('https://www.instagram.com/oauth/authorize');
  u.searchParams.set('client_id', ENV.META_APP_ID);
  u.searchParams.set('redirect_uri', ENV.META_REDIRECT_URI);
  u.searchParams.set('scope', IG_SCOPES);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);
  return u.toString();
};

const igExchangeCode = async (code) => {
  // 1) code → short-lived token + user_id (POST form a api.instagram.com)
  const r = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: ENV.META_APP_ID,
      client_secret: ENV.META_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: ENV.META_REDIRECT_URI,
      code,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`exchange: ${JSON.stringify(j).slice(0, 200)}`);
  // 2) short → long-lived (60d) vía graph.instagram.com
  const u2 = new URL(`${IG_GRAPH}/access_token`);
  u2.searchParams.set('grant_type', 'ig_exchange_token');
  u2.searchParams.set('client_secret', ENV.META_APP_SECRET);
  u2.searchParams.set('access_token', j.access_token);
  const r2 = await fetch(u2);
  const j2 = await r2.json();
  return { token: j2.access_token || j.access_token, expiresIn: j2.expires_in || 5184000, igUserId: String(j.user_id) };
};

export const igHandleCallback = async (code, state) => {
  const st = await store.get(stateKey(state)).catch(() => null);
  const scope = st?.scope || 'anon';
  const { token, expiresIn, igUserId } = await igExchangeCode(code);
  // username vía /me (Instagram Login)
  let username = null;
  try {
    const me = await (await fetch(`${IG_GRAPH}/v21.0/me?fields=user_id,username&access_token=${token}`)).json();
    username = me.username || null;
  } catch {
    /* opcional */
  }
  const rec = {
    accessToken: token,
    igUserId,
    username,
    expiresAt: Date.now() + expiresIn * 1000,
    connectedAt: new Date().toISOString(),
  };
  await setToken(scope, 'instagram', rec);
  return { username, igUserId };
};

// Publica imagen en IG: media container → publish. imageUrl debe ser URL pública.
export const igPublish = async (scope, { imageUrl, caption }) => {
  const t = await getToken(scope, 'instagram');
  if (!t?.accessToken) return { error: 'not-connected', message: 'Conectá tu cuenta de Instagram primero.' };
  if (!imageUrl) return { error: 'no-media', message: 'Falta imageUrl pública.' };
  // 1) crear container
  const cr = await fetch(`${IG_GRAPH}/v21.0/${t.igUserId}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: caption || '', access_token: t.accessToken }),
  });
  const cj = await cr.json();
  if (!cj.id) return { error: 'container', message: JSON.stringify(cj).slice(0, 200) };
  // 2) publicar
  const pr = await fetch(`${IG_GRAPH}/v21.0/${t.igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: cj.id, access_token: t.accessToken }),
  });
  const pj = await pr.json();
  if (!pj.id) return { error: 'publish', message: JSON.stringify(pj).slice(0, 200) };
  return { ok: true, mediaId: pj.id };
};

// Lee insights reales de los últimos posts → los registra en la memoria por cuenta.
export const igSyncInsights = async (scope, accountId) => {
  const t = await getToken(scope, 'instagram');
  if (!t?.accessToken) return { error: 'not-connected', message: 'Conectá tu cuenta de Instagram primero.' };
  const fields = 'id,caption,media_type,timestamp,like_count,comments_count,insights.metric(reach,saved,shares)';
  const r = await fetch(
    `${IG_GRAPH}/v21.0/${t.igUserId}/media?fields=${encodeURIComponent(fields)}&limit=15&access_token=${t.accessToken}`,
  );
  const j = await r.json();
  if (!Array.isArray(j.data)) return { error: 'fetch', message: JSON.stringify(j).slice(0, 200) };
  const acct = accountId || t.username || 'default';
  let synced = 0;
  for (const post of j.data) {
    const ins = {};
    for (const it of post.insights?.data || []) ins[it.name] = it.values?.[0]?.value;
    await recordMetrics(scope, acct, {
      topic: (post.caption || '').slice(0, 80),
      format: post.media_type === 'VIDEO' ? 'reel' : post.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'post',
      reach: ins.reach ?? null,
      saves: ins.saved ?? null,
      shares: ins.shares ?? null,
      likes: post.like_count ?? null,
      comments: post.comments_count ?? null,
      postedAt: post.timestamp || null,
      url: `https://instagram.com/p/${post.id}`,
    });
    synced++;
  }
  return { ok: true, synced };
};

// ── TikTok OAuth ──
const TT_SCOPES = ['user.info.basic', 'video.publish', 'video.upload'].join(',');

export const ttAuthUrl = async (scope) => {
  const state = randState();
  await store.set(stateKey(state), { scope, platform: 'tiktok' }).catch(() => {});
  await store.expire(stateKey(state), 600).catch(() => {});
  const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
  u.searchParams.set('client_key', ENV.TIKTOK_CLIENT_KEY);
  u.searchParams.set('scope', TT_SCOPES);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', ENV.TIKTOK_REDIRECT_URI);
  u.searchParams.set('state', state);
  return u.toString();
};

export const ttHandleCallback = async (code, state) => {
  const st = await store.get(stateKey(state)).catch(() => null);
  const scope = st?.scope || 'anon';
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: ENV.TIKTOK_CLIENT_KEY,
      client_secret: ENV.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: ENV.TIKTOK_REDIRECT_URI,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`tiktok token: ${JSON.stringify(j).slice(0, 200)}`);
  const rec = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    openId: j.open_id,
    scope: j.scope,
    expiresAt: Date.now() + (j.expires_in || 86400) * 1000,
    connectedAt: new Date().toISOString(),
  };
  await setToken(scope, 'tiktok', rec);
  return { openId: j.open_id };
};

// Publica video TikTok vía PULL_FROM_URL (videoUrl debe ser pública y dominio verificado en la app).
export const ttPublish = async (scope, { videoUrl, caption }) => {
  const t = await getToken(scope, 'tiktok');
  if (!t?.accessToken) return { error: 'not-connected', message: 'Conectá tu cuenta de TikTok primero.' };
  if (!videoUrl) return { error: 'no-media', message: 'Falta videoUrl pública (dominio verificado en tu app TikTok).' };
  const r = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      post_info: { title: caption || '', privacy_level: 'SELF_ONLY', disable_comment: false },
      source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
    }),
  });
  const j = await r.json();
  if (j.error && j.error.code !== 'ok') return { error: 'publish', message: JSON.stringify(j.error).slice(0, 200) };
  return {
    ok: true,
    publishId: j.data?.publish_id,
    note: 'Sin app-audit de TikTok, el post queda SELF_ONLY (privado).',
  };
};

export const connectionStatus = async (scope) => {
  const [ig, tt] = await Promise.all([getToken(scope, 'instagram'), getToken(scope, 'tiktok')]);
  return {
    instagram: {
      configured: metaConfigured(),
      connected: Boolean(ig?.accessToken),
      username: ig?.username || null,
      expiresAt: ig?.expiresAt || null,
    },
    tiktok: {
      configured: tiktokConfigured(),
      connected: Boolean(tt?.accessToken),
      openId: tt?.openId || null,
      expiresAt: tt?.expiresAt || null,
    },
  };
};

// ── HTTP handler (montado bajo /api/connect/ y /api/publish/) ──
export const handleSocialConnect = async (req, res, path, m, body, ctx = {}) => {
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
  const setupMsg = (platform) =>
    platform === 'instagram'
      ? 'Instagram no configurado. Faltan env vars META_APP_ID, META_APP_SECRET, META_REDIRECT_URI (Instagram App ID/Secret del flujo "Instagram API with Instagram Login").'
      : 'TikTok no configurado. Faltan env vars TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI. Creá una app en developers.tiktok.com.';

  if (path === '/api/connect/status' && m === 'GET') return json(200, await connectionStatus(scope));

  if (path === '/api/connect/instagram/start' && m === 'GET') {
    if (!metaConfigured()) return json(200, { error: 'not-configured', message: setupMsg('instagram') });
    return redirect(await igAuthUrl(scope));
  }
  if (path === '/api/connect/instagram/callback' && m === 'GET') {
    if (!metaConfigured()) return json(200, { error: 'not-configured', message: setupMsg('instagram') });
    try {
      const url = new URL(req.url, 'http://x');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) return json(400, { error: 'no-code' });
      const out = await igHandleCallback(code, state);
      return redirect(`/?connected=instagram&user=${encodeURIComponent(out.username || '')}`);
    } catch (e) {
      return json(500, { error: 'callback', message: String(e?.message || e).slice(0, 200) });
    }
  }
  if (path === '/api/connect/instagram/sync' && m === 'POST') {
    return json(200, await igSyncInsights(scope, body?.accountId));
  }

  if (path === '/api/connect/tiktok/start' && m === 'GET') {
    if (!tiktokConfigured()) return json(200, { error: 'not-configured', message: setupMsg('tiktok') });
    return redirect(await ttAuthUrl(scope));
  }
  if (path === '/api/connect/tiktok/callback' && m === 'GET') {
    if (!tiktokConfigured()) return json(200, { error: 'not-configured', message: setupMsg('tiktok') });
    try {
      const url = new URL(req.url, 'http://x');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) return json(400, { error: 'no-code' });
      await ttHandleCallback(code, state);
      return redirect('/?connected=tiktok');
    } catch (e) {
      return json(500, { error: 'callback', message: String(e?.message || e).slice(0, 200) });
    }
  }

  if (path === '/api/publish/instagram' && m === 'POST') return json(200, await igPublish(scope, body || {}));
  if (path === '/api/publish/tiktok' && m === 'POST') return json(200, await ttPublish(scope, body || {}));

  return false;
};
