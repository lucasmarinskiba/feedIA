/**
 * Accountability Engine — orquesta el ciclo completo de rendición de cuentas.
 *
 * 1. Trackea progreso de todas las promesas activas.
 * 2. Evalúa riesgo.
 * 3. Si at-risk y auto-remediation habilitado → dispara remediation protocol.
 * 4. Si remediation falla ≥2 veces → escala a humano.
 * 5. Al deadline → dispara guarantee tracker.
 */

import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { sendAlert } from '../../integrations/notifications.js';
import {
  listPromises,
  getActivePromises,
  updatePromise,
  type PromiseContract,
} from '../promiseRegistry/promiseRegistry.js';
import { trackPromiseProgress, evaluatePromiseRisk, getPromiseProjections } from '../promiseRegistry/promiseTracker.js';
import { evaluatePromiseAtDeadline } from '../guaranteeTracker/guaranteeTracker.js';
import { runRemediation } from './remediationProtocol.js';
import { escalateToHuman } from './escalationRouter.js';
import type { BrandProfile } from '../../config/types.js';

export interface AccountabilityTickResult {
  tracked: number;
  remediationsTriggered: number;
  escalations: number;
  guaranteesEvaluated: number;
  details: Array<{ promiseId: string; action: string; result: string }>;
}

export const runAccountabilityTick = async (brand: BrandProfile): Promise<AccountabilityTickResult> => {
  const result: AccountabilityTickResult = {
    tracked: 0,
    remediationsTriggered: 0,
    escalations: 0,
    guaranteesEvaluated: 0,
    details: [],
  };

  const active = getActivePromises();
  const now = Date.now();

  for (const promise of active) {
    const tracked = trackPromiseProgress(promise);
    result.tracked++;

    const risk = evaluateRiskWithGrace(tracked);

    // Si venció, evaluar garantía
    if (new Date(tracked.deadline).getTime() <= now) {
      const guarantee = evaluatePromiseAtDeadline(tracked);
      result.guaranteesEvaluated++;
      result.details.push({
        promiseId: tracked.id,
        action: 'guarantee-evaluation',
        result: guarantee.fulfilled ? 'fulfilled' : `breached (ticket: ${guarantee.ticketId ?? 'n/a'})`,
      });
      continue;
    }

    // Si está en riesgo
    if (risk.status === 'at-risk') {
      if (tracked.autoRemediationEnabled && tracked.remediationCount < 2) {
        try {
          const remediation = await runRemediation(tracked, brand);
          updatePromise(tracked.id, {
            status: 'at-risk',
            remediationCount: tracked.remediationCount + 1,
          });
          result.remediationsTriggered++;
          result.details.push({
            promiseId: tracked.id,
            action: 'remediation',
            result: `triggered: ${remediation.actions.join(', ')}`,
          });

          audit({
            action: 'API_REQUEST',
            outcome: 'success',
            reason: `REMEDIATION_TRIGGERED: ${tracked.id} — ${remediation.actions.join(', ')}`,
          });
        } catch (err) {
          log.error(`[AccountabilityEngine] Remediation falló para ${tracked.id}: ${(err as Error).message}`);
          result.details.push({
            promiseId: tracked.id,
            action: 'remediation',
            result: `error: ${(err as Error).message}`,
          });
        }
      } else if (tracked.remediationCount >= 2) {
        // Escalar a humano
        const escalation = escalateToHuman(tracked, brand);
        result.escalations++;
        result.details.push({
          promiseId: tracked.id,
          action: 'escalation',
          result: `checkpoint: ${escalation.checkpointId}`,
        });

        audit({
          action: 'API_REQUEST',
          outcome: 'failure',
          reason: `PROMISE_ESCALATED: ${tracked.id} — checkpoint ${escalation.checkpointId}`,
        });
      }
    } else if (risk.status === 'on-track' && tracked.status === 'at-risk') {
      // Recuperación: pasó de at-risk a on-track
      updatePromise(tracked.id, { status: 'on-track' });
      result.details.push({
        promiseId: tracked.id,
        action: 'status-recovery',
        result: 'Recuperada a on-track',
      });
    }
  }

  // Alerta resumen si hay acciones
  if (result.remediationsTriggered > 0 || result.escalations > 0 || result.guaranteesEvaluated > 0) {
    await sendAlert({
      severity: result.escalations > 0 ? 'crisis' : 'warn',
      title: `🔍 Accountability Tick: ${result.tracked} promesas evaluadas`,
      body: [
        `Remediaciones: ${result.remediationsTriggered}`,
        `Escalaciones: ${result.escalations}`,
        `Garantías evaluadas: ${result.guaranteesEvaluated}`,
        ...result.details.slice(0, 5).map((d) => `• ${d.promiseId}: ${d.action} → ${d.result}`),
      ].join('\n'),
    }).catch(() => undefined);
  }

  log.info(
    `[AccountabilityEngine] Tick completado: ${result.tracked} tracked, ${result.remediationsTriggered} remediations, ${result.escalations} escalations`,
  );
  return result;
};

// Wrapper con gracia: no marcar at-risk inmediatamente si acaba de empezar
const evaluateRiskWithGrace = (promise: PromiseContract): { status: 'on-track' | 'at-risk'; riskScore: number } => {
  const daysSinceStart = Math.max(1, (Date.now() - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000));

  // Primeros 3 días: grace period, no marcar at-risk salvo que sea obvio (progreso 0 y pasó 50% del tiempo)
  if (daysSinceStart <= 3) {
    const totalDays = Math.max(
      1,
      (new Date(promise.deadline).getTime() - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysSinceStart / totalDays < 0.5) {
      return { status: 'on-track', riskScore: 0 };
    }
  }

  const risk = evaluatePromiseRisk(promise);
  return { status: risk.status === 'at-risk' ? 'at-risk' : 'on-track', riskScore: risk.riskScore };
};

export const getAccountabilitySnapshot = (): {
  active: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  fulfilled: number;
  avgRiskScore: number;
} => {
  const promises = listPromises();
  const active = promises.filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status));

  const projections = active.map((p) => getPromiseProjections(p));
  const avgRisk = projections.length > 0 ? projections.reduce((s, p) => s + p.riskScore, 0) / projections.length : 0;

  return {
    active: active.length,
    onTrack: promises.filter((p) => p.status === 'on-track').length,
    atRisk: promises.filter((p) => p.status === 'at-risk').length,
    breached: promises.filter((p) => p.status === 'breached').length,
    fulfilled: promises.filter((p) => p.status === 'fulfilled').length,
    avgRiskScore: Math.round(avgRisk),
  };
};
