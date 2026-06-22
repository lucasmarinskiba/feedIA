/**
 * Guarantee Tracker — evalúa cumplimiento de promesas al vencimiento
 * y dispara compensaciones automáticas si fueron incumplidas.
 */

import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { audit } from '../../compliance/auditLog.js';
import type { PromiseContract } from '../promiseRegistry/promiseRegistry.js';
import { updatePromise } from '../promiseRegistry/promiseRegistry.js';
import { createTicket, updateTicket, type GuaranteeTicket } from './guaranteeStore.js';
import { env } from '../../config/index.js';

export interface GuaranteeResult {
  promiseId: string;
  fulfilled: boolean;
  ticketId?: string;
  certificateId?: string;
}

export const evaluatePromiseAtDeadline = (promise: PromiseContract): GuaranteeResult => {
  const fulfilled = promise.progress >= 100;

  if (fulfilled) {
    return handleFulfilled(promise);
  }
  return handleBreached(promise);
};

const handleFulfilled = (promise: PromiseContract): GuaranteeResult => {
  updatePromise(promise.id, { status: 'fulfilled' });

  const certificateId = `cert-${promise.id}`;
  log.success(`[GuaranteeTracker] Promesa cumplida: ${promise.id} — ${promise.title}`);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `PROMISE_FULFILLED: ${promise.id} — ${promise.title}`,
  });

  sendAlert({
    severity: 'reporte',
    title: `🏆 Promesa cumplida — ${promise.clientName}`,
    body: `"${promise.title}" alcanzó ${promise.progress}% del objetivo (${promise.metric.target} ${promise.metric.unit}).\nCertificado: ${certificateId}`,
    metadata: { promiseId: promise.id, certificateId, metric: promise.metric },
  }).catch(() => undefined);

  return { promiseId: promise.id, fulfilled: true, certificateId };
};

const handleBreached = (promise: PromiseContract): GuaranteeResult => {
  updatePromise(promise.id, { status: 'breached' });

  const ticket = createTicket({
    promiseId: promise.id,
    clientId: promise.clientId,
    clientName: promise.clientName,
    status: 'open',
    promiseTitle: promise.title,
    targetMetric: promise.metric.target,
    actualMetric: Math.round(promise.metric.target * (promise.progress / 100)),
    achievementPct: promise.progress,
    compensationType: promise.compensation.type,
    compensationValue: promise.compensation.value,
    compensationDescription: promise.compensation.description,
    notes: [
      `Promesa incumplida: ${promise.progress}% de ${promise.metric.target} ${promise.metric.unit}`,
      `Remediaciones intentadas: ${promise.remediationCount}`,
    ],
  });

  log.warn(`[GuaranteeTracker] Promesa incumplida: ${promise.id} — ${promise.title}. Ticket: ${ticket.id}`);

  audit({
    action: 'API_REQUEST',
    outcome: 'failure',
    reason: `PROMISE_BREACHED: ${promise.id} — ${promise.title} — Ticket: ${ticket.id}`,
  });

  const alertBody = [
    `Promesa: "${promise.title}"`,
    `Cliente: ${promise.clientName}`,
    `Resultado: ${promise.progress}% de ${promise.metric.target} ${promise.metric.unit}`,
    `Compensación: ${promise.compensation.description}`,
    `Remediaciones previas: ${promise.remediationCount}`,
    `Ticket: ${ticket.id}`,
    env.dryRun ? '\n⚠️ MODO DRY_RUN: compensación NO se ejecuta automáticamente.' : '',
  ].join('\n');

  sendAlert({
    severity: 'crisis',
    title: `🚨 Promesa incumplida — ${promise.clientName}`,
    body: alertBody,
    metadata: { promiseId: promise.id, ticketId: ticket.id, progress: promise.progress },
  }).catch(() => undefined);

  return { promiseId: promise.id, fulfilled: false, ticketId: ticket.id };
};

export const executeCompensation = (ticketId: string): GuaranteeTicket | null => {
  const ticket = updateTicket(ticketId, { status: 'compensated', executedAt: new Date().toISOString() });
  if (!ticket) return null;

  log.success(`[GuaranteeTracker] Compensación ejecutada: ${ticketId}`);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `GUARANTEE_EXECUTED: ${ticketId} — ${ticket.compensationDescription}`,
  });

  sendAlert({
    severity: 'reporte',
    title: `✅ Compensación aplicada — ${ticket.clientName}`,
    body: `Ticket ${ticketId}: ${ticket.compensationDescription}\nPromesa: ${ticket.promiseTitle}`,
  }).catch(() => undefined);

  return ticket;
};

export const generateFulfillmentCertificate = (promise: PromiseContract): string => {
  const lines: string[] = [];
  lines.push(`# 🏆 Certificado de Cumplimiento`);
  lines.push('');
  lines.push(`**Cliente:** ${promise.clientName}`);
  lines.push(`**Promesa:** ${promise.title}`);
  lines.push(`**Descripción:** ${promise.description}`);
  lines.push(`**Métrica:** ${promise.metric.target} ${promise.metric.unit}`);
  lines.push(
    `**Alcanzado:** ${Math.round(promise.metric.target * (promise.progress / 100))} ${promise.metric.unit} (${promise.progress}%)`,
  );
  lines.push(`**Fecha de cumplimiento:** ${promise.fulfilledAt ?? new Date().toISOString()}`);
  lines.push('');
  lines.push(`_Este certificado es generado automáticamente por el sistema de accountability de FeedIA._`);
  return lines.join('\n');
};
