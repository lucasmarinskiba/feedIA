/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { alertasDeMarca } from '../capabilities/executive/alertasEjecutivo.js';

const buildAlertasRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/alerts',
    handler: async ({ req, res, query }) => {
      const marcaPlataforma = { id: resolveDefaultBrandId(brand) ?? 'default', nombre: brand.name };
      const alertas = await alertasDeMarca(marcaPlataforma, await marcaDeCuentas(req, brand), {
        refrescar: query['refrescar'] === '1',
      });
      json(res, 200, { generadoEn: new Date().toISOString(), total: alertas.length, alertas });
    },
  },
];

const createAlertasRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAlertasRoutes(brand));

export default createAlertasRoutes;
