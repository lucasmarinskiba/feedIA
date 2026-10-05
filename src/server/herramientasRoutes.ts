/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { HERRAMIENTAS, herramientaPorId, validarEntrada } from '../capabilities/executive/herramientasCatalogo.js';
import { ejecutarHerramienta } from '../capabilities/executive/herramientasEjecutivo.js';

import { registrarEvento } from '../capabilities/executive/bitacoraEjecutivo.js';
const buildHerramientasRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/tools',
    handler: async ({ res }) => {
      json(
        res,
        200,
        HERRAMIENTAS.map(({ id, nombre, categoria, descripcion, icono, campos }) => ({
          id,
          nombre,
          categoria,
          descripcion,
          icono,
          campos,
        })),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/tools/:id',
    handler: async ({ req, res, params, body }) => {
      const def = herramientaPorId(params['id'] ?? '');
      if (!def) {
        json(res, 404, { error: 'herramienta no encontrada' });
        return;
      }
      const entrada = validarEntrada(def, (body ?? {}) as Record<string, unknown>);
      if (!entrada.ok) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const salida = await ejecutarHerramienta(def, entrada.valores, brand, await marcaDeCuentas(req, brand));
      if ('error' in salida) {
        json(res, 502, { error: salida.error });
        return;
      }
      await registrarEvento(resolveDefaultBrandId(brand) ?? 'default', {
        categoria: 'ia',
        titulo: `Herramienta: ${def.nombre}`,
        detalle: `Se generó con ${salida.fuente === 'ia' ? 'IA' : 'reglas automáticas'}.`,
        actor: 'vos',
        resultado: salida.resultado.titulo,
      });
      json(res, 200, { herramienta: def.id, fuente: salida.fuente, resultado: salida.resultado });
    },
  },
];

const createHerramientasRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildHerramientasRoutes(brand));

export default createHerramientasRoutes;
