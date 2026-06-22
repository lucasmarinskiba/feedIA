/**
 * Siamese Bridge — endpoints que sincronizan estado entre vanilla y feedia-next.
 *
 * Store compartido: Upstash Redis (mismo namespace 'feedia:*' en ambos proyectos).
 *
 *   GET  /api/bridge/route-map        → mapping vanilla #hash ↔ Next /path
 *   GET  /api/bridge/twin-status      → estado del gemelo + qué APIs viven en cada uno
 *   GET  /api/bridge/session          → identity + brand + tokens IG/TT compartidos
 *   POST /api/bridge/passport         → genera passport opaque para SSO al gemelo
 *   GET  /api/bridge/passport?id=...  → resuelve passport (one-shot)
 *   GET  /api/bridge/route?to=brand-os → redirect a feedia-next con session attached
 */
import * as store from './_store.js';

const NEXT_BASE = process.env.NEXT_BASE_URL || 'https://feedia-next.vercel.app';

const ROUTE_MAP = {
  // vanilla #hash → Next path
  home: '/welcome',
  imperio: '/imperio',
  mission: '/dashboard',
  agenda: '/agenda',
  calendar: '/calendar',
  feed: '/feed',
  predictor: '/predictor',
  'brand-os': '/brand-os',
  'cu-queue': '/cu-queue',
  brain: '/brain',
  approvals: '/approvals',
  'growth-team': '/growth-team',
  simulator: '/simulator',
  'studio-tiktok-script': '/studio/tiktok-script',
  'studio-tiktok-photo': '/studio/tiktok-photo',
};

const TWIN_FEATURES = {
  vanilla: {
    host: 'https://feedia.vercel.app',
    routes: [
      'home',
      'imperio',
      'mission',
      'agenda',
      'calendar',
      'feed',
      'communityHub',
      'optimize',
      'crisis',
      'curador',
      'copywriting',
      'crm',
      'tools',
      'memorabilia',
      'glassbox',
      'equipo',
      'collab',
      'tiktok',
      'meta-ads',
    ],
    exclusive: ['communityHub', 'optimize', 'crisis', 'curador', 'memorabilia', 'glassbox', 'meta-ads', 'tools'],
  },
  next: {
    host: NEXT_BASE,
    routes: [
      'welcome',
      'dashboard',
      'imperio',
      'agenda',
      'calendar',
      'feed',
      'predictor',
      'brand-os',
      'cu-queue',
      'brain',
      'approvals',
      'growth-team',
      'simulator',
      'studio/tiktok-script',
      'studio/tiktok-photo',
    ],
    exclusive: ['predictor', 'brand-os', 'cu-queue', 'growth-team', 'simulator'],
  },
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const PASSPORT_TTL_SEC = 60; // one-shot, 60s window

export const handleBridge = async (req, res, path, m, body, search) => {
  // GET /api/bridge/route-map
  if (path === '/api/bridge/route-map' && m === 'GET') {
    json(res, 200, { vanillaToNext: ROUTE_MAP, twins: TWIN_FEATURES });
    return true;
  }

  // GET /api/bridge/twin-status
  if (path === '/api/bridge/twin-status' && m === 'GET') {
    // ping al gemelo (con timeout corto)
    let nextAlive = false;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(`${NEXT_BASE}/api/system/p0-status`, { signal: ctrl.signal });
      clearTimeout(to);
      nextAlive = r.ok;
    } catch {
      /* off */
    }
    json(res, 200, {
      self: 'vanilla',
      selfAlive: true,
      twin: 'feedia-next',
      twinHost: NEXT_BASE,
      twinAlive: nextAlive,
      sharedStore: 'upstash',
      sharedNamespace: 'feedia:*',
      features: TWIN_FEATURES,
    });
    return true;
  }

  // GET /api/bridge/session — identidad + brand + tokens (shared via Upstash)
  if (path === '/api/bridge/session' && m === 'GET') {
    const [brand, ig, tt, identity] = await Promise.all([
      store.get('feedia:brand'),
      store.get('feedia:token:instagram'),
      store.get('feedia:token:tiktok'),
      store.get('feedia:identity'),
    ]);
    json(res, 200, {
      brand: brand || null,
      identity: identity || null,
      providers: {
        instagram: ig?.access_token
          ? { connected: true, userId: ig.user_id, savedAt: ig.saved_at }
          : { connected: false },
        tiktok: tt?.access_token ? { connected: true, openId: tt.open_id, savedAt: tt.saved_at } : { connected: false },
      },
    });
    return true;
  }

  // POST /api/bridge/passport — issue one-shot passport (vanilla → next)
  if (path === '/api/bridge/passport' && m === 'POST') {
    const id = `psp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const payload = {
      issuedAt: Date.now(),
      expiresAt: Date.now() + PASSPORT_TTL_SEC * 1000,
      from: 'vanilla',
      brandSnapshot: await store.get('feedia:brand'),
      identitySnapshot: await store.get('feedia:identity'),
      targetRoute: body.targetRoute || '/welcome',
    };
    await store.set(`feedia:passport:${id}`, payload);
    json(res, 200, {
      passport: id,
      expiresAt: payload.expiresAt,
      redirect: `${NEXT_BASE}${payload.targetRoute}?passport=${id}`,
    });
    return true;
  }

  // GET /api/bridge/passport?id=... — resolve (one-shot)
  if (path === '/api/bridge/passport' && m === 'GET') {
    const id = search.get('id');
    if (!id) {
      json(res, 400, { error: 'missing-id' });
      return true;
    }
    const data = await store.get(`feedia:passport:${id}`);
    if (!data) {
      json(res, 404, { error: 'not-found-or-expired' });
      return true;
    }
    if (data.expiresAt < Date.now()) {
      json(res, 410, { error: 'expired' });
      return true;
    }
    await store.del(`feedia:passport:${id}`); // one-shot consume
    json(res, 200, data);
    return true;
  }

  // GET /api/bridge/route?to=brand-os&brand=name
  if (path === '/api/bridge/route' && m === 'GET') {
    const to = search.get('to');
    const targetRoute = ROUTE_MAP[to] || to;
    // Create passport + redirect
    const id = `psp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const payload = {
      issuedAt: Date.now(),
      expiresAt: Date.now() + PASSPORT_TTL_SEC * 1000,
      from: 'vanilla',
      brandSnapshot: await store.get('feedia:brand'),
      identitySnapshot: await store.get('feedia:identity'),
      targetRoute,
    };
    await store.set(`feedia:passport:${id}`, payload);
    const dest = `${NEXT_BASE}${targetRoute.startsWith('/') ? '' : '/'}${targetRoute}?passport=${id}`;
    res.statusCode = 302;
    res.setHeader('location', dest);
    res.end();
    return true;
  }

  // ── Proxy a feedia-next: /api/twin/<path> ──────────────────────────
  if (path.startsWith('/api/twin/')) {
    const tail = path.replace(/^\/api\/twin/, '/api');
    const qs = search && search.toString() ? `?${search.toString()}` : '';
    const target = `${NEXT_BASE}${tail}${qs}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const init = {
        method: m,
        headers: {
          'content-type': req.headers['content-type'] || 'application/json',
          'x-feedia-twin': 'vanilla-proxy',
        },
        signal: ctrl.signal,
      };
      if (!['GET', 'HEAD'].includes(m) && body) init.body = typeof body === 'string' ? body : JSON.stringify(body);
      const r = await fetch(target, init);
      clearTimeout(to);
      const ct = r.headers.get('content-type') || 'application/json';
      const raw = await r.text();
      res.statusCode = r.status;
      res.setHeader('content-type', ct);
      res.setHeader('x-proxied-from', 'feedia-next');
      res.end(raw);
      return true;
    } catch (e) {
      clearTimeout(to);
      json(res, 502, { error: 'twin-unreachable', target, message: String(e.message || e) });
      return true;
    }
  }

  return false;
};
