/**
 * Clientes de redes REALES para FeedIA (serverless).
 *
 * Instagram Graph API  → env: IG_ACCESS_TOKEN, IG_BUSINESS_ID
 * TikTok Display API   → env: TIKTOK_ACCESS_TOKEN
 *
 * Si el token existe, devuelve datos REALES (perfil, insights, media).
 * Si no, devuelve demo (mismos campos) para que la UI no se rompa.
 * Cada respuesta marca `real: true|false`.
 */

import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';

const IG_TOKEN = process.env.IG_ACCESS_TOKEN || '';
const IG_ID = process.env.IG_BUSINESS_ID || '';
const GRAPH = 'https://graph.facebook.com/v21.0';
const IG_GRAPH = 'https://graph.instagram.com/v21.0';

export const HAS_IG = Boolean(IG_TOKEN && IG_ID); // modo Business por env (compat)

const userTokenKey = (userId, platform) =>
  userId ? `feedia:user:${userId}:token:${platform}` : `feedia:token:${platform}`;

const resolveUserId = async (req) => {
  if (!req) return null;
  try {
    const ctx = await getSessionFromReq(req);
    return ctx?.user?.id || null;
  } catch {
    return null;
  }
};

// Resuelve credenciales IG: token del usuario autenticado, o env Business, o global store.
const igResolve = async (req) => {
  const userId = await resolveUserId(req);
  if (userId) {
    const t = await store.get(userTokenKey(userId, 'instagram'));
    if (t?.access_token) return { token: t.access_token, base: IG_GRAPH, id: 'me', mode: 'user-login' };
  }
  if (IG_TOKEN && IG_ID) return { token: IG_TOKEN, base: GRAPH, id: IG_ID, mode: 'business' };
  const t = await store.get('feedia:token:instagram');
  if (t?.access_token) return { token: t.access_token, base: IG_GRAPH, id: 'me', mode: 'login' };
  return null;
};
export const igConnected = async (req) => Boolean(await igResolve(req));

// Token TikTok: usuario autenticado, env, o global.
export const ttToken = async (req) => {
  const userId = await resolveUserId(req);
  if (userId) {
    const t = await store.get(userTokenKey(userId, 'tiktok'));
    if (t?.access_token) return t.access_token;
  }
  if (process.env.TIKTOK_ACCESS_TOKEN) return process.env.TIKTOK_ACCESS_TOKEN;
  const t = await store.get('feedia:token:tiktok');
  return t?.access_token || '';
};
export const ttConnected = async () => Boolean(await ttToken());
// Compat: indica si hay token TikTok por env (sincrónico). El real puede venir del store.
export const HAS_TT = Boolean(process.env.TIKTOK_ACCESS_TOKEN);

const getJson = async (url, opts) => {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

// ── Demo fallbacks (solo visitantes sin sesión) ──────────────────────────────
const DEMO_IG = {
  handle: 'paithonlabs',
  name: 'Paithon Labs',
  avatar: 'https://placehold.co/96/bc1888/fff?text=PL',
  followers: 12300,
  following: 540,
  likes: 0,
  posts: 214,
  bio: 'Automatización con IA · contenido que crece 📷',
  real: false,
  demoMode: true,
};
const DEMO_TT = {
  handle: 'paithonlabs',
  name: 'Paithon Labs',
  avatar: 'https://placehold.co/96/FE2C55/fff?text=PL',
  followers: 18400,
  following: 312,
  likes: 247600,
  posts: 86,
  bio: 'IA que administra tu marca · tips diarios 🎵',
  real: false,
  demoMode: true,
};

// Estado fresco: usuario autenticado sin conexión de red — cero datos.
const freshIg = (user) => ({
  handle: '',
  name: user?.displayName || '',
  avatar: '',
  followers: 0,
  following: 0,
  likes: 0,
  posts: 0,
  bio: '',
  real: false,
  demoMode: false,
  accountFresh: true,
  connected: false,
});
const freshTt = (user) => ({
  handle: '',
  name: user?.displayName || '',
  avatar: '',
  followers: 0,
  following: 0,
  likes: 0,
  posts: 0,
  bio: '',
  real: false,
  demoMode: false,
  accountFresh: true,
  connected: false,
});

// ── Instagram (Business via Graph, o Instagram-Login via graph.instagram.com) ──
export const igProfile = async (req) => {
  const c = await igResolve(req);
  if (!c) {
    const userId = await resolveUserId(req);
    if (userId) {
      const u = await store.get(`feedia:user:${userId}`);
      return freshIg(u);
    }
    return DEMO_IG;
  }
  const fields = 'username,name,followers_count,follows_count,media_count,biography,profile_picture_url';
  const j = await getJson(`${c.base}/${c.id}?fields=${fields}&access_token=${c.token}`);
  if (!j || j.error) return { ...DEMO_IG, real: false, error: j?.error?.message };
  return {
    handle: j.username,
    name: j.name || j.username,
    avatar: j.profile_picture_url || DEMO_IG.avatar,
    followers: j.followers_count ?? 0,
    following: j.follows_count ?? 0,
    likes: 0,
    posts: j.media_count ?? 0,
    bio: j.biography || '',
    real: true,
  };
};

export const igInsights = async (req) => {
  const c = await igResolve(req);
  if (!c) return { real: false };
  const metric = 'reach,impressions,profile_views,accounts_engaged';
  const j = await getJson(`${c.base}/${c.id}/insights?metric=${metric}&period=day&access_token=${c.token}`);
  if (!j || !j.data) return { real: false, error: j?.error?.message };
  const out = {};
  for (const d of j.data) out[d.name] = d.values?.[d.values.length - 1]?.value ?? 0;
  return { real: true, ...out };
};

export const igMedia = async (limit = 12, req) => {
  const c = await igResolve(req);
  if (!c) return { real: false, media: [] };
  const fields = 'id,caption,media_type,like_count,comments_count,timestamp,permalink';
  const j = await getJson(`${c.base}/${c.id}/media?fields=${fields}&limit=${limit}&access_token=${c.token}`);
  if (!j || !j.data) return { real: false, media: [], error: j?.error?.message };
  return { real: true, media: j.data };
};

// ── TikTok (Display API v2) ────────────────────────────────────────────────────
export const ttProfile = async (req) => {
  const TT_TOKEN = await ttToken(req);
  if (!TT_TOKEN) {
    const userId = await resolveUserId(req);
    if (userId) {
      const u = await store.get(`feedia:user:${userId}`);
      return freshTt(u);
    }
    return DEMO_TT;
  }
  const fields =
    'display_name,follower_count,following_count,likes_count,video_count,avatar_url,bio_description,username';
  const j = await getJson(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${TT_TOKEN}` },
  });
  const u = j?.data?.user;
  if (!u) return { ...DEMO_TT, real: false, error: j?.error?.message };
  return {
    handle: u.username || u.display_name,
    name: u.display_name,
    avatar: u.avatar_url || DEMO_TT.avatar,
    followers: u.follower_count ?? 0,
    following: u.following_count ?? 0,
    likes: u.likes_count ?? 0,
    posts: u.video_count ?? 0,
    bio: u.bio_description || '',
    real: true,
  };
};

export const ttVideos = async (max = 10, req) => {
  const TT_TOKEN = await ttToken(req);
  if (!TT_TOKEN) return { real: false, videos: [] };
  const fields = 'id,title,like_count,comment_count,share_count,view_count,create_time';
  const j = await getJson(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TT_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ max_count: max }),
  });
  const v = j?.data?.videos;
  if (!Array.isArray(v)) return { real: false, videos: [], error: j?.error?.message };
  return { real: true, videos: v };
};

export const profileFor = async (platform, req) => (platform === 'instagram' ? igProfile(req) : ttProfile(req));

// ── Publish (Instagram Graph API — container flow) ───────────────────────────

export const igPublishImage = async (imageUrl, caption, req) => {
  const c = await igResolve(req);
  if (!c) return { ok: false, error: 'No IG token — connect Instagram in Settings first' };
  const r1 = await fetch(`${c.base}/${c.id}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: c.token }),
  });
  const j1 = await r1.json();
  if (!j1?.id) return { ok: false, error: j1?.error?.message || 'Container creation failed', details: j1 };
  const r2 = await fetch(`${c.base}/${c.id}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: j1.id, access_token: c.token }),
  });
  const j2 = await r2.json();
  return j2?.id
    ? { ok: true, mediaId: j2.id, platform: 'instagram', type: 'image' }
    : { ok: false, error: j2?.error?.message, details: j2 };
};

export const igPublishReel = async (videoUrl, caption, req) => {
  const c = await igResolve(req);
  if (!c) return { ok: false, error: 'No IG token — connect Instagram in Settings first' };
  const r1 = await fetch(`${c.base}/${c.id}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, access_token: c.token }),
  });
  const j1 = await r1.json();
  if (!j1?.id) return { ok: false, error: j1?.error?.message || 'Container creation failed', details: j1 };
  // Poll until ready (max 5 checks × 5s = 25s — within Vercel 60s limit)
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const st = await getJson(`${c.base}/${j1.id}?fields=status_code&access_token=${c.token}`);
    if (st?.status_code === 'FINISHED') break;
    if (st?.status_code === 'ERROR') return { ok: false, error: 'Video processing failed on Instagram side' };
  }
  const r2 = await fetch(`${c.base}/${c.id}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: j1.id, access_token: c.token }),
  });
  const j2 = await r2.json();
  return j2?.id
    ? { ok: true, mediaId: j2.id, platform: 'instagram', type: 'reel' }
    : { ok: false, error: j2?.error?.message, details: j2 };
};

export const igPublishCarousel = async (imageUrls, caption, req) => {
  const c = await igResolve(req);
  if (!c) return { ok: false, error: 'No IG token — connect Instagram in Settings first' };
  if (!Array.isArray(imageUrls) || imageUrls.length < 2)
    return { ok: false, error: 'Carousel needs at least 2 images' };
  // Step 1: create item containers for each image
  const itemIds = [];
  for (const url of imageUrls.slice(0, 10)) {
    const r = await fetch(`${c.base}/${c.id}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: c.token }),
    });
    const j = await r.json();
    if (!j?.id) return { ok: false, error: `Item container failed for ${url}: ${j?.error?.message}` };
    itemIds.push(j.id);
  }
  // Step 2: create carousel container
  const r2 = await fetch(`${c.base}/${c.id}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media_type: 'CAROUSEL', children: itemIds.join(','), caption, access_token: c.token }),
  });
  const j2 = await r2.json();
  if (!j2?.id) return { ok: false, error: j2?.error?.message || 'Carousel container failed', details: j2 };
  // Step 3: publish
  const r3 = await fetch(`${c.base}/${c.id}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: j2.id, access_token: c.token }),
  });
  const j3 = await r3.json();
  return j3?.id
    ? { ok: true, mediaId: j3.id, platform: 'instagram', type: 'carousel', slides: imageUrls.length }
    : { ok: false, error: j3?.error?.message, details: j3 };
};
