// @ts-nocheck
/**
 * Brain-Aware Computer Use — CU que consulta y alimenta el cerebro neural.
 *
 * Antes de ejecutar:
 *   1. Consulta memory.recallMemories(action) → sugerencias del pasado
 *   2. Lee safetyController estado → decide si seguir
 *   3. Construye system prompt enriquecido con contexto neural
 *
 * Durante:
 *   - Cada turno reporta progreso a memoria temporal
 *   - Brain puede cancelar via watchdog si detecta deriva
 *
 * Después:
 *   - Registra episodic memory (acción + outcome + reward)
 *   - Dispara RL episode si aplica
 *   - Actualiza circuit breakers (success/failure)
 *   - Notifica al user si aplica
 *
 * Permite que CU sea "skill ejecutable" desde autonomyCore.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { CuEvent } from './liveSession.js';
import { runAnthropicComputerUse } from './anthropicDriver.js';
import { recordEpisodicMemory, recallMemories } from '../../brain/neural/memoryNeurons.js';
import { checkActionSafety, recordSuccess, recordFailure } from '../../brain/neural/safetyController.js';
import { createNotification } from '../../auth/notificationCenter.js';
import { findUsersByBrandId } from '../../auth/userAccounts.js';
import type { RLAction } from '../../brain/neural/reinforcementEngine.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BrainAwareCuInput {
  instruction: string;
  baseUrl?: string;
  sessionId?: string;
  rlAction?: RLAction; // qué acción RL representa esta CU sesión
  tags?: string[]; // tags para memoria episódica
  notifyUser?: boolean;
  abortOnSafetyFail?: boolean; // si safety check falla, no ejecutar
}

export interface BrainAwareCuResult {
  sessionId: string;
  ran: boolean;
  reason?: string;
  outcome: 'success' | 'partial' | 'failure' | 'skipped' | 'aborted';
  reward: number;
  events: CuEvent[];
  memoryRecalled?: {
    similarPastSessions: number;
    suggestedAction?: RLAction;
    suggestedActionConfidence?: number;
    pastReasoning?: string;
  };
  durationMs: number;
}

// ── Reward calculation ────────────────────────────────────────────────────────

const calculateReward = (events: CuEvent[]): { reward: number; outcome: BrainAwareCuResult['outcome'] } => {
  const sessionEnd = events.find((e) => e.kind === 'session-end') as
    | { kind: 'session-end'; completed: boolean; ok: number; total: number }
    | undefined;
  const errors = events.filter(
    (e) =>
      e.kind === 'act' &&
      'gesture' in e &&
      (e.gesture === 'error' || e.gesture === 'action-error' || e.gesture === 'loop-detected'),
  );

  if (!sessionEnd) return { reward: -0.5, outcome: 'failure' };
  if (!sessionEnd.completed) return { reward: -0.3, outcome: 'failure' };

  const errorPenalty = Math.min(0.5, errors.length * 0.1);
  const actionRatio = sessionEnd.total > 0 ? sessionEnd.ok / sessionEnd.total : 0;

  if (sessionEnd.ok === 0) return { reward: -0.2, outcome: 'failure' };
  if (actionRatio < 0.5) return { reward: 0.1 - errorPenalty, outcome: 'partial' };
  if (actionRatio < 0.9) return { reward: 0.5 - errorPenalty, outcome: 'partial' };
  return { reward: Math.max(0.3, 1.0 - errorPenalty), outcome: 'success' };
};

// ── Enriquecer instruction con contexto neural ────────────────────────────────

const enrichInstructionWithBrainContext = async (
  brand: BrandProfile,
  baseInstruction: string,
  rlAction?: RLAction,
): Promise<{ enrichedInstruction: string; recall: BrainAwareCuResult['memoryRecalled'] }> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  if (!rlAction) {
    return { enrichedInstruction: baseInstruction, recall: undefined };
  }

  const recall = await recallMemories({
    brandId,
    action: rlAction,
    minImportance: 0.2,
    limit: 5,
  });

  if (recall.episodic.length === 0) {
    return { enrichedInstruction: baseInstruction, recall: { similarPastSessions: 0 } };
  }

  const positiveLessons = recall.episodic
    .filter((m) => m.reward > 0.3)
    .slice(0, 3)
    .map((m) => `✓ ${m.event} → reward ${m.reward.toFixed(2)}`)
    .join('\n');

  const negativeLessons = recall.episodic
    .filter((m) => m.reward < -0.2)
    .slice(0, 3)
    .map((m) => `✗ ${m.event} → reward ${m.reward.toFixed(2)} (EVITAR)`)
    .join('\n');

  const semanticRules = recall.semantic
    .filter((s) => s.confidence > 0.6)
    .slice(0, 3)
    .map((s) => `📖 ${s.generalization}`)
    .join('\n');

  const enriched = `${baseInstruction}

[CONTEXTO NEURAL — usá esta memoria para guiarte]
${positiveLessons ? `Lo que funcionó antes:\n${positiveLessons}` : ''}
${negativeLessons ? `Lo que NO funcionó:\n${negativeLessons}` : ''}
${semanticRules ? `Reglas aprendidas:\n${semanticRules}` : ''}
[FIN CONTEXTO]`;

  return {
    enrichedInstruction: enriched,
    recall: {
      similarPastSessions: recall.episodic.length,
      suggestedAction: recall.suggestedAction,
      suggestedActionConfidence: recall.suggestedActionConfidence,
      pastReasoning: recall.reasoning,
    },
  };
};

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Ejecuta CU con contexto y feedback del cerebro neural.
 *
 * Pipeline:
 *   1. Safety check vía neural/safetyController
 *   2. Memory recall (qué pasó en sesiones similares)
 *   3. Instrucción enriquecida con lessons learned
 *   4. Ejecutar runAnthropicComputerUse
 *   5. Calcular reward desde events
 *   6. Registrar episodic memory
 *   7. Actualizar circuit breakers
 *   8. Notificar user si aplica
 */
export const runBrainAwareCu = async (brand: BrandProfile, input: BrainAwareCuInput): Promise<BrainAwareCuResult> => {
  const startTime = Date.now();
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const sessionId = input.sessionId ?? `brain-cu-${Date.now()}`;
  const events: CuEvent[] = [];

  log.info('[brainAwareCu] starting', { brandId, sessionId, rlAction: input.rlAction });

  // ── 1. Safety pre-check ─────────────────────────────────────────────────────
  if (input.rlAction) {
    const safety = await checkActionSafety(brandId, input.rlAction);
    if (!safety.passed && (input.abortOnSafetyFail ?? true)) {
      log.warn('[brainAwareCu] safety check failed, skipping', { reasons: safety.reasons });
      return {
        sessionId,
        ran: false,
        reason: `Safety: ${safety.reasons.join('; ')}`,
        outcome: 'skipped',
        reward: 0,
        events: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ── 2. Memory recall + enrich instruction ──────────────────────────────────
  const { enrichedInstruction, recall } = await enrichInstructionWithBrainContext(
    brand,
    input.instruction,
    input.rlAction,
  );

  // ── 3. Ejecutar CU ──────────────────────────────────────────────────────────
  const emit = (ev: CuEvent): void => {
    events.push(ev);
  };

  let ran = false;
  try {
    ran = await runAnthropicComputerUse(enrichedInstruction, emit, {
      baseUrl: input.baseUrl,
      sessionId,
    });
  } catch (err) {
    log.warn('[brainAwareCu] CU run threw', { err: String(err) });
    events.push({ kind: 'session-end', completed: false, ok: 0, total: 0 });
  }

  if (!ran) {
    return {
      sessionId,
      ran: false,
      reason: 'Computer Use no disponible (env COMPUTER_USE_LIVE=true + Playwright instalado)',
      outcome: 'skipped',
      reward: 0,
      events,
      memoryRecalled: recall,
      durationMs: Date.now() - startTime,
    };
  }

  // ── 4. Calculate reward ────────────────────────────────────────────────────
  const { reward, outcome } = calculateReward(events);

  // ── 5. Episodic memory ─────────────────────────────────────────────────────
  if (input.rlAction) {
    await recordEpisodicMemory(brand, {
      event: `CU session: ${input.instruction.slice(0, 80)}`,
      context: {
        sessionId,
        baseUrl: input.baseUrl,
        rlAction: input.rlAction,
        eventsCount: events.length,
        durationMs: Date.now() - startTime,
      },
      action: input.rlAction,
      outcome,
      reward,
      tags: [...(input.tags ?? []), 'computer-use', outcome],
    });
  }

  // ── 6. Safety record success/failure ───────────────────────────────────────
  if (outcome === 'success') {
    await recordSuccess(brandId, 'content-publishing');
  } else if (outcome === 'failure') {
    await recordFailure(brandId, 'content-publishing');
  }

  // ── 7. Notify user ─────────────────────────────────────────────────────────
  if (input.notifyUser !== false) {
    try {
      const owners = await findUsersByBrandId(brandId);
      const priority = outcome === 'failure' ? 'critical' : outcome === 'success' ? 'success' : 'info';
      const title =
        outcome === 'success'
          ? '✅ Agente CU completó'
          : outcome === 'failure'
            ? '❌ Agente CU falló'
            : '⚠️ Agente CU parcial';
      for (const owner of owners) {
        await createNotification({
          userId: owner.id,
          type: outcome === 'failure' ? 'carousel-failed' : 'carousel-published',
          priority,
          title,
          message: `Tarea: "${input.instruction.slice(0, 100)}" — outcome: ${outcome} (reward ${reward.toFixed(2)})`,
          metadata: { sessionId, rlAction: input.rlAction, reward },
        });
      }
    } catch (err) {
      log.warn('[brainAwareCu] notify failed', { err: String(err) });
    }
  }

  log.info('[brainAwareCu] done', {
    brandId,
    sessionId,
    outcome,
    reward: reward.toFixed(2),
    eventsCount: events.length,
  });

  return {
    sessionId,
    ran: true,
    outcome,
    reward,
    events,
    memoryRecalled: recall,
    durationMs: Date.now() - startTime,
  };
};

/** Conveniencia: extrae snapshots/screenshots de los events para preview. */
export const extractScreenshots = (result: BrainAwareCuResult): string[] => {
  return result.events
    .filter((e) => e.kind === 'screenshot')
    .map((e) => (e as { kind: 'screenshot'; dataUri: string }).dataUri);
};

/** Telemetría de una sesión brain-aware. */
export const summarizeSession = (
  result: BrainAwareCuResult,
): {
  outcome: string;
  reward: number;
  durationSec: number;
  actionsExecuted: number;
  screenshotsCaptured: number;
  errorsEncountered: number;
  memoryHits: number;
} => {
  const sessionEnd = result.events.find((e) => e.kind === 'session-end') as { ok: number; total: number } | undefined;
  const screenshots = result.events.filter((e) => e.kind === 'screenshot').length;
  const errors = result.events.filter(
    (e) =>
      e.kind === 'act' &&
      'gesture' in e &&
      (e.gesture === 'error' || e.gesture === 'action-error' || e.gesture === 'loop-detected'),
  ).length;

  return {
    outcome: result.outcome,
    reward: result.reward,
    durationSec: Math.round(result.durationMs / 1000),
    actionsExecuted: sessionEnd?.ok ?? 0,
    screenshotsCaptured: screenshots,
    errorsEncountered: errors,
    memoryHits: result.memoryRecalled?.similarPastSessions ?? 0,
  };
};
