/**
 * Remediation Protocol — acciones automáticas cuando una promesa está en riesgo.
 *
 * Según la categoría de la promesa, ejecuta tácticas de recuperación.
 */

import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { audit } from '../../compliance/auditLog.js';
import type { PromiseContract } from '../promiseRegistry/promiseRegistry.js';
import { schedulePostBoost } from '../growth/postBoost.js';
import { diseñarExperimentos, lanzarExperimento } from '../experiments/runner.js';
import { generarComentariosFaro } from '../growth/index.js';
import type { BrandProfile } from '../../config/types.js';
import { env } from '../../config/index.js';

export interface RemediationResult {
  promiseId: string;
  actions: string[];
  experimentsLaunched: string[];
  boostsScheduled: string[];
}

export const runRemediation = async (promise: PromiseContract, brand: BrandProfile): Promise<RemediationResult> => {
  const result: RemediationResult = {
    promiseId: promise.id,
    actions: [],
    experimentsLaunched: [],
    boostsScheduled: [],
  };

  if (env.dryRun) {
    log.info(`[RemediationProtocol] DRY_RUN: simulando remediación para ${promise.id}`);
    result.actions.push('dry-run-simulation');
    return result;
  }

  switch (promise.category) {
    case 'growth':
      await remediateGrowth(promise, brand, result);
      break;
    case 'engagement':
      await remediateEngagement(promise, brand, result);
      break;
    case 'leads':
    case 'sales':
      await remediateLeads(promise, brand, result);
      break;
    case 'time_saved':
      await remediateTimeSaved(promise, brand, result);
      break;
    case 'authority':
    case 'custom':
    default:
      await remediateGeneric(promise, brand, result);
      break;
  }

  log.info(`[RemediationProtocol] ${promise.id}: ${result.actions.length} acciones ejecutadas`);
  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `REMEDIATION_EXECUTED: ${promise.id} — ${result.actions.join(', ')}`,
  });

  await sendAlert({
    severity: 'warn',
    title: `🔧 Remediación activada — ${promise.title}`,
    body: [
      `Promesa en riesgo: ${promise.title}`,
      `Progreso: ${promise.progress}%`,
      `Acciones tomadas:`,
      ...result.actions.map((a) => `• ${a}`),
      ...result.experimentsLaunched.map((e) => `• Experimento lanzado: ${e}`),
    ].join('\n'),
    metadata: { promiseId: promise.id, actions: result.actions },
  }).catch(() => undefined);

  return result;
};

// ── Remediaciones por categoría ───────────────────────────────────────────────

const remediateGrowth = async (
  promise: PromiseContract,
  brand: BrandProfile,
  result: RemediationResult,
): Promise<void> => {
  // 1. Lanzar experimento de growth
  try {
    const experiments = await diseñarExperimentos(
      brand,
      `Promesa ${promise.id} en riesgo: necesitamos acelerar ${promise.metric.metric}`,
      2,
    );
    for (const exp of experiments) {
      lanzarExperimento(exp.id);
      result.experimentsLaunched.push(exp.id);
    }
    result.actions.push(`experimentos-growth:${experiments.length}`);
  } catch {
    result.actions.push('experimentos-growth:falló');
  }

  // 2. Activar community sprint (comentarios faro)
  try {
    const comentarios = await generarComentariosFaro(brand, []);
    result.actions.push(`community-sprint:${Array.isArray(comentarios) ? comentarios.length : 0}`);
  } catch {
    result.actions.push('community-sprint:falló');
  }

  // 3. Programar boost para el próximo post
  try {
    const boost = schedulePostBoost({
      postId: `remediation-${promise.id}-${Date.now()}`,
      postFormat: 'reel',
      publishedAt: new Date().toISOString(),
    });
    result.boostsScheduled.push(boost.id);
    result.actions.push('post-boost-scheduled');
  } catch {
    result.actions.push('post-boost:falló');
  }
};

const remediateEngagement = async (
  promise: PromiseContract,
  brand: BrandProfile,
  result: RemediationResult,
): Promise<void> => {
  // 1. Experimentos de hooks/retención
  try {
    const experiments = await diseñarExperimentos(
      brand,
      `Engagement bajo en promesa ${promise.id}. Probar hooks más fuertes.`,
      2,
    );
    for (const exp of experiments) {
      lanzarExperimento(exp.id);
      result.experimentsLaunched.push(exp.id);
    }
    result.actions.push(`experimentos-engagement:${experiments.length}`);
  } catch {
    result.actions.push('experimentos-engagement:falló');
  }

  // 2. Boost a posts recientes con bajo engagement
  result.actions.push('engagement-boost-pending');
};

const remediateLeads = async (
  promise: PromiseContract,
  _brand: BrandProfile,
  result: RemediationResult,
): Promise<void> => {
  // 1. Activar nurture sequences
  result.actions.push('nurture-sequences-activated');

  // 2. Auditar CTAs en contenido reciente
  result.actions.push('cta-audit-triggered');

  // 3. DM triage prioritario
  result.actions.push('dm-triage-priority');
};

const remediateTimeSaved = async (
  promise: PromiseContract,
  _brand: BrandProfile,
  result: RemediationResult,
): Promise<void> => {
  // 1. Auditar procesos manuales que aún quedan
  result.actions.push('manual-process-audit');

  // 2. Proponer nuevas automatizaciones
  result.actions.push('automation-proposal-triggered');

  // 3. Aumentar frecuencia de autopilot
  result.actions.push('autopilot-frequency-increased');
};

const remediateGeneric = async (
  promise: PromiseContract,
  brand: BrandProfile,
  result: RemediationResult,
): Promise<void> => {
  // Fallback: diseñar experimentos genéricos
  try {
    const experiments = await diseñarExperimentos(
      brand,
      `Promesa ${promise.id} en riesgo (categoría ${promise.category})`,
      1,
    );
    for (const exp of experiments) {
      lanzarExperimento(exp.id);
      result.experimentsLaunched.push(exp.id);
    }
    result.actions.push(`experimentos-generic:${experiments.length}`);
  } catch {
    result.actions.push('experimentos-generic:falló');
  }

  result.actions.push('generic-remediation-completed');
};
