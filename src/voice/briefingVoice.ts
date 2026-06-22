/**
 * briefingVoice.ts — Voz Autónoma: Briefings Diarios y Semanales
 * ─────────────────────────────────────────────────────────────────────────
 * Responde con resúmenes ejecutivos del estado de la marca, tareas
 * pendientes y alertas relevantes, todo en formato hablado.
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
 * Genera el briefing diario ejecutivo.
 */
export const getDailyBriefing = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[briefingVoice] getDailyBriefing');

  try {
    const digest = await import('../capabilities/digest/index.js');
    const daily = await digest.construirDigest(brand);

    const intel = daily.data.intel;
    const metrics = intel
      ? `Presupuesto ${intel.presupuesto.usadoPct}%. Misiones OK: ${intel.misiones.ok}. Carruseles: ${intel.carruseles.publicados}.`
      : 'Sin métricas disponibles';

    const spoken = t(
      `Briefing diario: ${daily.resumenEjecutivo.slice(0, 120)}. ${metrics} ${daily.cosasQueRequierenAtencion.length ? `Atención: ${daily.cosasQueRequierenAtencion[0]}.` : ''}`,
      `Daily briefing: ${daily.resumenEjecutivo.slice(0, 120)}. ${metrics} ${daily.cosasQueRequierenAtencion.length ? `Attention: ${daily.cosasQueRequierenAtencion[0]}.` : ''}`,
      lang,
    );

    log.debug('[briefingVoice] Daily briefing generated');
    return baseResult(true, 'briefing.daily', spoken, true, { daily });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[briefingVoice] getDailyBriefing failed: ${msg}`);
    return baseResult(
      false,
      'briefing.daily',
      t('No pude generar el briefing diario.', 'Could not generate the daily briefing.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Genera el briefing semanal ejecutivo.
 */
export const getWeeklyBriefing = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[briefingVoice] getWeeklyBriefing');

  try {
    const analytics = await import('../capabilities/analytics/index.js');
    const hasta = new Date().toISOString();
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const snapshot = await analytics.buildSnapshot(desde, hasta);
    const alertas = analytics.detectAnomalies(snapshot);
    const report = await analytics.generateWeeklyReport(brand, snapshot, alertas);

    const spoken = t(
      `Briefing semanal: ${report.resumenEjecutivo.slice(0, 120)}. ${report.victorias.length ? `${report.victorias.length} victorias.` : ''} ${report.alertasOperativas.length ? `${report.alertasOperativas.length} alertas.` : ''}`,
      `Weekly briefing: ${report.resumenEjecutivo.slice(0, 120)}. ${report.victorias.length ? `${report.victorias.length} victories.` : ''} ${report.alertasOperativas.length ? `${report.alertasOperativas.length} alerts.` : ''}`,
      lang,
    );

    log.debug('[briefingVoice] Weekly briefing generated');
    return baseResult(true, 'briefing.weekly', spoken, true, { report });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[briefingVoice] getWeeklyBriefing failed: ${msg}`);
    return baseResult(
      false,
      'briefing.weekly',
      t('No pude generar el briefing semanal.', 'Could not generate the weekly briefing.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Lista las tareas pendientes del tablero.
 */
export const getPendingTasks = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[briefingVoice] getPendingTasks');

  try {
    const taskBoard = await import('../capabilities/goals/taskBoard.js');
    const kanban = taskBoard.getKanbanView ? taskBoard.getKanbanView() : { todo: [], doing: [], blocked: [] };
    const tasks = [...kanban.todo, ...kanban.doing, ...kanban.blocked];

    if (!tasks.length) {
      const spoken = t('No tenés tareas pendientes.', 'You have no pending tasks.', lang);
      return baseResult(true, 'briefing.pendingTasks', spoken, true, { tasks: [] });
    }

    const critical = tasks.filter((t) => t.priority === 'critical').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;

    const spoken = t(
      `Tenés ${tasks.length} tareas pendientes. ${critical ? `${critical} críticas.` : ''} ${blocked ? `${blocked} bloqueadas.` : ''}`,
      `You have ${tasks.length} pending tasks. ${critical ? `${critical} critical.` : ''} ${blocked ? `${blocked} blocked.` : ''}`,
      lang,
    );

    log.debug(`[briefingVoice] Found ${tasks.length} pending tasks`);
    return baseResult(true, 'briefing.pendingTasks', spoken, true, { tasks });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[briefingVoice] getPendingTasks failed: ${msg}`);
    return baseResult(
      false,
      'briefing.pendingTasks',
      t('No pude consultar las tareas.', 'Could not check tasks.', lang),
      false,
      { error: msg },
    );
  }
};
