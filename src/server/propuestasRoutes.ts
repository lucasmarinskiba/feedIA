/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { construirPropuestas, resolverPropuesta } from '../capabilities/executive/propuestasEquipo.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';

const buildPropuestasRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  return [
    {
      method: 'GET',
      pattern: '/api/executive/proposals',
      handler: async ({ req, res }) => {
        const cuentasId = await marcaDeCuentas(req, brand);
        json(res, 200, await construirPropuestas(brandId, brand.name, cuentasId, brand.niche));
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/proposals/resolver',
      handler: async ({ res, body }) => {
        const b = (body ?? {}) as { id?: string; estado?: string };
        if (!b.id || (b.estado !== 'aceptada' && b.estado !== 'descartada')) {
          json(res, 400, { error: 'id y estado (aceptada|descartada) requeridos' });
          return;
        }
        await resolverPropuesta(brandId, b.id, b.estado);
        json(res, 200, { ok: true });
      },
    },
  ];
};

const createPropuestasRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildPropuestasRoutes(brand));

export default createPropuestasRoutes;
