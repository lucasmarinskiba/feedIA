/**
 * Auditoría semanal: reúne los datos reales de la operación, puntúa cada área y guarda la
 * corrida para comparar semanas. El resumen lo escribe la IA sobre los números ya calculados;
 * si no responde, se usan reglas fijas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { askJson } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import { construirAnalytics, type BloqueAnalytics } from '../experience/analyticsResumen.js';
import { computeLeverage } from '../experience/executiveBrief.js';
import { buildActividadReal } from '../experience/staffActivity.js';
import { listConversations } from '../community/dmInbox.js';
import { listActiveObjectives } from './executiveOKR.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { puntajeLead } from './propuestasEquipo.js';
import {
  bandaDe,
  evaluarAreas,
  prioridadesDe,
  puntajeGeneral,
  resumenReglas,
  type AreaAuditoria,
  type BandaAuditoria,
  type DatosAuditoria,
  type DatosCuentaAuditoria,
  type PrioridadAuditoria,
} from './auditoriaMetricas.js';

const AUDITORIAS_DIR = path.resolve('data/executive/auditorias');
const LEAD_MINIMO = 60;

export interface AuditoriaRegistro {
  id: string;
  generatedAt: string;
  puntaje: number | null;
  banda: BandaAuditoria;
  resumen: string;
  resumenFuente: 'ia' | 'reglas';
  areas: AreaAuditoria[];
  prioridades: PrioridadAuditoria[];
}

export interface ResumenAuditoria {
  id: string;
  generatedAt: string;
  puntaje: number | null;
  banda: BandaAuditoria;
  resumen: string;
}

const archivo = (marcaId: string): string => path.join(AUDITORIAS_DIR, `${marcaId}.jsonl`);

const leerRegistros = async (marcaId: string): Promise<AuditoriaRegistro[]> => {
  try {
    const raw = await fs.readFile(archivo(marcaId), 'utf-8');
    return raw
      .split('\n')
      .filter((linea) => linea.trim().length > 0)
      .map((linea) => JSON.parse(linea) as AuditoriaRegistro);
  } catch {
    return [];
  }
};

const cuentaDe = (b: BloqueAnalytics): DatosCuentaAuditoria => {
  const semana = b.cuenta.crecimiento?.week;
  return {
    plataforma: b.plataforma,
    conectado: b.conectado,
    error: b.error ?? null,
    seguidoresSemana: semana?.available && typeof semana.value === 'number' ? semana.value : null,
    seguidoresSemanaPct: semana?.available && typeof semana.pct === 'number' ? semana.pct : null,
    publicaciones30d: b.posts.ventana30d.publicaciones,
    tasaMediana: b.posts.tasaMediana,
  };
};

const leerDatos = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
): Promise<DatosAuditoria> => {
  const [analytics, objetivos, pendientes, stats] = await Promise.all([
    construirAnalytics(marcaCuentas),
    listActiveObjectives(marcaPlataforma.id),
    listPending(marcaPlataforma.id),
    getDecisionStats(marcaPlataforma.id, 7),
  ]);
  const actividad = buildActividadReal(marcaPlataforma.nombre);
  const conversaciones = listConversations().filter((c) => c.status !== 'archived');
  const leverage = computeLeverage(marcaPlataforma.id);

  return {
    cuentas: [cuentaDe(analytics.instagram), cuentaDe(analytics.tiktok)],
    objetivos: {
      total: objetivos.length,
      enMeta: objetivos.filter((o) => o.status === 'on-track' || o.status === 'ahead' || o.status === 'completed')
        .length,
      enRiesgo: objetivos.filter((o) => o.status === 'at-risk').length,
      atrasados: objetivos.filter((o) => o.status === 'behind').length,
      primerAtrasado: objetivos.find((o) => o.status === 'behind')?.title ?? null,
    },
    decisiones: {
      total: stats.total,
      pendientes: pendientes.length,
      pendientesUrgentes: pendientes.filter((d) => d.urgency === 'critical' || d.urgency === 'high').length,
      expiradas: stats.expired,
      tiempoResolucionMin: stats.avgResolutionMinutes > 0 ? stats.avgResolutionMinutes : null,
    },
    produccion: {
      acciones7d: actividad.conteos.acciones7d,
      misionesFallidas7d: actividad.conteos.misionesFallidas7d,
      carruselesEnRevision: actividad.conteos.carruselesEnRevision,
      piezas: actividad.piezas,
    },
    comunidad: {
      total: conversaciones.length,
      sinResponder: conversaciones.filter((c) => c.status === 'new').length,
      escaladas: conversaciones.filter((c) => c.status === 'escalated').length,
      leadsSinResponder: conversaciones.filter((c) => c.status === 'new' && puntajeLead(c) >= LEAD_MINIMO).length,
    },
    economia: { ahorroUsd: leverage.ahorroUsd, gastosUsd: leverage.gastosUsd },
  };
};

const resumenIA = async (
  puntaje: { puntaje: number | null; banda: BandaAuditoria },
  areas: AreaAuditoria[],
  prioridades: PrioridadAuditoria[],
): Promise<{ texto: string; fuente: 'ia' | 'reglas' }> => {
  const payload = {
    puntajeGeneral: puntaje,
    areas: areas.map((a) => ({ area: a.nombre, puntaje: a.puntaje, banda: a.banda, observaciones: a.observaciones })),
    prioridades: prioridades.map((p) => ({ titulo: p.titulo, porque: p.porque })),
  };
  try {
    const raw = await askJson<{ resumen?: unknown }>(
      `Sos el Chief of Staff de la cuenta de redes de la marca. Escribí el resumen ejecutivo de la auditoría semanal en 3 o 4 oraciones, en español rioplatense claro. Usá solo los datos de este JSON: no inventes cifras ni causas. Si un área no tiene datos, decilo sin suponer. Devolvé {"resumen": "..."}.\n\nDatos:\n${JSON.stringify(payload)}`,
      { fast: true, maxTokens: 600, temperature: 0.3 },
    );
    if (typeof raw.resumen === 'string' && raw.resumen.trim().length > 0) {
      return { texto: raw.resumen.trim().slice(0, 900), fuente: 'ia' };
    }
  } catch (err) {
    log.warn('[Auditoria] resumen de IA no disponible, se usan reglas', { error: String(err) });
  }
  return { texto: resumenReglas(puntaje, areas, prioridades), fuente: 'reglas' };
};

export const correrAuditoria = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
): Promise<AuditoriaRegistro> => {
  const datos = await leerDatos(marcaPlataforma, marcaCuentas);
  const areas = evaluarAreas(datos);
  const general = puntajeGeneral(areas);
  const prioridades = prioridadesDe(areas);
  const resumen = await resumenIA(general, areas, prioridades);
  const registro: AuditoriaRegistro = {
    id: `aud-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    puntaje: general.puntaje,
    banda: general.banda,
    resumen: resumen.texto,
    resumenFuente: resumen.fuente,
    areas,
    prioridades,
  };
  await fs.mkdir(AUDITORIAS_DIR, { recursive: true });
  await fs.appendFile(archivo(marcaPlataforma.id), `${JSON.stringify(registro)}\n`, 'utf-8');
  return registro;
};

export const ultimaAuditoria = async (marcaId: string): Promise<AuditoriaRegistro | null> => {
  const registros = await leerRegistros(marcaId);
  return registros[registros.length - 1] ?? null;
};

export const historialAuditorias = async (marcaId: string, limite: number): Promise<ResumenAuditoria[]> => {
  const registros = await leerRegistros(marcaId);
  return registros
    .slice(-limite)
    .reverse()
    .map((r) => ({ id: r.id, generatedAt: r.generatedAt, puntaje: r.puntaje, banda: r.banda, resumen: r.resumen }));
};

export const tendenciaAuditorias = async (
  marcaId: string,
): Promise<{ current: number | null; previous: number | null; deltaPct: number | null } | null> => {
  const conPuntaje = (await leerRegistros(marcaId)).filter((r) => r.puntaje !== null);
  const actual = conPuntaje[conPuntaje.length - 1];
  if (!actual) return null;
  const previo = conPuntaje[conPuntaje.length - 2];
  const current = actual.puntaje;
  const previous = previo?.puntaje ?? null;
  const deltaPct = previous && current !== null ? Math.round(((current - previous) / previous) * 100) : null;
  return { current, previous, deltaPct };
};
