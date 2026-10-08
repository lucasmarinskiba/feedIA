/**
 * Junta ejecutiva: reúne decisiones, programación, proyectos, estrategias (OKR) y números de la
 * marca en un solo informe. Cada sección se carga por separado: si una falla, el resto igual sale.
 */

import { log } from '../../agent/logger.js';
import { listCalendarPostsByAccount } from '../../database/calendarQueue.js';
import { getOrCreateUserTier, tierConfig, type UserTierRecord } from '../../db/user-tiers.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { getOKRSummary, listActiveObjectives } from './executiveOKR.js';
import {
  analizarProyecto,
  asignacionSugerida,
  capacidadPlan,
  comparativaPlataformas,
  diagnosticoProgramacion,
  efectoArrastre,
  etiquetaOrigen,
  etiquetasOKR,
  franjasPorPlataforma,
  lecturasDecisiones,
  lecturasEstrategias,
  lecturasNumeros,
  lecturasProyectos,
  mejoresDias,
  mensajesJunta,
  progresoEsperado,
  resumenDecisiones,
  resumenProgramacion,
  resumenProyectos,
  serieSemanal,
  type CuentaPlataforma,
  type PlataformaJunta,
  type PostJunta,
  type ProgramadoJunta,
} from './juntaMetricas.js';
import { construirMesa } from './mesaEjecutiva.js';
import { compararPiloto, leerPiloto } from './pilotoEjecutivo.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import { leerProyectos, progresoProyecto } from './proyectosEjecutivo.js';

const DIA_MS = 86_400_000;
const HORA_MS = 3_600_000;

const enSeccion = async <T>(
  nombre: string,
  tarea: () => Promise<T>,
): Promise<{ valor: T | null; error: string | null }> => {
  try {
    return { valor: await tarea(), error: null };
  } catch (err) {
    log.warn(`[Junta] sección ${nombre} no disponible`, { error: String(err) });
    return { valor: null, error: nombre };
  }
};

const crecimientoPct = (
  crecimiento: Record<string, { available: boolean; pct?: number }> | null | undefined,
): number | null => {
  if (!crecimiento) return null;
  const disponible = Object.values(crecimiento).find((d) => d.available && typeof d.pct === 'number');
  return disponible?.pct ?? null;
};

export const capacidadDeRegistro = (registro: UserTierRecord, ahora: number) =>
  capacidadPlan(
    {
      plan: registro.tier,
      precioUsd: tierConfig[registro.tier].monthlyPriceUsd,
      cicloInicio: registro.subscriptionCycleStart,
      cicloFin: registro.subscriptionCycleEnd,
      limites: {
        carrusel: registro.carouselsLimit,
        historia: registro.storiesLimit,
        video: registro.videosLimit,
      },
      usados: {
        carrusel: registro.carouselsUsedThisMonth,
        historia: registro.storiesUsedThisMonth,
        video: registro.videosUsedThisMonth,
      },
    },
    ahora,
  );

const accionDePayload = (
  payload: Record<string, unknown> | undefined,
): { tipo: string | null; valor: string | null } => {
  const pl = payload ?? {};
  const tipo = typeof pl['tipo'] === 'string' ? pl['tipo'] : null;
  const valor =
    typeof pl['plataforma'] === 'string' ? pl['plataforma'] : typeof pl['tab'] === 'string' ? pl['tab'] : null;
  return { tipo, valor };
};

export const construirJunta = async (cuentasId: string, plataformaId: string, usuarioId: string) => {
  const ahora = Date.now();
  const [decisiones, estadisticasDec, okr, objetivos, bloques, calendario, analytics, proyectos, cuenta] =
    await Promise.all([
      enSeccion('decisiones', () => listPending(plataformaId)),
      enSeccion('decisiones-estadistica', () => getDecisionStats(plataformaId, 30)),
      enSeccion('okr', () => getOKRSummary(plataformaId)),
      enSeccion('objetivos', () => listActiveObjectives(plataformaId)),
      enSeccion('posts', () => analizarPostsDeMarca(cuentasId)),
      enSeccion('calendario', () =>
        listCalendarPostsByAccount(cuentasId, {
          from: new Date(ahora - 30 * DIA_MS).toISOString(),
          to: new Date(ahora + 14 * DIA_MS).toISOString(),
          limit: 300,
        }),
      ),
      enSeccion('analytics', () => construirAnalytics(cuentasId)),
      enSeccion('proyectos', () => leerProyectos(plataformaId)),
      enSeccion('plan', () => getOrCreateUserTier(usuarioId)),
    ]);

  const posts: PostJunta[] = [];
  if (bloques.valor) {
    for (const p of [...bloques.valor.instagram.posts, ...bloques.valor.tiktok.posts]) {
      posts.push({
        plataforma: p.plataforma,
        publicadoEn: p.publicadoEn,
        formato: p.formato,
        tasa: p.tasaInteraccion === null ? null : p.tasaInteraccion / 100,
        horaLocal: p.horaLocal,
      });
    }
  }

  const programados: ProgramadoJunta[] = (calendario.valor ?? []).map((c) => ({
    plataforma: c.metadata?.['platform'] === 'tiktok' ? 'tiktok' : 'instagram',
    formato: c.format,
    scheduledAt: c.scheduledAt ?? null,
    status: c.status,
  }));

  const diagnostico = calendario.valor ? diagnosticoProgramacion(programados, posts, ahora) : null;
  const arrastre = efectoArrastre(posts);
  const decResumenFinal = estadisticasDec.valor
    ? resumenDecisiones(estadisticasDec.valor, decisiones.valor ?? [], ahora)
    : null;

  const capacidad = cuenta.valor ? capacidadDeRegistro(cuenta.valor, ahora) : null;
  const asignacion = capacidad ? asignacionSugerida(capacidad, programados, posts, ahora) : null;
  const franjas = franjasPorPlataforma(posts);
  const resumen = resumenProgramacion({
    disponible: calendario.valor !== null,
    diagnostico,
    capacidad,
    asignacion,
    arrastre,
    franjas,
  });

  const igAnalytics = analytics.valor?.instagram ?? null;
  const ttAnalytics = analytics.valor?.tiktok ?? null;
  const seguidoresCrec =
    crecimientoPct(igAnalytics?.cuenta.crecimiento) ?? crecimientoPct(ttAnalytics?.cuenta.crecimiento);

  const proyectosAnalizados = (proyectos.valor ?? []).map((p) => ({
    ...p,
    progreso: progresoProyecto(p),
    analisis: analizarProyecto(p, ahora),
  }));
  const proyectosResumen = resumenProyectos(proyectosAnalizados);

  const objetivosJunta = (objetivos.valor ?? []).map((o) => ({
    id: o.id,
    titulo: o.title,
    porque: o.porque,
    categoria: o.category,
    periodo: etiquetasOKR.periodo(o.period),
    inicio: o.periodStart,
    fin: o.periodEnd,
    estado: o.status,
    estadoLabel: etiquetasOKR.estado(o.status),
    progresoPct: Math.round(o.overallProgressPct),
    progresoEsperadoPct: progresoEsperado(o.periodStart, o.periodEnd, ahora),
    semanasRestantes: o.weeksRemaining,
    recomendaciones: o.recommendations,
    resultados: o.keyResults.map((k) => ({
      descripcion: k.description,
      actual: k.current,
      meta: k.target,
      unidad: k.unidad,
      progresoPct: Math.round(k.progressPct),
      estado: k.status,
      estadoLabel: etiquetasOKR.estado(k.status),
      fuente: etiquetasOKR.fuente(k.fuente),
      tendencia: etiquetasOKR.tendencia(k.trend),
      proyeccionFinal: Math.round(k.projectedFinal * 100) / 100,
      llegaMeta: k.projectedHitsTarget,
    })),
  }));

  const cuentas: Record<PlataformaJunta, CuentaPlataforma> = {
    instagram: {
      seguidores: igAnalytics?.cuenta.seguidores ?? null,
      crecimientoPct: crecimientoPct(igAnalytics?.cuenta.crecimiento),
    },
    tiktok: {
      seguidores: ttAnalytics?.cuenta.seguidores ?? null,
      crecimientoPct: crecimientoPct(ttAnalytics?.cuenta.crecimiento),
    },
  };
  const comparativa = comparativaPlataformas(posts, cuentas, ahora);

  const mensajes = mensajesJunta({
    decisiones: decResumenFinal ? lecturasDecisiones(decResumenFinal) : [],
    programacion: resumen.acciones,
    proyectos: lecturasProyectos(proyectosAnalizados, proyectosResumen),
    estrategias: lecturasEstrategias(objetivosJunta),
    numeros: lecturasNumeros(comparativa.lecturas, seguidoresCrec),
  });

  const pilotoLeido = await enSeccion('piloto', () => leerPiloto(plataformaId));
  const piloto = pilotoLeido.valor
    ? {
        piloto: pilotoLeido.valor,
        comparacion: compararPiloto({ piloto: pilotoLeido.valor, posts, ahora }),
      }
    : { piloto: null, comparacion: null };

  const seguidoresDisponibles = [cuentas.instagram.seguidores, cuentas.tiktok.seguidores].filter(
    (s): s is number => typeof s === 'number',
  );
  const mesa = construirMesa({
    totalPosts: posts.length,
    seguidoresTotal: seguidoresDisponibles.length ? seguidoresDisponibles.reduce((s, v) => s + v, 0) : null,
    crecimientoPct: seguidoresCrec,
    decisiones: decisiones.valor
      ? {
          pendientes: decisiones.valor.length,
          criticas: decisiones.valor.filter((d) => d.urgency === 'critical').length,
          masAntiguaHoras: Math.max(
            0,
            ...decisiones.valor.map((d) => Math.round((ahora - Date.parse(d.createdAt)) / HORA_MS)),
          ),
        }
      : null,
    programacion: diagnostico
      ? {
          proximos14Dias: diagnostico.proximos14Dias,
          vencidos: diagnostico.vencidos,
          fallidos: diagnostico.fallidosUltimos14Dias,
        }
      : null,
    objetivos: objetivos.valor
      ? objetivosJunta.map((o) => ({
          titulo: o.titulo,
          progresoPct: o.progresoPct,
          progresoEsperadoPct: o.progresoEsperadoPct,
          resultadosTotal: o.resultados.length,
          resultadosQueLlegan: o.resultados.filter((r) => r.llegaMeta).length,
        }))
      : null,
  });

  return {
    generadoEn: new Date(ahora).toISOString(),
    cuentas: {
      instagram: bloques.valor?.instagram.conectado ?? false,
      tiktok: bloques.valor?.tiktok.conectado ?? false,
    },
    errores: [
      decisiones,
      estadisticasDec,
      okr,
      objetivos,
      bloques,
      calendario,
      analytics,
      proyectos,
      cuenta,
      pilotoLeido,
    ]
      .map((s) => s.error)
      .filter((e): e is string => e !== null),
    mensajes,
    mesa,
    piloto,
    decisiones: {
      resumen: decResumenFinal,
      lecturas: decResumenFinal ? lecturasDecisiones(decResumenFinal) : [],
      pendientes: (decisiones.valor ?? []).slice(0, 25).map((d) => {
        const destino = accionDePayload(d.recommendedAction?.payload);
        return {
          id: d.id,
          titulo: d.title,
          contexto: d.context,
          urgencia: d.urgency,
          origen: d.source,
          origenLabel: etiquetaOrigen(d.source),
          creadoEn: d.createdAt,
          antiguedadHoras: Math.round((ahora - Date.parse(d.createdAt)) / HORA_MS),
          accion: d.recommendedAction?.label ?? null,
          accionTipo: destino.tipo,
          accionValor: destino.valor,
          resultadoEsperado: d.expectedOutcome,
          riesgos: d.risks,
        };
      }),
    },
    programacion: {
      disponible: calendario.valor !== null,
      motivoNoDisponible:
        calendario.valor === null
          ? 'El almacenamiento de publicaciones programadas no está disponible en este servidor.'
          : null,
      agenda: (calendario.valor ?? []).map((c) => ({
        id: c.id,
        cuando: c.scheduledAt ?? c.publishedAt ?? null,
        plataforma: c.metadata?.['platform'] === 'tiktok' ? 'tiktok' : 'instagram',
        formato: c.format,
        estado: c.status,
        texto: (c.caption ?? '').slice(0, 120),
      })),
      diagnostico,
      arrastre,
      franjas,
      mejoresDias: mejoresDias(posts),
      plan: capacidad,
      asignacion,
      resumen,
      semanas: serieSemanal(posts, 8, ahora),
    },
    proyectos: {
      resumen: proyectosResumen,
      lista: proyectosAnalizados,
    },
    estrategias: {
      resumen: okr.valor,
      objetivos: objetivosJunta,
    },
    numeros: {
      seguidores: {
        instagram: cuentas.instagram.seguidores,
        tiktok: cuentas.tiktok.seguidores,
      },
      crecimientoPct: seguidoresCrec,
      tasaMediana: {
        instagram: bloques.valor ? medianaPct(posts, 'instagram') : null,
        tiktok: bloques.valor ? medianaPct(posts, 'tiktok') : null,
      },
      publicaciones30d: {
        instagram: posts.filter((p) => p.plataforma === 'instagram' && Date.parse(p.publicadoEn) >= ahora - 30 * DIA_MS)
          .length,
        tiktok: posts.filter((p) => p.plataforma === 'tiktok' && Date.parse(p.publicadoEn) >= ahora - 30 * DIA_MS)
          .length,
      },
      comparativa,
    },
  };
};

const medianaPct = (posts: PostJunta[], plataforma: 'instagram' | 'tiktok'): number | null => {
  const tasas = posts
    .filter((p) => p.plataforma === plataforma && p.tasa !== null)
    .map((p) => p.tasa as number)
    .sort((a, b) => a - b);
  if (tasas.length === 0) return null;
  const medio = Math.floor(tasas.length / 2);
  return tasas.length % 2 === 0 ? ((tasas[medio - 1] ?? 0) + (tasas[medio] ?? 0)) / 2 : (tasas[medio] ?? 0);
};
