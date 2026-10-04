/**
 * Alertas ejecutivas: reúne los datos reales de la operación y aplica las reglas de
 * alertasMetricas.ts. Cacheado unos minutos porque la campana consulta cada minuto y las
 * métricas de cuentas salen de la red.
 */

import { getLatestReport as getIGLatestReport } from './instagramAutopilot.js';
import { getLatestReport as getTTLatestReport } from './tiktokAutopilot.js';
import { alertasDe, type Alerta, type DatosAlertas } from './alertasMetricas.js';
import { ultimaAuditoria } from './auditoriaEjecutiva.js';
import { listActiveObjectives } from './executiveOKR.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { listConversations } from '../community/dmInbox.js';
import { puntajeLead } from './propuestasEquipo.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { computeLeverage } from '../experience/executiveBrief.js';
import { buildActividadReal } from '../experience/staffActivity.js';

const CACHE_MS = 5 * 60_000;
const LEAD_MINIMO = 60;
const cache = new Map<string, { at: number; alertas: Alerta[] }>();

const leerDatos = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
): Promise<DatosAlertas> => {
  const [analytics, objetivos, pendientes, stats, ultimaAud, igReporte, ttReporte] = await Promise.all([
    construirAnalytics(marcaCuentas),
    listActiveObjectives(marcaPlataforma.id),
    listPending(marcaPlataforma.id),
    getDecisionStats(marcaPlataforma.id, 7),
    ultimaAuditoria(marcaPlataforma.id),
    getIGLatestReport(marcaPlataforma.id),
    getTTLatestReport(marcaPlataforma.id),
  ]);
  const actividad = buildActividadReal(marcaPlataforma.nombre);
  const conversaciones = listConversations().filter((c) => c.status !== 'archived');
  const leverage = computeLeverage(marcaPlataforma.id);
  const cuenta = (b: typeof analytics.instagram) => {
    const semana = b.cuenta.crecimiento?.week;
    return {
      plataforma: b.plataforma,
      conectado: b.conectado,
      error: b.error ?? null,
      seguidoresSemanaPct: semana?.available && typeof semana.pct === 'number' ? semana.pct : null,
      tasaMediana: b.posts.tasaMediana,
      publicaciones30d: b.posts.ventana30d.publicaciones,
    };
  };
  const senales = [
    ...(igReporte?.signals ?? []).map((s) => ({
      plataforma: 'instagram' as const,
      senal: s.signal,
      severidad: s.severity,
      evidencia: s.evidence,
    })),
    ...(ttReporte?.signals ?? []).map((s) => ({
      plataforma: 'tiktok' as const,
      senal: s.signal,
      severidad: s.severity,
      evidencia: s.evidence,
    })),
  ];

  return {
    cuentas: [cuenta(analytics.instagram), cuenta(analytics.tiktok)],
    decisiones: {
      pendientesCriticas: pendientes.filter((d) => d.urgency === 'critical').length,
      pendientesAltas: pendientes.filter((d) => d.urgency === 'high').length,
      expiradas7d: stats.expired,
      primeraPendiente: pendientes[0]?.title ?? null,
    },
    okr: {
      atrasados: objetivos.filter((o) => o.status === 'behind').length,
      enRiesgo: objetivos.filter((o) => o.status === 'at-risk').length,
      primerAtrasado: objetivos.find((o) => o.status === 'behind')?.title ?? null,
    },
    comunidad: {
      sinResponder: conversaciones.filter((c) => c.status === 'new').length,
      escaladas: conversaciones.filter((c) => c.status === 'escalated').length,
      leadsSinResponder: conversaciones.filter((c) => c.status === 'new' && puntajeLead(c) >= LEAD_MINIMO).length,
    },
    produccion: {
      misionesFallidas7d: actividad.conteos.misionesFallidas7d,
      carruselesEnRevision: actividad.conteos.carruselesEnRevision,
    },
    economia: { ahorroUsd: leverage.ahorroUsd, gastosUsd: leverage.gastosUsd },
    auditoria: (ultimaAud?.areas ?? []).flatMap((a) =>
      a.puntaje === null ? [] : [{ nombre: a.nombre, puntaje: a.puntaje }],
    ),
    autopilot: senales,
  };
};

export const alertasDeMarca = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
  opciones: { refrescar?: boolean } = {},
): Promise<Alerta[]> => {
  const clave = `${marcaPlataforma.id}|${marcaCuentas}`;
  const previo = cache.get(clave);
  if (!opciones.refrescar && previo && Date.now() - previo.at < CACHE_MS) return previo.alertas;
  const alertas = alertasDe(await leerDatos(marcaPlataforma, marcaCuentas), new Date().toISOString());
  cache.set(clave, { at: Date.now(), alertas });
  return alertas;
};
