import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { buildExecutiveBrief } from '../capabilities/experience/executiveBrief.js';

/**
 * GET /api/experience/brief — Sala Ejecutiva (economía operativa, trofeos,
 * staff). Vivía solo en dashboardApi.ts (server http.js de dev), nunca montado
 * en Express, así que la vista caía siempre al fallback en cero.
 */
const buildExecutiveBriefRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/experience/brief',
    handler: async ({ res, query }) => {
      const brief = await buildExecutiveBrief(brand, {
        fundador: typeof query['fundador'] === 'string' ? query['fundador'] : undefined,
        conNarrativaIA: query['ia'] === '1',
      });
      json(res, 200, brief);
    },
  },
];

const createExecutiveBriefRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildExecutiveBriefRoutes(brand));

export default createExecutiveBriefRoutes;
