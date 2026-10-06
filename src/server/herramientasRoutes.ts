/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { getCalendarPost, insertCalendarPost, updateCalendarPost } from '../database/calendarQueue.js';
import {
  HERRAMIENTAS,
  herramientaPorId,
  validarEntrada,
  type AccionCreacion,
  type Destino,
  type MaterialPrevio,
} from '../capabilities/executive/herramientasCatalogo.js';
import { conexionesDeCuenta, ejecutarHerramienta } from '../capabilities/executive/herramientasEjecutivo.js';
import {
  agregarCreacion,
  modificarCreacion,
  nuevoIdCreacion,
  obtenerCreacion,
  leerCreaciones,
  type CreacionGuardada,
  type OrigenCreacion,
} from '../capabilities/executive/herramientasCreaciones.js';
import { materialDe, siguientesDe, valoresHeredados } from '../capabilities/executive/herramientasCadena.js';
import {
  agregarConocimiento,
  eliminarConocimiento,
  leerConocimiento,
} from '../capabilities/executive/respuestasConocimiento.js';
import { prepararRespuestas, validarRespuestaAprobada } from '../capabilities/executive/respuestasTriaje.js';
import { aplicarCreacion, type DepsAplicar } from '../capabilities/executive/herramientasAplicar.js';
import {
  LIMITE_PROYECTOS,
  modificarProyectos,
  nuevoProyecto,
  validarProyecto,
} from '../capabilities/executive/proyectosEjecutivo.js';
import { createObjective, OKRValidationError } from '../capabilities/executive/executiveOKR.js';
import {
  crearExperimentoBorrador,
  validarEntrada as validarExperimento,
} from '../capabilities/executive/experimentosMetricas.js';
import { agregarExperimento, nuevoIdExperimento } from '../capabilities/executive/experimentosEjecutivo.js';
import { registrarEvento } from '../capabilities/executive/bitacoraEjecutivo.js';
import { log } from '../agent/logger.js';

const DESTINOS: readonly Destino[] = ['calendario', 'proyecto', 'objetivo', 'experimento', 'bitacora', 'copiar'];
const MAX_CAPTION = 2200;

const buildHerramientasRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = () => resolveDefaultBrandId(brand) ?? 'default';

  const depsReales = (cuentasId: string): DepsAplicar => ({
    insertarPublicacion: async (p) => {
      const creada = await insertCalendarPost({
        accountId: p.accountId,
        format: p.format,
        caption: p.caption,
        mediaUrls: [],
        status: p.status,
        scheduledAt: p.scheduledAt ?? undefined,
        metadata: p.metadata,
      });
      return { id: creada.id };
    },
    moverPublicacion: async (id, scheduledAt) => {
      const post = await getCalendarPost(id);
      if (!post) return false;
      await updateCalendarPost(id, { scheduledAt });
      return true;
    },
    crearProyecto: async (body) => {
      const entrada = validarProyecto(body);
      if (!entrada.ok) return { error: entrada.error };
      const proyecto = nuevoProyecto(entrada.valor);
      const salida = await modificarProyectos<typeof proyecto | { error: string }>(brandId(), (lista) => {
        if (lista.length >= LIMITE_PROYECTOS) return { error: `Llegaste al máximo de ${LIMITE_PROYECTOS} proyectos.` };
        lista.push(proyecto);
        return { resultado: proyecto };
      });
      if (!salida || 'error' in salida)
        return { error: salida && 'error' in salida ? salida.error : 'No se pudo crear el proyecto.' };
      return { id: proyecto.id };
    },
    crearObjetivo: async (body) => {
      try {
        const objetivo = await createObjective({
          brandId: brandId(),
          title: String(body['titulo'] ?? ''),
          porque: String(body['porque'] ?? ''),
          category: body['categoria'] as Parameters<typeof createObjective>[0]['category'],
          period: body['periodo'] as Parameters<typeof createObjective>[0]['period'],
          keyResults: body['keyResults'] as Parameters<typeof createObjective>[0]['keyResults'],
        });
        return { id: objetivo.id };
      } catch (err) {
        if (err instanceof OKRValidationError) return { error: err.message };
        throw err;
      }
    },
    crearExperimento: async (body) => {
      const entrada = validarExperimento(body);
      if (!entrada.ok) return { error: entrada.error };
      const exp = crearExperimentoBorrador(nuevoIdExperimento(), entrada.valor, new Date().toISOString());
      await agregarExperimento(cuentasId, exp);
      return { id: exp.id };
    },
    registrarBitacora: async (titulo, detalle) => {
      await registrarEvento(brandId(), {
        categoria: 'ia',
        titulo: `Herramienta: ${titulo}`,
        detalle,
        actor: 'vos',
        resultado: null,
      });
    },
  });

  return [
    {
      method: 'GET',
      pattern: '/api/executive/tools',
      handler: async ({ res }) => {
        json(
          res,
          200,
          HERRAMIENTAS.map(({ id, nombre, categoria, descripcion, icono, campos, destinos, soloReglas }) => ({
            id,
            nombre,
            categoria,
            descripcion,
            icono,
            campos,
            destinos,
            soloReglas: soloReglas === true,
            continuaCon: siguientesDe(id),
          })),
        );
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/tools/creaciones',
      handler: async ({ req, res }) => {
        json(res, 200, await leerCreaciones(await marcaDeCuentas(req, brand)));
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/tools/creaciones/:cid',
      handler: async ({ req, res, params }) => {
        const creacion = await obtenerCreacion(await marcaDeCuentas(req, brand), params['cid'] ?? '');
        if (!creacion) {
          json(res, 404, { error: 'creación no encontrada' });
          return;
        }
        json(res, 200, creacion);
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/tools/conocimiento/respuestas',
      handler: async ({ res }) => {
        json(res, 200, leerConocimiento());
      },
    },
    {
      method: 'DELETE',
      pattern: '/api/executive/tools/conocimiento/respuestas/:kid',
      handler: async ({ res, params }) => {
        const borrada = eliminarConocimiento(params['kid'] ?? '');
        if (!borrada) {
          json(res, 404, { error: 'respuesta no encontrada' });
          return;
        }
        json(res, 200, { ok: true });
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/tools/creaciones/:cid/aprobar',
      handler: async ({ req, res, params, body }) => {
        const cuentas = await marcaDeCuentas(req, brand);
        const creacion = await obtenerCreacion(cuentas, params['cid'] ?? '');
        if (!creacion || creacion.herramientaId !== 'respuestas') {
          json(res, 404, { error: 'Solo se pueden aprobar respuestas de Respuestas IA.' });
          return;
        }
        const mensaje = String(creacion.valores['mensaje'] ?? '');
        const tipo = creacion.valores['tipo'] === 'dm' ? 'dm' : 'comentario';
        const { triaje } = prepararRespuestas(mensaje, tipo, creacion.valores['intencion'], []);
        if (triaje.accion !== 'responder') {
          json(res, 409, { error: 'Este mensaje requiere una persona: no se guarda como respuesta aprobada.' });
          return;
        }
        const sugerida = creacion.resultado.secciones.find((s) => s.tipo === 'copiable');
        const editada = (body as { respuesta?: unknown } | null)?.respuesta;
        const texto =
          typeof editada === 'string' ? editada : typeof sugerida?.contenido === 'string' ? sugerida.contenido : '';
        const valida = validarRespuestaAprobada(mensaje, texto);
        if (!valida.ok) {
          json(res, 400, { error: valida.error });
          return;
        }
        const entrada = agregarConocimiento(valida.valor);
        json(res, 201, entrada);
      },
    },
    {
      method: 'GET',
      pattern: '/api/executive/tools/creaciones/:cid/para/:toolId',
      handler: async ({ req, res, params }) => {
        const creacion = await obtenerCreacion(await marcaDeCuentas(req, brand), params['cid'] ?? '');
        const def = herramientaPorId(params['toolId'] ?? '');
        if (!creacion || !def) {
          json(res, 404, { error: 'creación o herramienta no encontrada' });
          return;
        }
        json(res, 200, { valores: valoresHeredados(creacion.valores, def.campos) });
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/tools/creaciones/:cid/aplicar',
      handler: async ({ req, res, params, body }) => {
        const cuentas = await marcaDeCuentas(req, brand);
        const cid = params['cid'] ?? '';
        const destino = (body as { destino?: unknown } | null)?.destino;
        if (typeof destino !== 'string' || !DESTINOS.includes(destino as Destino)) {
          json(res, 400, { error: 'destino no válido' });
          return;
        }
        const creacion = await obtenerCreacion(cuentas, cid);
        if (!creacion) {
          json(res, 404, { error: 'creación no encontrada' });
          return;
        }
        const def = herramientaPorId(creacion.herramientaId);
        if (!def) {
          json(res, 409, { error: 'La herramienta de esta creación ya no existe.' });
          return;
        }
        let creacionAEnviar = creacion;
        const piezasEditadas = (body as { piezas?: unknown } | null)?.piezas;
        if (destino === 'calendario' && Array.isArray(piezasEditadas) && creacion.accion.tipo === 'piezas') {
          const piezas = creacion.accion.piezas;
          if (piezasEditadas.length !== piezas.length) {
            json(res, 400, { error: 'La cantidad de piezas no coincide con la creación.' });
            return;
          }
          const captions = piezasEditadas.map((p) => {
            const caption = typeof p === 'object' && p !== null ? (p as { caption?: unknown }).caption : undefined;
            return typeof caption === 'string'
              ? caption
                  .replace(/\u0000/g, '')
                  .trim()
                  .slice(0, MAX_CAPTION)
              : null;
          });
          if (captions.some((c) => c === null || c.length > MAX_CAPTION)) {
            json(res, 400, { error: `Cada texto puede tener hasta ${MAX_CAPTION} caracteres.` });
            return;
          }
          const accion: AccionCreacion = {
            tipo: 'piezas',
            piezas: piezas.map((p, i) => ({ ...p, caption: captions[i] ?? '' })),
          };
          await modificarCreacion(cuentas, cid, (c) => ({ creacion: { ...c, accion }, salida: true }));
          creacionAEnviar = { ...creacion, accion };
        }
        let aplicada;
        try {
          aplicada = await aplicarCreacion(creacionAEnviar, destino as Destino, def, depsReales(cuentas), {
            accountId: cuentas,
            conexiones: await conexionesDeCuenta(cuentas),
            ahora: Date.now(),
          });
        } catch (err) {
          log.warn('[Herramientas] no se pudo aplicar la creación', { destino, error: String(err) });
          json(res, 503, {
            error: 'No se pudo guardar. Revisá que tu cuenta esté conectada y que el calendario esté disponible.',
          });
          return;
        }
        if ('error' in aplicada) {
          json(res, 409, { error: aplicada.error });
          return;
        }
        await modificarCreacion(cuentas, cid, (c) => ({
          creacion: { ...c, aplicaciones: [aplicada.aplicacion, ...c.aplicaciones] },
          salida: aplicada.aplicacion,
        }));
        json(res, 200, { aplicacion: aplicada.aplicacion, creacion: await obtenerCreacion(cuentas, cid) });
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
        const cuentas = await marcaDeCuentas(req, brand);
        const desde = (body as { desdeCreacion?: unknown } | null)?.desdeCreacion;
        let material: MaterialPrevio | null = null;
        let origen: OrigenCreacion | null = null;
        if (typeof desde === 'string' && desde.length > 0) {
          const base = await obtenerCreacion(cuentas, desde.slice(0, 80));
          if (!base) {
            json(res, 404, { error: 'La creación de origen ya no está en tu biblioteca.' });
            return;
          }
          material = materialDe(base);
          origen = { creacionId: base.id, herramientaId: base.herramientaId, nombre: base.nombre };
        }
        const salida = await ejecutarHerramienta(def, entrada.valores, brand, cuentas, Date.now(), material);
        if ('error' in salida) {
          json(res, 502, { error: salida.error });
          return;
        }
        const creacion: CreacionGuardada = {
          id: nuevoIdCreacion(),
          herramientaId: def.id,
          nombre: def.nombre,
          creadaEn: new Date().toISOString(),
          valores: entrada.valores,
          fuente: salida.fuente,
          resultado: salida.resultado,
          accion: salida.accion,
          aplicaciones: [],
          origen,
        };
        await agregarCreacion(cuentas, creacion);
        await registrarEvento(brandId(), {
          categoria: 'ia',
          titulo: `Herramienta: ${def.nombre}`,
          detalle: `Se generó con ${salida.fuente === 'ia' ? 'IA' : 'reglas automáticas'}.`,
          actor: 'vos',
          resultado: salida.resultado.titulo,
        });
        json(res, 200, { herramienta: def.id, fuente: salida.fuente, resultado: salida.resultado, creacion });
      },
    },
  ];
};

const createHerramientasRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildHerramientasRoutes(brand));

export default createHerramientasRoutes;
