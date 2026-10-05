/**
 * Junta ejecutiva: reúne decisiones, programación, proyectos, estrategias (OKR) y números de la
 * marca en un solo informe. Cada sección se carga por separado: si una falla, el resto igual sale.
 */

import { log } from '../../agent/logger.js';
import { listCalendarPostsByAccount } from '../../database/calendarQueue.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { getOKRSummary, listActiveObjectives } from './executiveOKR.js';
import {
  diagnosticoProgramacion,
  efectoArrastre,
  mejoresFranjas,
  mensajesJunta,
  resumenDecisiones,
  serieSemanal,
  type PostJunta,
  type ProgramadoJunta,
} from './juntaMetricas.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import { leerProyectos, progresoProyecto } from './proyectosEjecutivo.js';

const DIA_MS = 86_400_000;

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

export const construirJunta = async (cuentasId: string, plataformaId: string) => {
  const ahora = Date.now();
  const [decisiones, estadisticasDec, okr, objetivos, bloques, calendario, analytics, proyectos] = await Promise.all([
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
  const decResumenFinal = estadisticasDec.valor ? resumenDecisiones(estadisticasDec.valor) : null;

  const igAnalytics = analytics.valor?.instagram ?? null;
  const ttAnalytics = analytics.valor?.tiktok ?? null;
  const seguidoresCrec =
    crecimientoPct(igAnalytics?.cuenta.crecimiento) ?? crecimientoPct(ttAnalytics?.cuenta.crecimiento);

  const peorBrecha = okr.valor?.topConcern
    ? `Va atrasado: «${okr.valor.topConcern.krDescription}» en «${okr.valor.topConcern.objectiveTitle}» (brecha ${okr.valor.topConcern.gap.toFixed(0)} %).`
    : null;

  const mensajes = decResumenFinal
    ? mensajesJunta({
        decisiones: decResumenFinal,
        diagnostico,
        arrastre,
        okrPeorBrecha: peorBrecha,
        seguidoresCrecimientoPct: seguidoresCrec,
      })
    : [];

  return {
    generadoEn: new Date(ahora).toISOString(),
    cuentas: {
      instagram: bloques.valor?.instagram.conectado ?? false,
      tiktok: bloques.valor?.tiktok.conectado ?? false,
    },
    errores: [decisiones, estadisticasDec, okr, objetivos, bloques, calendario, analytics, proyectos]
      .map((s) => s.error)
      .filter((e): e is string => e !== null),
    mensajes,
    decisiones: {
      resumen: decResumenFinal,
      pendientes: (decisiones.valor ?? []).slice(0, 8).map((d) => ({
        id: d.id,
        titulo: d.title,
        urgencia: d.urgency,
        origen: d.source,
        creadoEn: d.createdAt,
        accion: d.recommendedAction?.label ?? null,
        resultadoEsperado: d.expectedOutcome,
      })),
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
      mejoresFranjas: mejoresFranjas(posts),
      semanas: serieSemanal(posts, 8, ahora),
    },
    proyectos: (proyectos.valor ?? []).map((p) => ({ ...p, progreso: progresoProyecto(p) })),
    estrategias: {
      resumen: okr.valor,
      objetivos: (objetivos.valor ?? []).map((o) => ({
        id: o.id,
        titulo: o.title,
        categoria: o.category,
        estado: o.status,
        progresoPct: Math.round(o.overallProgressPct),
        fin: o.periodEnd,
        resultados: o.keyResults.map((k) => ({
          descripcion: k.description,
          actual: k.current,
          meta: k.target,
          unidad: k.unidad,
          progresoPct: Math.round(k.progressPct),
          estado: k.status,
        })),
      })),
    },
    numeros: {
      seguidores: {
        instagram: igAnalytics?.cuenta.seguidores ?? null,
        tiktok: ttAnalytics?.cuenta.seguidores ?? null,
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
