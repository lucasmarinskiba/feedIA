/**
 * OAuth de redes para FeedIA (serverless).
 *
 * TikTok Login Kit + Instagram Login. Tokens se almacenan POR USUARIO autenticado
 * (cookie feedia_session). Si no hay sesión, almacena en global como fallback demo.
 */
import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';

const BASE = process.env.PUBLIC_BASE_URL || 'https://feedia.vercel.app';
const TT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const TT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';
const TT_REDIRECT = `${BASE}/api/auth/tiktok/callback`;
const TT_SCOPES = 'user.info.basic,user.info.profile,user.info.stats,video.list';

const IG_APP_ID = process.env.IG_CLIENT_ID || '';
const IG_APP_SECRET = process.env.IG_CLIENT_SECRET || '';
const IG_REDIRECT = `${BASE}/api/auth/instagram/callback`;
const IG_SCOPES =
  'instagram_business_basic,instagram_business_manage_insights,instagram_business_manage_comments,instagram_business_content_publish';

const redirect = (res, url) => {
  res.statusCode = 302;
  res.setHeader('location', url);
  res.end();
};
const html = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(body);
};

const tokenKey = (userId, platform) =>
  userId ? `feedia:user:${userId}:token:${platform}` : `feedia:token:${platform}`;

export const handleAuth = async (req, res, path, m, body, search) => {
  // ── TikTok login ────────────────────────────────────────────────────────
  if (path === '/api/auth/tiktok/login' && m === 'GET') {
    if (!TT_KEY) {
      html(res, 500, '<p>Falta TIKTOK_CLIENT_KEY en env.</p>');
      return true;
    }
    const ctx = await getSessionFromReq(req);
    if (ctx) {
      const { checkQuota } = await import('./_usage.js');
      const ttCount = (ctx.user.connectedPlatforms || []).filter((p) => p === 'tiktok').length;
      const q = await checkQuota(ctx.user.id, ctx.user.plan || 'free', 'tt-account', { currentCount: ttCount });
      if (!q.ok) {
        html(res, 402, `<h2>Límite de cuentas alcanzado</h2><p>${q.reason}</p><a href="/pricing.html">Ver planes</a>`);
        return true;
      }
    }
    const state = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await store.set(`feedia:oauth:state:${state}`, {
      ts: Date.now(),
      userId: ctx?.user?.id || null,
      platform: 'tiktok',
    });
    const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
    u.searchParams.set('client_key', TT_KEY);
    u.searchParams.set('scope', TT_SCOPES);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri', TT_REDIRECT);
    u.searchParams.set('state', state);
    redirect(res, u.toString());
    return true;
  }

  if (path === '/api/auth/tiktok/callback' && m === 'GET') {
    const code = search.get('code');
    const state = search.get('state');
    const err = search.get('error');
    if (err || !code) {
      html(res, 400, `<h2>Autorización TikTok fallida</h2><p>${err || 'sin code'}</p><a href="/">Volver</a>`);
      return true;
    }
    const stateData = state ? await store.get(`feedia:oauth:state:${state}`) : null;
    if (state) await store.del(`feedia:oauth:state:${state}`);
    try {
      const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: TT_KEY,
          client_secret: TT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: TT_REDIRECT,
        }).toString(),
      });
      const j = await r.json();
      const tok = j?.access_token || j?.data?.access_token;
      if (!tok) {
        html(res, 400, `<h2>No se pudo obtener el token</h2><pre>${JSON.stringify(j).slice(0, 500)}</pre>`);
        return true;
      }

      const userId = stateData?.userId || (await getSessionFromReq(req))?.user?.id || null;
      const payload = {
        access_token: tok,
        refresh_token: j.refresh_token || j?.data?.refresh_token || '',
        open_id: j.open_id || j?.data?.open_id || '',
        expires_at: Date.now() + (j.expires_in || j?.data?.expires_in || 86400) * 1000,
        saved_at: new Date().toISOString(),
      };
      await store.set(tokenKey(userId, 'tiktok'), payload);

      if (userId) {
        const u = await store.get(`feedia:user:${userId}`);
        if (u) {
          u.connectedPlatforms = Array.from(new Set([...(u.connectedPlatforms || []), 'tiktok']));
          await store.set(`feedia:user:${userId}`, u);
        }
      }

      html(
        res,
        200,
        '<h2>✅ TikTok conectado</h2><p>Tu cuenta de TikTok quedó anexada a FeedIA. Podés cerrar esta pestaña.</p><a href="/">Ir a FeedIA</a><script>setTimeout(()=>{location.href="/?connected=tiktok";},1500);</script>',
      );
    } catch (e) {
      html(res, 500, `<h2>Error</h2><pre>${String(e)}</pre>`);
    }
    return true;
  }

  // ── Instagram login ─────────────────────────────────────────────────────
  if (path === '/api/auth/instagram/login' && m === 'GET') {
    if (!IG_APP_ID) {
      html(res, 500, '<p>Falta IG_CLIENT_ID en env.</p>');
      return true;
    }
    const ctx = await getSessionFromReq(req);
    if (ctx) {
      const { checkQuota } = await import('./_usage.js');
      const igCount = (ctx.user.connectedPlatforms || []).filter((p) => p === 'instagram').length;
      const q = await checkQuota(ctx.user.id, ctx.user.plan || 'free', 'ig-account', { currentCount: igCount });
      if (!q.ok) {
        html(res, 402, `<h2>Límite de cuentas alcanzado</h2><p>${q.reason}</p><a href="/pricing.html">Ver planes</a>`);
        return true;
      }
    }
    const state = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await store.set(`feedia:oauth:state:${state}`, {
      ts: Date.now(),
      userId: ctx?.user?.id || null,
      platform: 'instagram',
    });
    const u = new URL('https://www.instagram.com/oauth/authorize');
    u.searchParams.set('client_id', IG_APP_ID);
    u.searchParams.set('redirect_uri', IG_REDIRECT);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', IG_SCOPES);
    u.searchParams.set('state', state);
    redirect(res, u.toString());
    return true;
  }

  if (path === '/api/auth/instagram/callback' && m === 'GET') {
    const code = (search.get('code') || '').replace(/#_$/, '');
    const state = search.get('state');
    const err = search.get('error');
    if (err || !code) {
      html(res, 400, `<h2>Autorización Instagram fallida</h2><p>${err || 'sin code'}</p><a href="/">Volver</a>`);
      return true;
    }
    const stateData = state ? await store.get(`feedia:oauth:state:${state}`) : null;
    if (state) await store.del(`feedia:oauth:state:${state}`);
    try {
      const r = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: IG_APP_ID,
          client_secret: IG_APP_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: IG_REDIRECT,
          code,
        }).toString(),
      });
      const j = await r.json();
      const short = j?.access_token;
      if (!short) {
        html(res, 400, `<h2>No se pudo obtener el token</h2><pre>${JSON.stringify(j).slice(0, 500)}</pre>`);
        return true;
      }
      const lr = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${short}`,
      );
      const lj = await lr.json();
      const longTok = lj?.access_token || short;

      const userId = stateData?.userId || (await getSessionFromReq(req))?.user?.id || null;
      const payload = {
        access_token: longTok,
        user_id: j.user_id || '',
        expires_at: Date.now() + (lj?.expires_in || 5184000) * 1000,
        saved_at: new Date().toISOString(),
      };
      await store.set(tokenKey(userId, 'instagram'), payload);

      if (userId) {
        const u = await store.get(`feedia:user:${userId}`);
        if (u) {
          u.connectedPlatforms = Array.from(new Set([...(u.connectedPlatforms || []), 'instagram']));
          await store.set(`feedia:user:${userId}`, u);
        }
      }

      html(
        res,
        200,
        '<h2>✅ Instagram conectado</h2><p>Tu cuenta de Instagram quedó anexada a FeedIA. Podés cerrar esta pestaña.</p><a href="/">Ir a FeedIA</a><script>setTimeout(()=>{location.href="/?connected=instagram";},1500);</script>',
      );
    } catch (e) {
      html(res, 500, `<h2>Error</h2><pre>${String(e)}</pre>`);
    }
    return true;
  }

  // ── Status (legacy) ─────────────────────────────────────────────────────
  if (path === '/api/auth/status' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    const userId = ctx?.user?.id || null;
    const tt = await store.get(tokenKey(userId, 'tiktok'));
    const ig = await store.get(tokenKey(userId, 'instagram'));
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        tiktok: tt?.access_token
          ? { connected: true, savedAt: tt.saved_at }
          : { connected: false, loginUrl: `${BASE}/api/auth/tiktok/login` },
        instagram: ig?.access_token
          ? { connected: true, savedAt: ig.saved_at }
          : {
              connected: IG_APP_ID ? false : 'no-app',
              loginUrl: IG_APP_ID ? `${BASE}/api/auth/instagram/login` : null,
            },
      }),
    );
    return true;
  }

  return false;
};
