/**
 * Aplica una creación de herramienta IA a su destino: piezas al calendario, movimientos de piezas,
 * proyectos, objetivos OKR, experimentos o la bitácora. Las dependencias llegan por parámetro para
 * poder probar la regla sin base de datos.
 */

import { auditoriaReglas, type Destino, type HerramientaDef } from './herramientasCatalogo.js';
import type { PiezaCreacion } from './herramientasPlanificacion.js';
import type { AplicacionCreacion, CreacionGuardada } from './herramientasCreaciones.js';

export interface NuevaPublicacion {
  accountId: string;
  format: PiezaCreacion['formato'];
  caption: string;
  status: 'draft' | 'scheduled';
  scheduledAt: string | null;
  metadata: Record<string, unknown>;
}

export interface DepsAplicar {
  insertarPublicacion(publicacion: NuevaPublicacion): Promise<{ id: string }>;
  moverPublicacion(id: string, scheduledAt: string): Promise<boolean>;
  crearProyecto(body: Record<string, unknown>): Promise<{ id: string } | { error: string }>;
  crearObjetivo(body: Record<string, unknown>): Promise<{ id: string } | { error: string }>;
  crearExperimento(body: Record<string, unknown>): Promise<{ id: string } | { error: string }>;
  registrarBitacora(titulo: string, detalle: string): Promise<void>;
}

export interface OpcionesAplicar {
  accountId: string;
  conexiones: { instagram: boolean; tiktok: boolean };
  ahora: number;
}

const MARGEN_FUTURO_MS = 5 * 60_000;

const textoCompleto = (pieza: PiezaCreacion): string =>
  [pieza.caption, pieza.hashtags.join(' ')].filter(Boolean).join('\n\n');

/** Una pieza solo queda programada si tiene fecha futura, su red está conectada y el texto no tiene riesgo alto. */
export const estadoDePieza = (
  pieza: PiezaCreacion,
  opciones: OpcionesAplicar,
): { status: 'draft' | 'scheduled'; motivo: string | null } => {
  if (!pieza.scheduledAt) return { status: 'draft', motivo: 'sin fecha' };
  if (!pieza.caption.trim()) return { status: 'draft', motivo: 'sin texto' };
  if (Date.parse(pieza.scheduledAt) <= opciones.ahora + MARGEN_FUTURO_MS)
    return { status: 'draft', motivo: 'la fecha ya pasó' };
  if (!opciones.conexiones[pieza.plataforma])
    return { status: 'draft', motivo: `${pieza.plataforma} no está conectado` };
  if (auditoriaReglas(pieza.caption, pieza.hashtags).nivel === 'alto')
    return { status: 'draft', motivo: 'el texto tiene riesgo alto de seguridad' };
  return { status: 'scheduled', motivo: null };
};

const resumenBitacora = (creacion: CreacionGuardada): string =>
  creacion.resultado.secciones
    .map((s) => `${s.titulo}: ${typeof s.contenido === 'string' ? s.contenido : s.contenido.join('; ')}`)
    .join(' · ')
    .slice(0, 500);

const aplicarPiezas = async (
  piezas: PiezaCreacion[],
  deps: DepsAplicar,
  opciones: OpcionesAplicar,
  creacionId: string,
): Promise<{ resumen: string; referencias: string[] } | { error: string }> => {
  if (piezas.length === 0) return { error: 'No hay piezas para programar.' };
  const referencias: string[] = [];
  let programadas = 0;
  let borradores = 0;
  for (const pieza of piezas) {
    const estado = estadoDePieza(pieza, opciones);
    const publicacion = await deps.insertarPublicacion({
      accountId: opciones.accountId,
      format: pieza.formato,
      caption: textoCompleto(pieza),
      status: estado.status,
      scheduledAt: estado.status === 'scheduled' ? pieza.scheduledAt : null,
      metadata: {
        platform: pieza.plataforma,
        titulo: pieza.titulo,
        origenCreacion: creacionId,
        motivoBorrador: estado.motivo,
      },
    });
    referencias.push(publicacion.id);
    if (estado.status === 'scheduled') programadas++;
    else borradores++;
  }
  return {
    resumen: `${piezas.length} pieza(s): ${programadas} programada(s) y ${borradores} en borrador`,
    referencias,
  };
};

const aplicarMovimientos = async (
  movimientos: Array<{ postId: string; propuesto: string }>,
  calendarioDisponible: boolean,
  deps: DepsAplicar,
): Promise<{ resumen: string; referencias: string[] } | { error: string }> => {
  if (!calendarioDisponible) return { error: 'El calendario no está disponible en este servidor.' };
  if (movimientos.length === 0) return { error: 'No hay piezas que mover.' };
  const referencias: string[] = [];
  for (const m of movimientos) {
    if (await deps.moverPublicacion(m.postId, m.propuesto)) referencias.push(m.postId);
  }
  return { resumen: `${referencias.length} de ${movimientos.length} pieza(s) reubicada(s)`, referencias };
};

/** Envía la creación a un destino. Devuelve la aplicación para guardarla en la biblioteca. */
export const aplicarCreacion = async (
  creacion: CreacionGuardada,
  destino: Destino,
  herramienta: Pick<HerramientaDef, 'destinos'>,
  deps: DepsAplicar,
  opciones: OpcionesAplicar,
): Promise<{ aplicacion: AplicacionCreacion } | { error: string }> => {
  if (!herramienta.destinos.includes(destino)) return { error: `Esta herramienta no se envía a ${destino}.` };
  const accion = creacion.accion;
  let salida: { resumen: string; referencias: string[] } | { error: string };

  if (destino === 'calendario' && accion.tipo === 'piezas') {
    salida = await aplicarPiezas(accion.piezas, deps, opciones, creacion.id);
  } else if (destino === 'calendario' && accion.tipo === 'movimientos') {
    salida = await aplicarMovimientos(accion.movimientos, accion.calendarioDisponible, deps);
  } else if (destino === 'proyecto' && accion.tipo === 'proyecto') {
    const r = await deps.crearProyecto({ ...accion });
    salida =
      'error' in r
        ? r
        : { resumen: `Proyecto «${accion.nombre}» con ${accion.tareas.length} tareas`, referencias: [r.id] };
  } else if (destino === 'objetivo' && accion.tipo === 'objetivo') {
    const r = await deps.crearObjetivo({ ...accion });
    salida = 'error' in r ? r : { resumen: `Objetivo «${accion.titulo}» creado`, referencias: [r.id] };
  } else if (destino === 'experimento' && accion.tipo === 'experimento') {
    const r = await deps.crearExperimento({ ...accion });
    salida =
      'error' in r ? r : { resumen: `Experimento «${accion.hipotesis.slice(0, 60)}» en borrador`, referencias: [r.id] };
  } else if (destino === 'bitacora') {
    await deps.registrarBitacora(creacion.resultado.titulo, resumenBitacora(creacion));
    salida = { resumen: 'Registrado en la bitácora', referencias: [] };
  } else {
    return { error: 'Esta creación no tiene nada que enviar a ese destino.' };
  }

  if ('error' in salida) return salida;
  return {
    aplicacion: {
      destino,
      aplicadoEn: new Date(opciones.ahora).toISOString(),
      resumen: salida.resumen,
      referencias: salida.referencias,
    },
  };
};
