/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { estadoAlertas } from '../capabilities/executive/alertasEjecutivo.js';
import { silenciadaHasta } from '../capabilities/executive/alertasMetricas.js';
import { reactivarAlerta, silenciarAlerta } from '../capabilities/executive/alertasEstado.js';

const HORAS_PERMITIDAS: readonly number[] = [1, 24, 168];
const ID_ALERTA = /^[a-z0-9:._-]{3,120}$/i;

const usuarioDeRequest = (headers: Record<string, string | string[] | undefined>): string => {
  const valor = headers['x-user-id'];
  return (typeof valor === 'string' ? valor.trim() : '') || 'test-user';
};

const buildAlertasRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const marcaPlataforma = () => ({ id: resolveDefaultBrandId(brand) ?? 'default', nombre: brand.name });
  return [
    {
      method: 'GET',
      pattern: '/api/executive/alerts',
      handler: async ({ req, res, query }) => {
        const { activas, silenciadas } = await estadoAlertas(marcaPlataforma(), await marcaDeCuentas(req, brand), {
          refrescar: query['refrescar'] === '1',
          usuarioId: usuarioDeRequest(req.headers),
        });
        json(res, 200, {
          generadoEn: new Date().toISOString(),
          total: activas.length,
          alertas: activas,
          silenciadas,
        });
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/alerts/:id/silenciar',
      handler: async ({ res, params, body }) => {
        const id = params['id'] ?? '';
        const horas = (body as { horas?: unknown } | null)?.horas;
        if (!ID_ALERTA.test(id)) {
          json(res, 400, { error: 'alerta no válida' });
          return;
        }
        if (typeof horas !== 'number' || !HORAS_PERMITIDAS.includes(horas)) {
          json(res, 400, { error: 'horas debe ser 1, 24 o 168' });
          return;
        }
        await silenciarAlerta(marcaPlataforma().id, id, silenciadaHasta(horas, Date.now()));
        json(res, 200, { ok: true });
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/alerts/:id/reactivar',
      handler: async ({ res, params }) => {
        const id = params['id'] ?? '';
        if (!ID_ALERTA.test(id)) {
          json(res, 400, { error: 'alerta no válida' });
          return;
        }
        await reactivarAlerta(marcaPlataforma().id, id);
        json(res, 200, { ok: true });
      },
    },
  ];
};

const createAlertasRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAlertasRoutes(brand));

export default createAlertasRoutes;
