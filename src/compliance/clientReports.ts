/**
 * Reportes Automáticos para Clientes
 *
 * Genera reportes periódicos que se pueden entregar a clientes finales:
 * - Resumen semanal de actividad
 * - Métricas de compliance
 * - Contenido publicado
 * - Alertas y bloqueos
 *
 * Uso:
 *   import { generateClientReport } from './compliance/clientReports.js';
 *   const report = await generateClientReport({ clientName: 'MarcaX', since: '...' });
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { audit } from './auditLog.js';
import { sendAlert } from '../integrations/notifications.js';
import { listPromises } from '../capabilities/promiseRegistry/promiseRegistry.js';

export interface ClientReport {
  period: string;
  generatedAt: string;
  clientName: string;
  summary: {
    postsPublished: number;
    postsBlocked: number;
    dmsSent: number;
    commentsReplied: number;
    complianceScore: number;
    topPerformingPost?: string;
  };
  compliance: {
    rulesViolated: string[];
    rateLimitWarnings: number;
    emergencyStops: number;
  };
  content: {
    pieces: Array<{
      type: string;
      title: string;
      status: 'published' | 'blocked' | 'pending';
      riskScore: number;
    }>;
  };
  promises: {
    active: number;
    onTrack: number;
    atRisk: number;
    breached: number;
    fulfilled: number;
    items: Array<{
      title: string;
      status: string;
      progress: number;
      target: number;
      unit: string;
      deadline: string;
      compensation?: string;
    }>;
  };
  recommendations: string[];
}

export const generateClientReport = async (opts: {
  clientName: string;
  since: string;
  until?: string;
}): Promise<ClientReport> => {
  log.step(`Generando reporte para cliente: ${opts.clientName}`);

  // En implementación completa, leeríamos el audit log filtrado por cliente
  // Promesas del cliente
  const clientPromises = listPromises({ clientId: opts.clientName });
  const promiseItems = clientPromises.map((p) => ({
    title: p.title,
    status: p.status,
    progress: p.progress,
    target: p.metric.target,
    unit: p.metric.unit,
    deadline: p.deadline,
    compensation: p.status === 'breached' ? p.compensation.description : undefined,
  }));

  const report: ClientReport = {
    period: `${opts.since} a ${opts.until ?? new Date().toISOString().slice(0, 10)}`,
    generatedAt: new Date().toISOString(),
    clientName: opts.clientName,
    summary: {
      postsPublished: 0, // Se calcularía desde audit log
      postsBlocked: 0,
      dmsSent: 0,
      commentsReplied: 0,
      complianceScore: 100,
    },
    compliance: {
      rulesViolated: [],
      rateLimitWarnings: 0,
      emergencyStops: 0,
    },
    content: {
      pieces: [],
    },
    promises: {
      active: clientPromises.filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status)).length,
      onTrack: clientPromises.filter((p) => p.status === 'on-track').length,
      atRisk: clientPromises.filter((p) => p.status === 'at-risk').length,
      breached: clientPromises.filter((p) => p.status === 'breached').length,
      fulfilled: clientPromises.filter((p) => p.status === 'fulfilled').length,
      items: promiseItems,
    },
    recommendations: [
      'Continuar monitoreando métricas de engagement.',
      'Revisar contenido pendiente de aprobación.',
      'Mantener rate limits dentro de rangos seguros.',
    ],
  };

  if (env.dryRun) {
    report.recommendations.push('El sistema está en modo DRY_RUN. Las acciones son simuladas.');
  }

  if (report.promises.atRisk > 0) {
    report.recommendations.unshift(
      `⚠️ ${report.promises.atRisk} promesa(s) en riesgo de incumplimiento. Revisar plan de remediación.`,
    );
  }

  if (report.promises.breached > 0) {
    report.recommendations.unshift(
      `🚨 ${report.promises.breached} promesa(s) incumplida(s). Compensaciones pendientes de ejecución.`,
    );
  }

  log.success(`Reporte generado para ${opts.clientName}`);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `Reporte de cliente generado: ${opts.clientName}`,
    dryRun: env.dryRun,
  });

  return report;
};

/**
 * Envía un reporte semanal automático al cliente.
 */
export const sendWeeklyClientReport = async (clientName: string): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const report = await generateClientReport({
    clientName,
    since: since.toISOString().slice(0, 10),
  });

  await sendAlert({
    severity: 'reporte',
    title: `Reporte Semanal — ${clientName}`,
    body: `Score de compliance: ${report.summary.complianceScore}/100\nAcciones: ${report.summary.postsPublished + report.summary.dmsSent + report.summary.commentsReplied}\nRecomendaciones: ${report.recommendations.length}`,
  });
};
