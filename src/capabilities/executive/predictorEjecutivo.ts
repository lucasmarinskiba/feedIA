/**
 * Predictor de contenido para la cuenta: sincroniza los posts reales de Instagram y TikTok, guarda
 * el historial y predice el contenido que se va a publicar con el modelo de predictorModelo.ts.
 */

import { log } from '../../agent/logger.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import { leerPostsHistorial } from './postsStore.js';
import {
  historialDesdePosts,
  predecirContenido,
  resumenHistorial,
  type EntradaContenido,
  type PrediccionContenido,
  type ResumenHistorial,
} from './predictorModelo.js';

const MENSAJE_ERROR_RED: Record<'token_expired' | 'lectura_fallida', string> = {
  token_expired: 'La conexión venció: reconectá la cuenta.',
  lectura_fallida: 'No se pudo leer la cuenta ahora.',
};

export interface EstadoRed {
  conectado: boolean;
  error: string | null;
  posts: number;
}

export interface EstadoRedes {
  instagram: EstadoRed;
  tiktok: EstadoRed;
  sincronizadoEn: string | null;
}

/** Trae los posts actuales de cada red y los guarda en el historial. Si la red falla, el historial guardado sigue sirviendo. */
export const sincronizarHistorial = async (marcaCuentas: string): Promise<EstadoRedes> => {
  try {
    const lectura = await analizarPostsDeMarca(marcaCuentas);
    const estado = (b: {
      conectado: boolean;
      error?: 'token_expired' | 'lectura_fallida';
      posts: unknown[];
    }): EstadoRed => ({
      conectado: b.conectado,
      error: b.error ? MENSAJE_ERROR_RED[b.error] : null,
      posts: b.posts.length,
    });
    return {
      instagram: estado(lectura.instagram),
      tiktok: estado(lectura.tiktok),
      sincronizadoEn: new Date().toISOString(),
    };
  } catch (err) {
    log.warn('[Predictor] no se pudo sincronizar el historial', { marcaCuentas, error: String(err) });
    const sinDato: EstadoRed = { conectado: false, error: 'No se pudo consultar las redes.', posts: 0 };
    return { instagram: sinDato, tiktok: sinDato, sincronizadoEn: null };
  }
};

export const predecirParaMarca = async (
  marcaCuentas: string,
  entrada: EntradaContenido,
): Promise<PrediccionContenido> => {
  await sincronizarHistorial(marcaCuentas);
  const posts = await leerPostsHistorial(marcaCuentas);
  return predecirContenido(historialDesdePosts(posts), entrada);
};

export const estadoPredictor = async (
  marcaCuentas: string,
): Promise<{
  instagram: number;
  tiktok: number;
  reelsConTiempoVisualizacion: number;
  resumen: ResumenHistorial;
  redes: EstadoRedes;
}> => {
  const redes = await sincronizarHistorial(marcaCuentas);
  const posts = await leerPostsHistorial(marcaCuentas);
  return {
    instagram: posts.filter((p) => p.plataforma === 'instagram').length,
    tiktok: posts.filter((p) => p.plataforma === 'tiktok').length,
    reelsConTiempoVisualizacion: posts.filter((p) => (p.tiempoVisualizacionSeg ?? null) !== null).length,
    resumen: resumenHistorial(historialDesdePosts(posts)),
    redes,
  };
};
