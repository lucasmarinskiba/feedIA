/**
 * Escalation Router — cuando auto-remediation falla ≥2 veces, escala a humano.
 */

import { createCheckpoint } from '../../agent/checkpoints.js';
import { sendAlert } from '../../integrations/notifications.js';
import { audit } from '../../compliance/auditLog.js';
import type { PromiseContract } from '../promiseRegistry/promiseRegistry.js';
import type { BrandProfile } from '../../config/types.js';

export interface EscalationResult {
  promiseId: string;
  checkpointId: string;
  reason: string;
}

export const escalateToHuman = (promise: PromiseContract, _brand: BrandProfile): EscalationResult => {
  const reason = `Promesa "${promise.title}" lleva ${promise.remediationCount} remediaciones sin recuperarse. Progreso: ${promise.progress}%. Deadline: ${promise.deadline}.`;

  const checkpoint = createCheckpoint(
    'crisis_response',
    reason,
    promise.id,
    {
      promiseId: promise.id,
      promiseTitle: promise.title,
      clientName: promise.clientName,
      progress: promise.progress,
      deadline: promise.deadline,
      remediationCount: promise.remediationCount,
      category: promise.category,
    },
    2880, // 48 horas para responder
  );

  audit({
    action: 'API_REQUEST',
    outcome: 'failure',
    reason: `ESCALATION_CREATED: ${promise.id} → checkpoint ${checkpoint.id}`,
  });

  sendAlert({
    severity: 'crisis',
    title: `🚨 Escalación humana requerida — ${promise.clientName}`,
    body: [
      reason,
      '',
      `Checkpoint: ${checkpoint.id}`,
      `Expira: ${new Date(checkpoint.expiresAt).toLocaleString('es-AR')}`,
      `Acciones sugeridas para humano:`,
      `• Revisar estrategia de contenido para ${promise.category}`,
      `• Considerar extender deadline o renegociar promesa`,
      `• Verificar si hay problema técnico (API caída, cuenta restringida)`,
    ].join('\n'),
    metadata: { checkpointId: checkpoint.id, promiseId: promise.id },
  }).catch(() => undefined);

  return {
    promiseId: promise.id,
    checkpointId: checkpoint.id,
    reason,
  };
};
