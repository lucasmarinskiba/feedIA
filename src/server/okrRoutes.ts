/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import {
  contextoOKRParaIA,
  createObjective,
  editarObjetivo,
  evaluarOKR,
  OKRValidationError,
  updateKRProgress,
  type EntradaObjetivo,
} from '../capabilities/executive/executiveOKR.js';
import { completarBaselines, crearLectorFuentesReales } from '../capabilities/executive/okrFuentesReales.js';

const responderErrorValidacion = (res: Parameters<typeof json>[0], err: OKRValidationError): void => {
  json(res, 400, {
    error: err.message,
    puntaje: err.calidad.puntaje,
    bloqueantes: err.calidad.bloqueantes,
    observaciones: err.calidad.observaciones,
  });
};

const buildOkrRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const leer = crearLectorFuentesReales(brandId, brand.name);

  return [
    {
      method: 'POST',
      pattern: '/api/executive/okr/validate',
      handler: async ({ res, body }) => {
        const entrada = (body ?? {}) as EntradaObjetivo;
        json(res, 200, evaluarOKR({ ...entrada, keyResults: entrada.keyResults ?? [] }));
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/okr/create',
      handler: async ({ res, body }) => {
        const entrada = (body ?? {}) as EntradaObjetivo;
        const { keyResults, sinValor } = await completarBaselines(entrada.keyResults ?? [], leer);
        if (sinValor.length > 0) {
          json(res, 400, {
            error: `No hay dato real para "${sinValor[0]}" (la cuenta no está conectada). Conectala o cargá el valor inicial a mano.`,
          });
          return;
        }
        try {
          json(res, 200, await createObjective({ ...entrada, brandId, keyResults }));
        } catch (err) {
          if (err instanceof OKRValidationError) return responderErrorValidacion(res, err);
          throw err;
        }
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/okr/edit',
      handler: async ({ res, body }) => {
        const b = (body ?? {}) as EntradaObjetivo & { objectiveId?: string };
        if (!b.objectiveId) {
          json(res, 400, { error: 'objectiveId required' });
          return;
        }
        const { keyResults, sinValor } = await completarBaselines(b.keyResults ?? [], leer);
        if (sinValor.length > 0) {
          json(res, 400, {
            error: `No hay dato real para "${sinValor[0]}" (la cuenta no está conectada). Conectala o cargá el valor inicial a mano.`,
          });
          return;
        }
        try {
          const actualizado = await editarObjetivo(brandId, b.objectiveId, { ...b, keyResults });
          if (!actualizado) {
            json(res, 404, { error: 'objective not found' });
            return;
          }
          json(res, 200, actualizado);
        } catch (err) {
          if (err instanceof OKRValidationError) return responderErrorValidacion(res, err);
          throw err;
        }
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/okr/update-kr',
      handler: async ({ res, body }) => {
        const b = (body ?? {}) as { objectiveId: string; krId: string; newValue: number; nota?: string };
        if (!Number.isFinite(b.newValue)) {
          json(res, 400, { error: 'newValue debe ser un número' });
          return;
        }
        const result = await updateKRProgress(brandId, b.objectiveId, b.krId, b.newValue, b.nota ?? '');
        if (!result) {
          json(res, 404, { error: 'objective or KR not found' });
          return;
        }
        json(res, 200, result);
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/okr/contexto-ia',
      handler: async ({ res }) => {
        json(res, 200, await contextoOKRParaIA(brandId));
      },
    },
  ];
};

const createOkrRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildOkrRoutes(brand));

export default createOkrRoutes;
