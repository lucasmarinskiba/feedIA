/**
 * Executive Command Center — centro de mando del dueño.
 *
 * Une en un bundle lo que requiere atención y lo que el equipo hizo de verdad:
 * salud calculada de señales reales (no de métricas vacías), alertas con acción
 * directa, decisiones pendientes para resolver desde acá, OKRs y acciones
 * rápidas cableadas a vistas que existen. Si no hay datos, lo dice.
 */

import { getBudgetStatus } from '../../agent/budget.js';
import { getConnection, isExpired, type ConnectionPlatform } from '../../integrations/oauthConnections.js';
import { buildActividadReal } from '../experience/staffActivity.js';
import { listPending, expireOldDecisions, type ExecutiveDecision } from './executiveDecisionQueue.js';
import { getOKRSummary } from './executiveOKR.js';

export type SaludNivel = 'sin-datos' | 'estable' | 'atencion' | 'critica';

export type AccionCC =
  | { tipo: 'tab'; tab: string; label: string }
  | { tipo: 'ruta'; ruta: string; label: string }
  | { tipo: 'conectar'; plataforma: ConnectionPlatform; label: string };

export interface AlertaCC {
  id: string;
  nivel: 'critica' | 'alta' | 'info';
  titulo: string;
  detalle: string;
  accion?: AccionCC;
}

export interface AccionRapidaCC {
  id: string;
  emoji: string;
  label: string;
  descripcion: string;
  accion: AccionCC;
}

export interface CommandCenterBundle {
  brandId: string;
  timestamp: string;
  salud: { nivel: SaludNivel; titulo: string; detalle: string };
  pulso: {
    agentesActivos7d: number;
    accionesUltimas24h: number;
    acciones7d: number;
    decisionesPendientes: number;
    decisionesCriticas: number;
    redesConectadas: number;
    redesTotal: number;
  };
  alertas: AlertaCC[];
  decisionesPendientes: ExecutiveDecision[];
  okr: Awaited<ReturnType<typeof getOKRSummary>>;
  accionesRapidas: AccionRapidaCC[];
  insights: Array<{ icon: string; texto: string }>;
}

type EstadoConexion = 'conectada' | 'desconectada' | 'vencida';

const estadoConexion = async (brandId: string, plataforma: ConnectionPlatform): Promise<EstadoConexion> => {
  const conn = await getConnection(brandId, plataforma);
  if (!conn) return 'desconectada';
  return isExpired(conn) ? 'vencida' : 'conectada';
};

const NOMBRE_RED: Record<ConnectionPlatform, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

export const buildCommandCenterBundle = async (brandId: string, brandName: string): Promise<CommandCenterBundle> => {
  await expireOldDecisions(brandId);

  const [pendientes, okr, act, ig, tt] = await Promise.all([
    listPending(brandId),
    getOKRSummary(brandId),
    Promise.resolve(buildActividadReal(brandName)),
    estadoConexion(brandId, 'instagram'),
    estadoConexion(brandId, 'tiktok'),
  ]);

  const estados: Record<ConnectionPlatform, EstadoConexion> = { instagram: ig, tiktok: tt };
  const redesConectadas = Object.values(estados).filter((e) => e === 'conectada').length;
  const criticas = pendientes.filter((d) => d.urgency === 'critical');
  const presupuesto = getBudgetStatus();
  const { conteos } = act;

  const sinActividad = conteos.acciones7d === 0 && redesConectadas === 0 && pendientes.length === 0;
  const salud: CommandCenterBundle['salud'] = sinActividad
    ? {
        nivel: 'sin-datos',
        titulo: 'Todavía no hay actividad real',
        detalle:
          'Conectá Instagram o TikTok y generá tu primera pieza. Acá vas a ver el estado real del equipo, no supuestos.',
      }
    : criticas.length > 0 || conteos.misionesFallidas7d >= 3 || presupuesto.breaker === 'open'
      ? {
          nivel: 'critica',
          titulo: 'Requiere tu atención inmediata',
          detalle: [
            criticas.length ? `${criticas.length} decisión(es) crítica(s)` : null,
            conteos.misionesFallidas7d >= 3 ? `${conteos.misionesFallidas7d} misiones fallidas esta semana` : null,
            presupuesto.breaker === 'open' ? 'presupuesto de IA agotado' : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : pendientes.length > 0 ||
          conteos.misionesFallidas7d >= 1 ||
          Object.values(estados).includes('vencida') ||
          okr.behind > 0 ||
          presupuesto.usedPct >= 80 ||
          (redesConectadas === 0 && conteos.acciones7d > 0)
        ? {
            nivel: 'atencion',
            titulo: 'Hay cosas que revisar',
            detalle: [
              pendientes.length ? `${pendientes.length} decisión(es) esperando` : null,
              conteos.misionesFallidas7d ? `${conteos.misionesFallidas7d} misión(es) fallida(s)` : null,
              okr.behind ? `${okr.behind} OKR atrasado(s)` : null,
              presupuesto.usedPct >= 80 ? `gasto IA al ${presupuesto.usedPct}%` : null,
              redesConectadas === 0 && conteos.acciones7d > 0
                ? 'el equipo produce pero ninguna red está conectada'
                : null,
            ]
              .filter(Boolean)
              .join(' · '),
          }
        : {
            nivel: 'estable',
            titulo: 'Todo en orden',
            detalle: `${conteos.acciones7d} acciones esta semana · ${conteos.agentesActivos7d} ${conteos.agentesActivos7d === 1 ? 'agente activo' : 'agentes activos'}`,
          };

  const alertas: AlertaCC[] = [];

  for (const d of criticas) {
    alertas.push({
      id: `decision-${d.id}`,
      nivel: 'critica',
      titulo: `Decisión crítica: ${d.title}`,
      detalle: d.context.length > 160 ? `${d.context.slice(0, 159)}…` : d.context,
      accion: { tipo: 'tab', tab: 'decisions', label: 'Resolver' },
    });
  }

  for (const plataforma of ['instagram', 'tiktok'] as const) {
    if (estados[plataforma] === 'vencida') {
      alertas.push({
        id: `token-${plataforma}`,
        nivel: 'critica',
        titulo: `La conexión con ${NOMBRE_RED[plataforma]} venció`,
        detalle: 'Sin token válido no hay métricas reales ni publicación.',
        accion: { tipo: 'conectar', plataforma, label: `Reconectar ${NOMBRE_RED[plataforma]}` },
      });
    }
  }

  if (presupuesto.breaker === 'open') {
    alertas.push({
      id: 'presupuesto-agotado',
      nivel: 'critica',
      titulo: 'Presupuesto diario de IA agotado',
      detalle: 'Los agentes pausaron el uso de modelos hasta mañana.',
    });
  }

  if (conteos.misionesFallidas7d > 0) {
    alertas.push({
      id: 'misiones-fallidas',
      nivel: 'alta',
      titulo: `${conteos.misionesFallidas7d} misión(es) fallida(s) esta semana`,
      detalle: 'Revisá en la bitácora qué paso y en qué tarea.',
      accion: { tipo: 'tab', tab: 'logbook', label: 'Ver bitácora' },
    });
  }

  const noCriticas = pendientes.length - criticas.length;
  if (noCriticas > 0) {
    alertas.push({
      id: 'decisiones-pendientes',
      nivel: 'alta',
      titulo: `${noCriticas} decisión(es) esperando tu aprobación`,
      detalle: 'Aprobá o rechazá para que el equipo siga.',
      accion: { tipo: 'tab', tab: 'decisions', label: 'Revisar' },
    });
  }

  if (presupuesto.usedPct >= 80 && presupuesto.breaker !== 'open') {
    alertas.push({
      id: 'presupuesto-80',
      nivel: 'alta',
      titulo: `Gasto IA al ${presupuesto.usedPct}% del tope diario`,
      detalle: `Quedan $${presupuesto.remainingUsd.toFixed(2)} hoy.`,
    });
  }

  if (conteos.carruselesEnRevision > 0) {
    alertas.push({
      id: 'carruseles-revision',
      nivel: 'info',
      titulo: `${conteos.carruselesEnRevision} carrusel(es) en revisión`,
      detalle: 'Quedaron retenidos para que los revises antes de publicar.',
      accion: { tipo: 'tab', tab: 'logbook', label: 'Ver bitácora' },
    });
  }

  for (const plataforma of ['instagram', 'tiktok'] as const) {
    if (estados[plataforma] === 'desconectada') {
      alertas.push({
        id: `sin-conectar-${plataforma}`,
        nivel: 'info',
        titulo: `${NOMBRE_RED[plataforma]} no está conectado`,
        detalle: 'Sin cuenta conectada no hay métricas reales ni publicación en esa red.',
        accion: { tipo: 'conectar', plataforma, label: `Conectar ${NOMBRE_RED[plataforma]}` },
      });
    }
  }

  if (okr.behind > 0) {
    alertas.push({
      id: 'okr-atrasados',
      nivel: 'info',
      titulo: `${okr.behind} OKR atrasado(s)`,
      detalle: okr.topConcern
        ? `Más atrasado: ${okr.topConcern.objectiveTitle} — ${okr.topConcern.krDescription}`
        : 'Replanificá las metas del trimestre.',
      accion: { tipo: 'tab', tab: 'okrs', label: 'Replanificar' },
    });
  }

  const ordenNivel = { critica: 0, alta: 1, info: 2 } as const;
  alertas.sort((a, b) => ordenNivel[a.nivel] - ordenNivel[b.nivel]);

  const accionesRapidas: AccionRapidaCC[] = [
    {
      id: 'revisar-decisiones',
      emoji: '💡',
      label: 'Revisar decisiones',
      descripcion: pendientes.length ? `${pendientes.length} esperando tu aprobación` : 'Sin pendientes',
      accion: { tipo: 'tab', tab: 'decisions', label: 'Revisar' },
    },
    {
      id: 'generar-contenido',
      emoji: '✨',
      label: 'Generar contenido',
      descripcion: 'Carrusel con un prompt',
      accion: { tipo: 'ruta', ruta: 'studio-carousel', label: 'Crear' },
    },
    {
      id: 'auditar',
      emoji: '🔍',
      label: 'Auditar cuenta',
      descripcion: 'Diagnóstico + plan 30 días',
      accion: { tipo: 'tab', tab: 'audit', label: 'Auditar' },
    },
    {
      id: 'okrs',
      emoji: '🎯',
      label: 'Metas y OKR',
      descripcion: `${okr.totalActive} activos · ${okr.behind} atrasados`,
      accion: { tipo: 'tab', tab: 'okrs', label: 'Ver metas' },
    },
    {
      id: 'autopilot',
      emoji: '🤖',
      label: 'Autopilot',
      descripcion: 'Que el sistema decida y ejecute',
      accion: { tipo: 'ruta', ruta: 'autopilot', label: 'Abrir' },
    },
    {
      id: 'bitacora',
      emoji: '📒',
      label: 'Bitácora',
      descripcion: `${conteos.misionesFallidas7d} fallidas esta semana`,
      accion: { tipo: 'tab', tab: 'logbook', label: 'Abrir' },
    },
    ...(['instagram', 'tiktok'] as const).map(
      (plataforma): AccionRapidaCC =>
        estados[plataforma] === 'conectada'
          ? {
              id: `crecimiento-${plataforma}`,
              emoji: plataforma === 'instagram' ? '📷' : '🎵',
              label: `Crecimiento ${NOMBRE_RED[plataforma]}`,
              descripcion: 'Followers y alcance reales',
              accion: { tipo: 'tab', tab: 'summary', label: 'Ver' },
            }
          : {
              id: `conectar-${plataforma}`,
              emoji: plataforma === 'instagram' ? '📷' : '🎵',
              label: `Conectar ${NOMBRE_RED[plataforma]}`,
              descripcion: 'Para ver métricas reales',
              accion: { tipo: 'conectar', plataforma, label: 'Conectar' },
            },
    ),
  ];

  const insights: CommandCenterBundle['insights'] = [];
  if (criticas.length) insights.push({ icon: '🔴', texto: `${criticas.length} decisión(es) crítica(s) sin resolver` });
  if (okr.behind) insights.push({ icon: '📉', texto: `${okr.behind} OKR atrasado(s) — replanificar` });
  if (okr.topConcern) {
    insights.push({
      icon: '⚠️',
      texto: `${okr.topConcern.objectiveTitle}: ${okr.topConcern.krDescription} (gap ${okr.topConcern.gap.toFixed(0)}%)`,
    });
  }
  if (conteos.misionesFallidas7d) {
    insights.push({ icon: '🧪', texto: `${conteos.misionesFallidas7d} misión(es) fallida(s) esta semana` });
  }
  if (act.rolesActivos > 0) {
    insights.push({
      icon: '👥',
      texto: `${act.rolesActivos} de ${act.staff.length} roles del staff con actividad real`,
    });
  }

  return {
    brandId,
    timestamp: new Date().toISOString(),
    salud,
    pulso: {
      agentesActivos7d: conteos.agentesActivos7d,
      accionesUltimas24h: conteos.acciones24h,
      acciones7d: conteos.acciones7d,
      decisionesPendientes: pendientes.length,
      decisionesCriticas: criticas.length,
      redesConectadas,
      redesTotal: 2,
    },
    alertas,
    decisionesPendientes: pendientes.slice(0, 8),
    okr,
    accionesRapidas: accionesRapidas.slice(0, 8),
    insights,
  };
};
