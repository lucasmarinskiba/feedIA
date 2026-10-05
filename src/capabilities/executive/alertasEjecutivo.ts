/**
 * Alertas ejecutivas: reúne los datos reales de la operación y aplica las reglas de
 * alertasMetricas.ts. Cacheado unos minutos porque la campana consulta cada minuto y las
 * métricas de cuentas salen de la red. Los silencios se aplican en cada consulta, no en la caché.
 */

import { log } from '../../agent/logger.js';
import { listCalendarPostsByAccount } from '../../database/calendarQueue.js';
import { getOrCreateUserTier } from '../../db/user-tiers.js';
import { getLatestReport as getIGLatestReport } from './instagramAutopilot.js';
import { getLatestReport as getTTLatestReport } from './tiktokAutopilot.js';
import {
  alertasDe,
  aplicarSilencios,
  type Alerta,
  type DatosAlertas,
  type SilenciosAlertas,
} from './alertasMetricas.js';
import { leerSilencios } from './alertasEstado.js';
import { ultimaAuditoria } from './auditoriaEjecutiva.js';
import { listActiveObjectives } from './executiveOKR.js';
import { getDecisionStats, listPending } from './executiveDecisionQueue.js';
import { listConversations } from '../community/dmInbox.js';
import { puntajeLead } from './propuestasEquipo.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { computeLeverage } from '../experience/executiveBrief.js';
import { buildActividadReal } from '../experience/staffActivity.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import { capacidadDeRegistro } from './juntaEjecutiva.js';
import {
  comparativaPlataformas,
  diagnosticoProgramacion,
  type PostJunta,
  type ProgramadoJunta,
} from './juntaMetricas.js';

const CACHE_MS = 5 * 60_000;
const LEAD_MINIMO = 60;
const DIA_MS = 86_400_000;
const cache = new Map<string, { at: number; alertas: Alerta[] }>();

const sinDatoSeguro = async <T>(nombre: string, tarea: () => Promise<T>): Promise<T | null> => {
  try {
    return await tarea();
  } catch (err) {
    log.warn(`[Alertas] ${nombre} no disponible`, { error: String(err) });
    return null;
  }
};

const leerDatos = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
  usuarioId: string,
): Promise<DatosAlertas> => {
  const ahora = Date.now();
  const [analytics, objetivos, pendientes, stats, ultimaAud, igReporte, ttReporte, calendario, registro, bloques] =
    await Promise.all([
      construirAnalytics(marcaCuentas),
      listActiveObjectives(marcaPlataforma.id),
      listPending(marcaPlataforma.id),
      getDecisionStats(marcaPlataforma.id, 7),
      ultimaAuditoria(marcaPlataforma.id),
      getIGLatestReport(marcaPlataforma.id),
      getTTLatestReport(marcaPlataforma.id),
      sinDatoSeguro('calendario', () =>
        listCalendarPostsByAccount(marcaCuentas, {
          from: new Date(ahora - 30 * DIA_MS).toISOString(),
          to: new Date(ahora + 14 * DIA_MS).toISOString(),
          limit: 300,
        }),
      ),
      sinDatoSeguro('plan', () => getOrCreateUserTier(usuarioId)),
      sinDatoSeguro('posts', () => analizarPostsDeMarca(marcaCuentas)),
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

  const programados: ProgramadoJunta[] = (calendario ?? []).map((c) => ({
    plataforma: c.metadata?.['platform'] === 'tiktok' ? 'tiktok' : 'instagram',
    formato: c.format,
    scheduledAt: c.scheduledAt ?? null,
    status: c.status,
  }));
  const diagnostico = calendario ? diagnosticoProgramacion(programados, [], ahora) : null;

  const capacidad = registro ? capacidadDeRegistro(registro, ahora) : null;

  const posts: PostJunta[] = bloques
    ? [...bloques.instagram.posts, ...bloques.tiktok.posts].map((p) => ({
        plataforma: p.plataforma,
        publicadoEn: p.publicadoEn,
        formato: p.formato,
        tasa: p.tasaInteraccion === null ? null : p.tasaInteraccion / 100,
        horaLocal: p.horaLocal,
      }))
    : [];
  const sinCuenta = { seguidores: null, crecimientoPct: null };
  const comparativa = comparativaPlataformas(posts, { instagram: sinCuenta, tiktok: sinCuenta }, ahora);

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
    programacion: {
      disponible: calendario !== null,
      vencidas: diagnostico?.vencidos ?? 0,
      fallidas14d: diagnostico?.fallidosUltimos14Dias ?? 0,
      proximos14d: diagnostico?.proximos14Dias ?? 0,
    },
    plan: (capacidad?.cupos ?? []).map((c) => ({
      formato: c.formato,
      etiqueta: c.etiqueta,
      limite: c.limite,
      restantes: c.restantes,
      pctUsado: c.pctUsado,
    })),
    interaccion: comparativa.filas.map((f) => ({
      plataforma: f.plataforma,
      variacionTasaPct: f.variacionTasaPct,
      publicaciones30d: f.publicaciones30d,
    })),
  };
};

export const alertasDeMarca = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
  opciones: { refrescar?: boolean; usuarioId: string },
): Promise<Alerta[]> => {
  const clave = `${marcaPlataforma.id}|${marcaCuentas}|${opciones.usuarioId}`;
  const previo = cache.get(clave);
  if (!opciones.refrescar && previo && Date.now() - previo.at < CACHE_MS) return previo.alertas;
  const alertas = alertasDe(
    await leerDatos(marcaPlataforma, marcaCuentas, opciones.usuarioId),
    new Date().toISOString(),
  );
  cache.set(clave, { at: Date.now(), alertas });
  return alertas;
};

export const estadoAlertas = async (
  marcaPlataforma: { id: string; nombre: string },
  marcaCuentas: string,
  opciones: { refrescar?: boolean; usuarioId: string },
): Promise<{ activas: Alerta[]; silenciadas: Array<Alerta & { silenciadaHasta: string }> }> => {
  const alertas = await alertasDeMarca(marcaPlataforma, marcaCuentas, opciones);
  const silencios: SilenciosAlertas = await leerSilencios(marcaPlataforma.id);
  return aplicarSilencios(alertas, silencios, Date.now());
};
