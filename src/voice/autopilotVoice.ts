/**
 * autopilotVoice.ts — Voz Autónoma: Autopilot de Contenido
 * ─────────────────────────────────────────────────────────────────────────
 * Controla el autopilot semanal por voz: arrancar, detener, reportar
 * y configurar parámetros del pipeline automático.
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

/* ── Simple in-memory autopilot state ────────────────────────────────────── */

let autopilotRunning = false;
let lastAutopilotResult: unknown = null;
let autopilotConfig: Record<string, unknown> = { dryRunBrief: true };

/* ── Actions ─────────────────────────────────────────────────────────────── */

/**
 * Inicia el autopilot semanal de contenido.
 */
export const startAutopilot = async (config?: Record<string, unknown>): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[autopilotVoice] startAutopilot');

  if (autopilotRunning) {
    const spoken = t('El autopilot ya está corriendo.', 'Autopilot is already running.', lang);
    return baseResult(true, 'autopilot.start', spoken, false, { alreadyRunning: true });
  }

  try {
    const pipelines = await import('../capabilities/pipelines/index.js');
    autopilotConfig = { ...autopilotConfig, ...config };

    const result = await pipelines.runWeeklyAutopilot(brand, {
      dryRunBrief: (autopilotConfig.dryRunBrief as boolean) ?? true,
      bestHours: Array.isArray(autopilotConfig.bestHours) ? (autopilotConfig.bestHours as string[]) : undefined,
    });

    autopilotRunning = true;
    lastAutopilotResult = result;

    const spoken = t(
      `Autopilot iniciado. Se planificaron ${result.plan.cantidadPosts} posts. ${result.pendientesAprobacion} esperan aprobación.`,
      `Autopilot started. ${result.plan.cantidadPosts} posts planned. ${result.pendientesAprobacion} pending approval.`,
      lang,
    );

    log.step('[autopilotVoice] Autopilot started');
    return baseResult(true, 'autopilot.start', spoken, true, { result });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[autopilotVoice] startAutopilot failed: ${msg}`);
    return baseResult(
      false,
      'autopilot.start',
      t('No pude iniciar el autopilot.', 'Could not start autopilot.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Detiene el autopilot semanal.
 */
export const stopAutopilot = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[autopilotVoice] stopAutopilot');

  if (!autopilotRunning) {
    const spoken = t('El autopilot no estaba activo.', 'Autopilot was not active.', lang);
    return baseResult(true, 'autopilot.stop', spoken, false, { wasRunning: false });
  }

  autopilotRunning = false;
  const spoken = t('Autopilot detenido.', 'Autopilot stopped.', lang);
  log.step('[autopilotVoice] Autopilot stopped');
  return baseResult(true, 'autopilot.stop', spoken, true, { wasRunning: true });
};

/**
 * Genera un reporte del período solicitado.
 */
export const getAutopilotReport = async (period?: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[autopilotVoice] getAutopilotReport: period=${period ?? 'last'}`);

  try {
    const result = lastAutopilotResult as {
      plan?: { cantidadPosts?: number; slots?: unknown[] };
      publicados?: number;
      pendientesAprobacion?: number;
    } | null;

    if (!result) {
      const spoken = t('No tengo datos de autopilot aún.', 'No autopilot data available yet.', lang);
      return baseResult(true, 'autopilot.report', spoken, false, { hasData: false });
    }

    const posts = result.plan?.cantidadPosts ?? 0;
    const published = result.publicados ?? 0;
    const pending = result.pendientesAprobacion ?? 0;
    const spoken = t(
      `Reporte de autopilot: ${posts} posts planificados, ${published} publicados, ${pending} pendientes de aprobación.`,
      `Autopilot report: ${posts} posts planned, ${published} published, ${pending} pending approval.`,
      lang,
    );

    log.debug('[autopilotVoice] Report generated');
    return baseResult(true, 'autopilot.report', spoken, true, { period, result });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[autopilotVoice] getAutopilotReport failed: ${msg}`);
    return baseResult(
      false,
      'autopilot.report',
      t('No pude generar el reporte.', 'Could not generate the report.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Configura parámetros del autopilot.
 */
export const configureAutopilot = async (settings: Record<string, unknown>): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[autopilotVoice] configureAutopilot: ${JSON.stringify(settings)}`);

  autopilotConfig = { ...autopilotConfig, ...settings };

  const keys = Object.keys(settings).join(', ');
  const spoken = t(
    `Configuración actualizada: ${keys || 'sin cambios'}.`,
    `Configuration updated: ${keys || 'no changes'}.`,
    lang,
  );

  log.debug('[autopilotVoice] Configuration updated');
  return baseResult(true, 'autopilot.configure', spoken, true, { config: autopilotConfig });
};
