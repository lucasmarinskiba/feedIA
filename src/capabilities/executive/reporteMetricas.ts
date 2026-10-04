/**
 * Reporte ejecutivo: formato, resumen y recomendaciones a partir de datos ya leídos.
 * Función pura: solo importa tipos, no toca red ni disco.
 */

import type { BloqueAnalytics } from '../experience/analyticsResumen.js';
import type { ActividadReal } from '../experience/staffActivity.js';
import type { Leverage } from '../experience/executiveBrief.js';
import type { DecisionUrgency, ExecutiveDecision } from './executiveDecisionQueue.js';
import type { Objective } from './executiveOKR.js';
import type { Propuesta } from './propuestasEquipo.js';
import type { DevolucionPosts } from './postsDevoluciones.js';

export const PERIODOS_REPORTE = {
  week: { dias: 7, etiqueta: 'última semana' },
  month: { dias: 30, etiqueta: 'último mes' },
  quarter: { dias: 90, etiqueta: 'último trimestre' },
  halfYear: { dias: 182, etiqueta: 'últimos 6 meses' },
  year: { dias: 365, etiqueta: 'último año' },
} as const;

export type PeriodoReporte = keyof typeof PERIODOS_REPORTE;

export const esPeriodoReporte = (valor: string | undefined): valor is PeriodoReporte =>
  valor !== undefined && (Object.keys(PERIODOS_REPORTE) as string[]).includes(valor);

const NOMBRE_RED = { instagram: 'Instagram', tiktok: 'TikTok' } as const;
const FORMATO_PLURAL: Record<string, string> = {
  reel: 'reels',
  carrusel: 'carruseles',
  imagen: 'imágenes',
  video: 'videos',
};

export interface TopPostReporte {
  texto: string;
  formato: string;
  interacciones: number;
  tasaInteraccion: number | null;
  url: string | null;
  publicadoEn: string;
}

export interface CuentaReporte {
  plataforma: keyof typeof NOMBRE_RED;
  conectado: boolean;
  error: string | null;
  handle: string | null;
  seguidores: number | null;
  crecimiento: { disponible: boolean; valor: number | null; pct: number | null };
  alcanceEtiqueta: 'Alcance' | 'Vistas';
  alcance30d: number | null;
  tasaMediana: number | null;
  publicaciones30d: number;
  interacciones30d: number;
  mejorFormato: string | null;
  mejorHora: number | null;
  topPosts: TopPostReporte[];
}

export interface ResultadoReporte {
  descripcion: string;
  actual: number;
  meta: number;
  unidad: string;
  progresoPct: number;
  estado: string;
}

export interface ObjetivoReporte {
  titulo: string;
  categoria: string;
  periodo: string;
  progresoPct: number;
  estado: string;
  porque: string;
  resultados: ResultadoReporte[];
}

export interface ObjetivosReporte {
  total: number;
  enMeta: number;
  enRiesgo: number;
  atrasados: number;
  progresoPromedioPct: number | null;
  lista: ObjetivoReporte[];
}

export interface DecisionesReporte {
  pendientes: number;
  enPeriodo: number;
  aprobadas: number;
  rechazadas: number;
  autoEjecutadas: number;
  expiradas: number;
  tasaAprobacionPct: number | null;
  tiempoResolucionMin: number | null;
  pendientesPorUrgencia: Record<DecisionUrgency, number>;
  ultimasPendientes: Array<{ titulo: string; origen: string; urgencia: DecisionUrgency; creada: string }>;
}

export interface PropuestaReporte {
  titulo: string;
  detalle: string;
  dato: string;
  agente: string;
  prioridad: string;
}

export interface EconomiaReporte {
  piezas: number;
  piezasCarruseles: number;
  piezasVideos: number;
  horasAhorradas: number;
  costoHumanoUsd: number;
  gastosIaUsd: number;
  ahorroUsd: number;
}

export interface ActividadReporte {
  acciones24h: number;
  acciones7d: number;
  agentesActivos7d: number;
  misionesFallidas7d: number;
  carruselesEnRevision: number;
  piezas: number;
  comentariosRevisados: number;
  respuestasPreparadas: number;
}

export interface MiraReporte {
  plataforma: keyof typeof NOMBRE_RED;
  fuente: DevolucionPosts['fuente'];
  general: string;
}

export interface SeccionesReporte {
  cuentas: CuentaReporte[];
  objetivos: ObjetivosReporte;
  decisiones: DecisionesReporte;
  propuestas: PropuestaReporte[];
  economia: EconomiaReporte;
  actividad: ActividadReporte;
  mira: MiraReporte | null;
}

const redondear = (n: number, decimales = 1): number => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

const miles = (n: number): string => Math.round(n).toLocaleString('es-AR');
const porcentaje = (n: number | null): string => (n === null ? 'sin dato' : `${n.toFixed(1)}%`);
const conSigno = (n: number): string => `${n > 0 ? '+' : ''}${miles(n)}`;

export const mapearCuenta = (bloque: BloqueAnalytics, periodo: PeriodoReporte): CuentaReporte => {
  const delta = bloque.cuenta.crecimiento?.[periodo];
  const alcance = bloque.cuenta.metricas.find((m) => /alcance|views/i.test(m.label));
  const v = bloque.posts.ventana30d;
  return {
    plataforma: bloque.plataforma,
    conectado: bloque.conectado,
    error: bloque.error ?? null,
    handle: bloque.cuenta.handle,
    seguidores: bloque.cuenta.seguidores,
    crecimiento: {
      disponible: Boolean(delta?.available),
      valor: delta?.available && typeof delta.value === 'number' ? delta.value : null,
      pct: delta?.available && typeof delta.pct === 'number' ? redondear(delta.pct) : null,
    },
    alcanceEtiqueta: bloque.plataforma === 'tiktok' ? 'Vistas' : 'Alcance',
    alcance30d: alcance ? alcance.value : null,
    tasaMediana: bloque.posts.tasaMediana === null ? null : redondear(bloque.posts.tasaMediana),
    publicaciones30d: v.publicaciones,
    interacciones30d: v.interacciones,
    mejorFormato: bloque.posts.mejorFormato
      ? (FORMATO_PLURAL[bloque.posts.mejorFormato] ?? bloque.posts.mejorFormato)
      : null,
    mejorHora: bloque.posts.mejorHora,
    topPosts: bloque.posts.top.map((t) => ({
      texto: t.texto,
      formato: FORMATO_PLURAL[t.formato] ?? t.formato,
      interacciones: t.interacciones,
      tasaInteraccion: t.tasaInteraccion === null ? null : redondear(t.tasaInteraccion),
      url: t.url,
      publicadoEn: t.publicadoEn,
    })),
  };
};

export const mapearObjetivos = (objetivos: Objective[]): ObjetivosReporte => {
  const cuenta = (...estados: string[]): number => objetivos.filter((o) => estados.includes(o.status)).length;
  const promedio =
    objetivos.length > 0 ? objetivos.reduce((s, o) => s + o.overallProgressPct, 0) / objetivos.length : null;
  return {
    total: objetivos.length,
    enMeta: cuenta('on-track', 'ahead', 'completed'),
    enRiesgo: cuenta('at-risk'),
    atrasados: cuenta('behind'),
    progresoPromedioPct: promedio === null ? null : redondear(promedio),
    lista: objetivos.map((o) => ({
      titulo: o.title,
      categoria: o.category,
      periodo: o.period,
      progresoPct: redondear(o.overallProgressPct),
      estado: o.status,
      porque: o.porque,
      resultados: o.keyResults.map((kr) => ({
        descripcion: kr.description,
        actual: kr.current,
        meta: kr.target,
        unidad: kr.unidad,
        progresoPct: redondear(kr.progressPct),
        estado: kr.status,
      })),
    })),
  };
};

export interface EstadisticasDecisiones {
  total: number;
  approved: number;
  rejected: number;
  autoExecuted: number;
  expired: number;
  avgResolutionMinutes: number;
}

export const mapearDecisiones = (stats: EstadisticasDecisiones, pendientes: ExecutiveDecision[]): DecisionesReporte => {
  const porUrgencia: Record<DecisionUrgency, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const d of pendientes) porUrgencia[d.urgency] += 1;
  const resueltas = stats.approved + stats.rejected;
  return {
    pendientes: pendientes.length,
    enPeriodo: stats.total,
    aprobadas: stats.approved,
    rechazadas: stats.rejected,
    autoEjecutadas: stats.autoExecuted,
    expiradas: stats.expired,
    tasaAprobacionPct: resueltas > 0 ? redondear((stats.approved / resueltas) * 100) : null,
    tiempoResolucionMin: stats.avgResolutionMinutes > 0 ? redondear(stats.avgResolutionMinutes, 0) : null,
    pendientesPorUrgencia: porUrgencia,
    ultimasPendientes: pendientes.slice(0, 5).map((d) => ({
      titulo: d.title,
      origen: d.source,
      urgencia: d.urgency,
      creada: d.createdAt,
    })),
  };
};

export const mapearPropuestas = (propuestas: Propuesta[]): PropuestaReporte[] =>
  propuestas.slice(0, 5).map((p) => ({
    titulo: p.titulo,
    detalle: p.detalle,
    dato: p.dato,
    agente: p.agente,
    prioridad: p.prioridad,
  }));

export const mapearEconomia = (l: Leverage): EconomiaReporte => ({
  piezas: l.piezasCreadas.total,
  piezasCarruseles: l.piezasCreadas.carruseles,
  piezasVideos: l.piezasCreadas.videos,
  horasAhorradas: redondear(l.horasHumanasAhorradas),
  costoHumanoUsd: Math.round(l.costoHumanoEquivalenteUsd),
  gastosIaUsd: redondear(l.gastosUsd, 2),
  ahorroUsd: Math.round(l.ahorroUsd),
});

export const mapearActividad = (a: ActividadReal): ActividadReporte => ({
  acciones24h: a.conteos.acciones24h,
  acciones7d: a.conteos.acciones7d,
  agentesActivos7d: a.conteos.agentesActivos7d,
  misionesFallidas7d: a.conteos.misionesFallidas7d,
  carruselesEnRevision: a.conteos.carruselesEnRevision,
  piezas: a.piezas,
  comentariosRevisados: a.comentariosRevisados,
  respuestasPreparadas: a.respuestasPreparadas,
});

export const elegirMira = (instagram: DevolucionPosts | null, tiktok: DevolucionPosts | null): MiraReporte | null => {
  if (instagram) return { plataforma: 'instagram', fuente: instagram.fuente, general: instagram.general };
  if (tiktok) return { plataforma: 'tiktok', fuente: tiktok.fuente, general: tiktok.general };
  return null;
};

export const armarResumen = (r: SeccionesReporte): string[] => {
  const lineas: string[] = [];
  const conectadas = r.cuentas.filter((c) => c.conectado);
  if (conectadas.length === 0) {
    lineas.push('Ninguna red está conectada: el reporte todavía no tiene métricas de cuenta.');
  }
  for (const c of conectadas) {
    const nombre = NOMBRE_RED[c.plataforma];
    const seguidores = c.seguidores === null ? 'seguidores sin dato' : `${miles(c.seguidores)} seguidores`;
    const crecimiento =
      c.crecimiento.valor !== null
        ? `${conSigno(c.crecimiento.valor)} en el período`
        : 'sin historial suficiente para el período';
    lineas.push(`${nombre}: ${seguidores}, ${crecimiento}.`);
    if (c.publicaciones30d > 0) {
      lineas.push(
        `${nombre}: ${c.publicaciones30d} publicaciones en los últimos 30 días, con tasa de interacción mediana de ${porcentaje(c.tasaMediana)}.`,
      );
    }
  }
  if (r.objetivos.total > 0) {
    lineas.push(
      `Objetivos: ${r.objetivos.total} activos, ${r.objetivos.enMeta} en meta y ${r.objetivos.enRiesgo + r.objetivos.atrasados} con riesgo.`,
    );
  } else {
    lineas.push('Todavía no hay objetivos activos.');
  }
  lineas.push(`Decisiones pendientes: ${r.decisiones.pendientes}.`);
  return lineas;
};

export const armarRecomendaciones = (r: SeccionesReporte): string[] => {
  const reco: string[] = [];
  for (const c of r.cuentas.filter((x) => x.conectado)) {
    const nombre = NOMBRE_RED[c.plataforma];
    if (c.crecimiento.valor !== null && c.crecimiento.valor < 0) {
      reco.push(
        `Los seguidores de ${nombre} bajaron ${miles(Math.abs(c.crecimiento.valor))} en el período: revisá qué formato dejó de rendir y respondé a tu comunidad.`,
      );
    }
    if (c.mejorFormato) {
      reco.push(
        `En ${nombre}, los ${c.mejorFormato} son el formato con mejor interacción: priorizalos en las próximas publicaciones.`,
      );
    }
    if (c.mejorHora !== null) {
      reco.push(
        `En ${nombre}, publicá alrededor de las ${c.mejorHora}h (hora de Argentina): es la franja con mejor interacción.`,
      );
    }
  }
  const riesgo = r.objetivos.enRiesgo + r.objetivos.atrasados;
  if (riesgo > 0) {
    const primero = r.objetivos.lista.find((o) => o.estado === 'behind' || o.estado === 'at-risk');
    reco.push(
      `${riesgo} objetivo(s) con riesgo${primero ? `: empezá por «${primero.titulo}»` : ''}. Revisá sus resultados clave en OKRs.`,
    );
  }
  const urgentes = r.decisiones.pendientesPorUrgencia.critical + r.decisiones.pendientesPorUrgencia.high;
  if (urgentes > 0) {
    reco.push(`Tenés ${urgentes} decisión(es) de urgencia alta o crítica esperando tu aprobación.`);
  }
  if (r.propuestas.length > 0) {
    reco.push(`Hay ${r.propuestas.length} propuesta(s) abiertas. La primera: «${r.propuestas[0]?.titulo ?? ''}».`);
  }
  if (!r.cuentas.some((c) => c.conectado)) {
    reco.push('Conectá Instagram o TikTok para recibir recomendaciones basadas en tus datos reales.');
  } else if (reco.length === 0) {
    reco.push('Sin señales de alerta en los datos disponibles.');
  }
  return reco;
};

export const armarLimitaciones = (cuentas: CuentaReporte[]): string[] => {
  const notas: string[] = [];
  for (const c of cuentas) {
    const nombre = NOMBRE_RED[c.plataforma];
    if (c.error === 'token_expired') {
      notas.push(`La conexión de ${nombre} venció: volvé a conectarla para ver sus métricas.`);
    } else if (!c.conectado) {
      notas.push(`${nombre} no está conectado: sus métricas no aparecen en este reporte.`);
    } else if (c.error) {
      notas.push(`No pudimos leer las métricas de ${nombre} en este momento.`);
    }
  }
  notas.push('La economía operativa es acumulada desde el inicio de FeedIA, no del período elegido.');
  notas.push(
    'Las métricas que la API de cada red no entrega (por ejemplo, retención o alcance FYP en TikTok) no aparecen.',
  );
  return notas;
};
