/**
 * Agregados de Analytics a partir de datos ya leídos de Instagram y TikTok. Función pura:
 * no toca red ni disco. Los campos que la red no entrega llegan como null y se excluyen
 * de las sumas en lugar de contarse como cero.
 */

import type { PostAnalizado, PostFormato, ResumenFormato, ResumenPosts } from '../executive/postsMetricas.js';

export interface PuntoSeguidores {
  fecha: string;
  seguidores: number;
}

export interface TopPost {
  id: string;
  texto: string;
  formato: PostFormato;
  url: string | null;
  publicadoEn: string;
  interacciones: number;
  tasaInteraccion: number | null;
  alcance: number | null;
  veredicto: PostAnalizado['veredicto'];
}

export interface VentanaPosts {
  publicaciones: number;
  interacciones: number;
  likes: number;
  comentarios: number;
  compartidos: number | null;
  guardados: number | null;
  alcance: number | null;
}

export interface ResumenAnalyticsPosts {
  analizados: number;
  ventana30d: VentanaPosts;
  frecuenciaSemanal: number | null;
  tasaMediana: number | null;
  mejorFormato: PostFormato | null;
  mejorHora: number | null;
  porFormato: ResumenFormato[];
  top: TopPost[];
}

export interface DistribucionItem {
  etiqueta: string;
  valor: number;
  pct: number;
}

export interface RespuestaDesgloseMeta {
  data?: Array<{
    total_value?: {
      breakdowns?: Array<{ results?: Array<{ dimension_values?: string[]; value?: number }> }>;
    };
  }>;
}

const DIA_MS = 86_400_000;
const VENTANA_DIAS = 30;
const TOP_N = 3;
const ITEMS_DISTRIBUCION = 8;

export const serieSeguidores = (historial: Array<{ capturedAt: string; followers: number }>): PuntoSeguidores[] => {
  const porDia = new Map<string, number>();
  const ordenado = [...historial].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  for (const p of ordenado) porDia.set(p.capturedAt.slice(0, 10), p.followers);
  return [...porDia.entries()].map(([fecha, seguidores]) => ({ fecha, seguidores }));
};

const sumaOpcional = (valores: Array<number | null>): number | null => {
  const reales = valores.filter((v): v is number => v !== null);
  return reales.length > 0 ? reales.reduce((s, v) => s + v, 0) : null;
};

export const resumenDePosts = (
  posts: PostAnalizado[],
  resumen: ResumenPosts,
  ahoraMs: number,
): ResumenAnalyticsPosts => {
  const desde = ahoraMs - VENTANA_DIAS * DIA_MS;
  const enVentana = posts.filter((p) => Date.parse(p.publicadoEn) >= desde);
  return {
    analizados: posts.length,
    ventana30d: {
      publicaciones: enVentana.length,
      interacciones: enVentana.reduce((s, p) => s + p.interacciones, 0),
      likes: enVentana.reduce((s, p) => s + p.likes, 0),
      comentarios: enVentana.reduce((s, p) => s + p.comentarios, 0),
      compartidos: sumaOpcional(enVentana.map((p) => p.compartidos)),
      guardados: sumaOpcional(enVentana.map((p) => p.guardados)),
      alcance: sumaOpcional(enVentana.map((p) => p.alcance)),
    },
    frecuenciaSemanal: posts.length > 0 ? Math.round((enVentana.length / VENTANA_DIAS) * 7 * 10) / 10 : null,
    tasaMediana: resumen.tasaMediana,
    mejorFormato: resumen.mejorFormato,
    mejorHora: resumen.mejorHora,
    porFormato: resumen.porFormato,
    top: posts
      .filter((p) => p.tasaInteraccion !== null)
      .sort((a, b) => (b.tasaInteraccion ?? 0) - (a.tasaInteraccion ?? 0))
      .slice(0, TOP_N)
      .map((p) => ({
        id: p.id,
        texto: p.texto,
        formato: p.formato,
        url: p.url,
        publicadoEn: p.publicadoEn,
        interacciones: p.interacciones,
        tasaInteraccion: p.tasaInteraccion,
        alcance: p.alcance,
        veredicto: p.veredicto,
      })),
  };
};

export const distribucion = (items: Array<{ etiqueta: string; valor: number }>): DistribucionItem[] => {
  const total = items.reduce((s, i) => s + i.valor, 0);
  if (total <= 0) return [];
  return items
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, ITEMS_DISTRIBUCION)
    .map((i) => ({ etiqueta: i.etiqueta, valor: i.valor, pct: Math.round((i.valor / total) * 1000) / 10 }));
};

export const parsearDesgloseMeta = (
  raw: RespuestaDesgloseMeta | null,
  etiquetas: Record<string, string> = {},
): DistribucionItem[] => {
  const resultados = raw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  return distribucion(
    resultados.flatMap((r) => {
      const clave = r.dimension_values?.[0];
      if (!clave || typeof r.value !== 'number') return [];
      return [{ etiqueta: etiquetas[clave] ?? clave, valor: r.value }];
    }),
  );
};
