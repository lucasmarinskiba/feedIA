/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { listarEventos } from '../capabilities/executive/bitacoraEjecutivo.js';
import {
  CATEGORIAS_BITACORA,
  agruparPorDia,
  aCsv,
  contarPorCategoria,
  filtrarEventos,
  limitarEventos,
  type CategoriaBitacora,
  type EventoBitacora,
} from '../capabilities/executive/bitacoraMetricas.js';

const LIMITE_POR_DEFECTO = 200;

const buildBitacoraRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/bitacora',
    handler: async ({ req, res, query }) => {
      const plataformaId = resolveDefaultBrandId(brand) ?? 'default';
      const cuentasId = await marcaDeCuentas(req, brand);
      const porId = new Map<string, EventoBitacora>();
      for (const e of [
        ...(await listarEventos(plataformaId)),
        ...(cuentasId !== plataformaId ? await listarEventos(cuentasId) : []),
      ]) {
        porId.set(e.id, e);
      }
      const todos = [...porId.values()];

      const categoriaParam = query['categoria'];
      if (categoriaParam && !(categoriaParam in CATEGORIAS_BITACORA)) {
        json(res, 400, { error: 'categoría inválida' });
        return;
      }
      const categoria = (categoriaParam as CategoriaBitacora | undefined) ?? null;
      const filtrados = filtrarEventos(todos, { categoria, texto: query['q'] ?? null });

      if (query['formato'] === 'csv') {
        res.writeHead(200, {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="bitacora.csv"',
        });
        res.end(aCsv(filtrados));
        return;
      }

      const limite = limitarEventos(Number(query['limit'] ?? LIMITE_POR_DEFECTO) || LIMITE_POR_DEFECTO);
      json(res, 200, {
        total: filtrados.length,
        porCategoria: contarPorCategoria(todos),
        dias: agruparPorDia(filtrados.slice(0, limite)),
      });
    },
  },
];

const createBitacoraRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildBitacoraRoutes(brand));

export default createBitacoraRoutes;
