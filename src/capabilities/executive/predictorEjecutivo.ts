/**
 * Predictor de contenido para la cuenta: toma el historial guardado de posts de la marca y
 * predice el contenido que se va a publicar con el modelo de predictorModelo.ts.
 */

import { leerPostsHistorial } from './postsStore.js';
import {
  historialDesdePosts,
  predecirContenido,
  type EntradaContenido,
  type PrediccionContenido,
} from './predictorModelo.js';

export const predecirParaMarca = async (
  marcaCuentas: string,
  entrada: EntradaContenido,
): Promise<PrediccionContenido> => {
  const posts = await leerPostsHistorial(marcaCuentas);
  return predecirContenido(historialDesdePosts(posts), entrada);
};

export const estadoPredictor = async (
  marcaCuentas: string,
): Promise<{ instagram: number; tiktok: number; reelsConTiempoVisualizacion: number }> => {
  const posts = await leerPostsHistorial(marcaCuentas);
  return {
    instagram: posts.filter((p) => p.plataforma === 'instagram').length,
    tiktok: posts.filter((p) => p.plataforma === 'tiktok').length,
    reelsConTiempoVisualizacion: posts.filter((p) => (p.tiempoVisualizacionSeg ?? null) !== null).length,
  };
};
