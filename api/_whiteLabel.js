/**
 * White Label — Premium feature.
 *
 * User Premium puede configurar branding propio: logo, nombre, dominio,
 * accent color. Endpoints públicos sirven config para que frontend tematice.
 *
 * Reseller flow: user Premium tiene sub-users con su brand aplicado.
 */

import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';
import { hasFeature } from './_planFeatures.js';

const wlKey = (userId) => `feedia:user:${userId}:whitelabel`;

export const handleWhiteLabel = async (req, res, path, m, body) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  if (path === '/api/whitelabel/config' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });
    const config = (await store.get(wlKey(ctx.user.id))) || {
      enabled: false,
      brandName: 'FeedIA',
      logoUrl: null,
      accentColor: '#E1306C',
      domain: null,
      hideFeediaBranding: false,
      footerText: 'Powered by FeedIA',
    };
    json(200, { config, allowedByPlan: hasFeature(ctx.user.plan || 'free', 'enterprise.whiteLabel') });
    return true;
  }

  if (path === '/api/whitelabel/config' && (m === 'POST' || m === 'PUT')) {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });
    if (!hasFeature(ctx.user.plan || 'free', 'enterprise.whiteLabel')) {
      return json(402, { error: 'White-label requiere Premium', upgradeUrl: '/pricing.html' });
    }
    const b = body || {};
    const config = {
      enabled: Boolean(b.enabled),
      brandName: String(b.brandName || 'Mi Marca').slice(0, 60),
      logoUrl: b.logoUrl ? String(b.logoUrl).slice(0, 500) : null,
      accentColor: /^#[0-9a-f]{6}$/i.test(b.accentColor) ? b.accentColor : '#E1306C',
      domain: b.domain ? String(b.domain).slice(0, 120) : null,
      hideFeediaBranding: Boolean(b.hideFeediaBranding),
      footerText: b.footerText ? String(b.footerText).slice(0, 200) : null,
      updatedAt: new Date().toISOString(),
    };
    await store.set(wlKey(ctx.user.id), config);
    json(200, { config, saved: true });
    return true;
  }

  // Public endpoint para resolver config por domain (frontend white-label fetches este al cargar)
  if (path === '/api/whitelabel/resolve' && m === 'GET') {
    const domain = new URL(req.url, 'http://x').searchParams.get('domain');
    if (!domain) return json(400, { error: 'domain query requerido' });
    // Lookup brute force (en prod usar reverse index)
    json(200, { domain, config: null, note: 'reverse-domain lookup pendiente, requires KV index' });
    return true;
  }

  return false;
};
