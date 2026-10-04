import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { getPlatformGrowth } from '../capabilities/experience/growthMetrics.js';

/**
 * GET /api/growth/summary — números reales de Instagram + TikTok para la
 * sección "Crecimiento por red" de la Sala Ejecutiva. Ver growthMetrics.ts.
 */
const buildGrowthRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/growth/summary',
    handler: async ({ req, res }) => {
      const brandId = await marcaDeCuentas(req, brand);
      const [instagram, tiktok] = await Promise.all([
        getPlatformGrowth(brandId, 'instagram'),
        getPlatformGrowth(brandId, 'tiktok'),
      ]);
      json(res, 200, { instagram, tiktok });
    },
  },
];

const createGrowthRoutes = (brand: BrandProfile) => adaptRoutesToExpress(buildGrowthRoutes(brand));

export default createGrowthRoutes;
