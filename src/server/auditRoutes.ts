/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import {
  correrAuditoria,
  historialAuditorias,
  tendenciaAuditorias,
  ultimaAuditoria,
} from '../capabilities/executive/auditoriaEjecutiva.js';

const LIMITE_HISTORIAL_MAX = 50;

const buildAuditRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const marcaPlataforma = { id: resolveDefaultBrandId(brand) ?? 'default', nombre: brand.name };

  return [
    {
      method: 'GET',
      pattern: '/api/executive/audit/latest',
      handler: async ({ res }) => {
        json(res, 200, await ultimaAuditoria(marcaPlataforma.id));
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/audit/trend',
      handler: async ({ res }) => {
        json(res, 200, await tendenciaAuditorias(marcaPlataforma.id));
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/audit/history',
      handler: async ({ res, query }) => {
        const limite = Math.min(LIMITE_HISTORIAL_MAX, Math.max(1, Number(query['limit'] ?? 10) || 10));
        json(res, 200, await historialAuditorias(marcaPlataforma.id, limite));
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/audit/run',
      handler: async ({ req, res }) => {
        const marcaCuentas = await marcaDeCuentas(req, brand);
        json(res, 200, await correrAuditoria(marcaPlataforma, marcaCuentas));
      },
    },
  ];
};

const createAuditRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAuditRoutes(brand));

export default createAuditRoutes;
