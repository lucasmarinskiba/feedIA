import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * Brand setup routes from extendedRoutes.ts: interview/audit/renewal flow,
 * niche packs, "apply branding brain" (personalization.js), and the
 * branding-brain multi-agent endpoints. Never mounted on Express. Deliberately
 * excludes the unrelated, far-later "STAGE 6: BRAND MASTERY" block
 * (/api/brand/architecture, /color-system, etc.) — that block isn't called by
 * any frontend view, so it's left unmounted rather than swept in.
 */
const createBrandSetupRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(
    buildExtendedRoutes(brand).filter(
      (r) =>
        r.pattern.startsWith('/api/brand/interview') ||
        r.pattern === '/api/brand/audit' ||
        r.pattern === '/api/brand/propose-evolution' ||
        r.pattern.startsWith('/api/brand/renewal') ||
        r.pattern === '/api/brand/apply-branding-brain' ||
        r.pattern.startsWith('/api/niche-packs') ||
        r.pattern.startsWith('/api/branding/brain'),
    ),
  );

export default createBrandSetupRoutes;
