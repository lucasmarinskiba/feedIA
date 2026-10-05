/**
 * Reporte ejecutivo: junta en una sola lectura las cuentas, los posts, los objetivos, las
 * decisiones, las propuestas, la economía y la actividad. Solo lee; no decide ni cambia estado.
 *
 * Dos marcas: las cuentas de Instagram y TikTok se leen de la marca de la sesión (donde se
 * conectan); OKRs, decisiones, economía y actividad se leen de la marca de plataforma (donde
 * se generan). Lo que una red no entrega queda explicado en `limitaciones`.
 */

import { analizarPostsDeMarca } from './postsAnalisis.js';
import { devolverAnalisis } from './postsDevoluciones.js';
import { listActiveObjectives } from './executiveOKR.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { construirPropuestas } from './propuestasEquipo.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { computeLeverage } from '../experience/executiveBrief.js';
import { buildActividadReal } from '../experience/staffActivity.js';
import {
  PERIODOS_REPORTE,
  armarLimitaciones,
  armarRecomendaciones,
  armarResumen,
  elegirMira,
  mapearActividad,
  mapearCuenta,
  mapearDecisiones,
  mapearEconomia,
  mapearObjetivos,
  mapearPropuestas,
  type PeriodoReporte,
  type SeccionesReporte,
} from './reporteMetricas.js';

export interface ReporteEjecutivo extends SeccionesReporte {
  marca: string;
  generadoEn: string;
  periodo: PeriodoReporte;
  periodoEtiqueta: string;
  dias: number;
  resumen: string[];
  recomendaciones: string[];
  limitaciones: string[];
}

export interface OpcionesReporte {
  marcaPlataforma: { id: string; nombre: string };
  marcaCuentas: string;
  periodo: PeriodoReporte;
}

export const construirReporte = async ({
  marcaPlataforma,
  marcaCuentas,
  periodo,
}: OpcionesReporte): Promise<ReporteEjecutivo> => {
  const cfg = PERIODOS_REPORTE[periodo];
  const [analytics, bloquesPosts, objetivos, propuestas, pendientes, stats] = await Promise.all([
    construirAnalytics(marcaCuentas),
    analizarPostsDeMarca(marcaCuentas),
    listActiveObjectives(marcaPlataforma.id),
    construirPropuestas(marcaPlataforma.id, marcaPlataforma.nombre, marcaCuentas, ''),
    listPending(marcaPlataforma.id),
    getDecisionStats(marcaPlataforma.id, cfg.dias),
  ]);
  const [miraIg, miraTt] = await Promise.all([
    devolverAnalisis(bloquesPosts.instagram),
    devolverAnalisis(bloquesPosts.tiktok),
  ]);

  const secciones: SeccionesReporte = {
    cuentas: [mapearCuenta(analytics.instagram, periodo), mapearCuenta(analytics.tiktok, periodo)],
    objetivos: mapearObjetivos(objetivos),
    decisiones: mapearDecisiones(stats, pendientes),
    propuestas: mapearPropuestas(propuestas),
    economia: mapearEconomia(computeLeverage(marcaPlataforma.id)),
    actividad: mapearActividad(buildActividadReal(marcaPlataforma.nombre)),
    mira: elegirMira(miraIg, miraTt),
  };

  return {
    ...secciones,
    marca: marcaPlataforma.nombre,
    generadoEn: new Date().toISOString(),
    periodo,
    periodoEtiqueta: cfg.etiqueta,
    dias: cfg.dias,
    resumen: armarResumen(secciones),
    recomendaciones: armarRecomendaciones(secciones),
    limitaciones: armarLimitaciones(secciones.cuentas),
  };
};
