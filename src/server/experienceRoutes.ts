import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * "EXPERIENCE" routes from extendedRoutes.ts (welcome/onboarding,
 * personalization, home dashboard, daily rituals, celebrations, memorabilia,
 * feed grid) — never mounted on Express, so requests fell through to the SPA
 * catch-all and got index.html back instead of JSON (e.g. /api/personalization/css
 * loaded as a stylesheet 404ing to HTML). Achievements is deliberately excluded:
 * that fix is being handled separately.
 */
const EXPERIENCE_PREFIXES = [
  '/api/welcome',
  '/api/personalization',
  '/api/home',
  '/api/rituals',
  '/api/celebrations',
  '/api/memorabilia',
  '/api/feed',
];

const createExperienceRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(
    buildExtendedRoutes(brand).filter((r) => EXPERIENCE_PREFIXES.some((prefix) => r.pattern.startsWith(prefix))),
  );

export default createExperienceRoutes;
