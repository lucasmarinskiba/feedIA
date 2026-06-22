/**
 * goalsVoice.ts — Voz Autónoma: Metas y Crecimiento
 * ─────────────────────────────────────────────────────────────────────────
 * Módulo de voz para gestión de objetivos. Conecta el subsistema de metas
 * con el router de acciones de voz, devolviendo respuestas bilingües habladas.
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

/* ── Localization helper ─────────────────────────────────────────────────── */

const t = (es: string, en: string, lang?: string): string => {
  const l = lang ?? loadBrandProfile().audience.locale ?? 'es-AR';
  return l.startsWith('es') ? es : en;
};

const baseResult = (
  ok: boolean,
  actionType: string,
  spokenResponse: string,
  executed: boolean,
  detail?: unknown,
): VoiceActionResult => ({
  ok,
  spokenResponse,
  actionType,
  executed,
  detail,
});

/* ── Actions ─────────────────────────────────────────────────────────────── */

/**
 * Crea una nueva meta de crecimiento activa.
 */
export const setGrowthGoal = async (target: string, metric: string, timeframe: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[goalsVoice] setGrowthGoal: target=${target} metric=${metric} timeframe=${timeframe}`);

  try {
    const gm = await import('../capabilities/goals/goalManager.js');
    const goal = gm.createGoal({
      horizon: 'monthly',
      category: 'growth',
      title: target,
      description: `Meta de crecimiento: ${target} (${metric}) en ${timeframe}`,
      target: { metric, value: Number(target) || 0, unit: metric },
      source: 'voice',
    });

    const spoken = t(
      `Meta creada: ${goal.title} con objetivo de ${goal.target.value} ${goal.target.unit} para ${timeframe}.`,
      `Goal created: ${goal.title} with target of ${goal.target.value} ${goal.target.unit} for ${timeframe}.`,
      lang,
    );

    log.debug(`[goalsVoice] Goal created: ${goal.id}`);
    return baseResult(true, 'goals.setGrowthGoal', spoken, true, { goalId: goal.id });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[goalsVoice] setGrowthGoal failed: ${msg}`);
    return baseResult(
      false,
      'goals.setGrowthGoal',
      t('No pude crear la meta. Revisá los datos.', 'Could not create the goal. Please check the data.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Lista las metas activas actuales.
 */
export const listActiveGoals = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[goalsVoice] listActiveGoals');

  try {
    const gm = await import('../capabilities/goals/goalManager.js');
    const goals = gm.getActiveGoals();

    if (!goals.length) {
      const spoken = t('No tenés metas activas en este momento.', 'You have no active goals right now.', lang);
      return baseResult(true, 'goals.listActiveGoals', spoken, true, { goals: [] });
    }

    const names = goals.map((g) => g.title).join(', ');
    const spoken = t(
      `Tenés ${goals.length} meta${goals.length > 1 ? 's' : ''} activa${goals.length > 1 ? 's' : ''}: ${names}.`,
      `You have ${goals.length} active goal${goals.length > 1 ? 's' : ''}: ${names}.`,
      lang,
    );

    log.debug(`[goalsVoice] Found ${goals.length} active goals`);
    return baseResult(true, 'goals.listActiveGoals', spoken, true, { goals });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[goalsVoice] listActiveGoals failed: ${msg}`);
    return baseResult(
      false,
      'goals.listActiveGoals',
      t('No pude leer las metas activas.', 'Could not read active goals.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Consulta el progreso de una meta específica o del resumen general.
 */
export const getGoalProgress = async (goalId?: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[goalsVoice] getGoalProgress: goalId=${goalId ?? 'all'}`);

  try {
    const gm = await import('../capabilities/goals/goalManager.js');

    if (goalId) {
      const goal = gm.getGoal(goalId);
      if (!goal) {
        const spoken = t('No encontré esa meta.', 'I could not find that goal.', lang);
        return baseResult(false, 'goals.getGoalProgress', spoken, false, { goalId });
      }
      const spoken = t(
        `La meta ${goal.title} va al ${goal.checkpoints.at(-1)?.actualProgress ?? 0} por ciento.`,
        `Goal ${goal.title} is at ${goal.checkpoints.at(-1)?.actualProgress ?? 0} percent.`,
        lang,
      );
      return baseResult(true, 'goals.getGoalProgress', spoken, true, { goal });
    }

    const active = gm.getActiveGoals();
    const summaries = active.map((g) => `${g.title}: ${g.checkpoints.at(-1)?.actualProgress ?? 0}%`);
    const spoken = t(
      `Resumen de metas activas: ${summaries.join(', ') || 'sin datos de progreso'}.`,
      `Active goals summary: ${summaries.join(', ') || 'no progress data'}.`,
      lang,
    );
    return baseResult(true, 'goals.getGoalProgress', spoken, true, { active });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[goalsVoice] getGoalProgress failed: ${msg}`);
    return baseResult(
      false,
      'goals.getGoalProgress',
      t('No pude consultar el progreso.', 'Could not check progress.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Ajusta el target de una meta existente.
 */
export const adjustGoal = async (goalId: string, newTarget: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[goalsVoice] adjustGoal: goalId=${goalId} newTarget=${newTarget}`);

  try {
    const gm = await import('../capabilities/goals/goalManager.js');
    const goal = gm.getGoal(goalId);
    if (!goal) {
      const spoken = t('No encontré la meta para ajustar.', 'Could not find the goal to adjust.', lang);
      return baseResult(false, 'goals.adjustGoal', spoken, false, { goalId });
    }

    const numeric = Number(newTarget);
    if (!Number.isFinite(numeric)) {
      const spoken = t('El nuevo objetivo debe ser un número.', 'The new target must be a number.', lang);
      return baseResult(false, 'goals.adjustGoal', spoken, false, { newTarget });
    }

    // goalManager no expone update directo; usamos transition para reactivar con nota
    gm.transitionGoal(goalId, 'active', `Ajuste por voz: nuevo target ${numeric}`);
    goal.target.value = numeric;

    const spoken = t(
      `Meta ${goal.title} ajustada a ${numeric} ${goal.target.unit}.`,
      `Goal ${goal.title} adjusted to ${numeric} ${goal.target.unit}.`,
      lang,
    );

    log.debug(`[goalsVoice] Goal ${goalId} adjusted to ${numeric}`);
    return baseResult(true, 'goals.adjustGoal', spoken, true, { goalId, newTarget: numeric });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[goalsVoice] adjustGoal failed: ${msg}`);
    return baseResult(
      false,
      'goals.adjustGoal',
      t('No pude ajustar la meta.', 'Could not adjust the goal.', lang),
      false,
      { error: msg },
    );
  }
};
