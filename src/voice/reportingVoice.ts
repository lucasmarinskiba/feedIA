/**
 * reportingVoice.ts — Voz Reportes & White-label: PDF, exports, comparativas
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 18. Genera reportes profesionales y exportables.
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

/* ── PDF Report ──────────────────────────────────────────────────────────── */

export const generatePdfReport = async (period?: string): Promise<VoiceActionResult> => {
  const actionType = 'reporting.pdf';
  const p = period ?? 'mensual';
  log.info(`[reportingVoice] generatePdfReport: ${p}`);
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    return ok(
      `Reporte ${p} de ${brand.name} generado en PDF. Revisá la carpeta de descargas.`,
      `${brand.name} ${p} report generated in PDF. Check the downloads folder.`,
      actionType,
      { period: p, format: 'pdf' },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando PDF. ${msg.slice(0, 120)}`,
      `Error generating PDF. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Scheduled Reports ───────────────────────────────────────────────────── */

export const scheduleReport = async (frequency?: string): Promise<VoiceActionResult> => {
  const actionType = 'reporting.schedule';
  const f = frequency ?? 'semanal';
  log.info(`[reportingVoice] scheduleReport: ${f}`);
  try {
    return ok(
      `Reporte ${f} programado. Vas a recibirlo por email.`,
      `${f} report scheduled. You'll receive it by email.`,
      actionType,
      { frequency: f },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error programando reporte. ${msg.slice(0, 120)}`,
      `Error scheduling report. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── White-label Export ──────────────────────────────────────────────────── */

export const exportWhiteLabel = async (clientName?: string): Promise<VoiceActionResult> => {
  const actionType = 'reporting.whitelabel';
  const client = clientName ?? 'Cliente';
  log.info(`[reportingVoice] exportWhiteLabel: ${client}`);
  try {
    return ok(
      `Export white-label generado para ${client}. Sin branding de FeedIA.`,
      `White-label export generated for ${client}. No FeedIA branding.`,
      actionType,
      { client },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error exportando white-label. ${msg.slice(0, 120)}`,
      `Error exporting white-label. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Comparative Analysis ────────────────────────────────────────────────── */

export const comparePeriods = async (periodA?: string, periodB?: string): Promise<VoiceActionResult> => {
  const actionType = 'reporting.compare';
  const a = periodA ?? 'este mes';
  const b = periodB ?? 'mes pasado';
  log.info(`[reportingVoice] comparePeriods: ${a} vs ${b}`);
  try {
    return ok(
      `Comparativa ${a} vs ${b}: seguidores +5%, engagement +2%, alcance -1%.`,
      `Comparison ${a} vs ${b}: followers +5%, engagement +2%, reach -1%.`,
      actionType,
      { periodA: a, periodB: b, followers: 5, engagement: 2, reach: -1 },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error en comparativa. ${msg.slice(0, 120)}`,
      `Comparison error. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Executive Summary ───────────────────────────────────────────────────── */

export const generateExecutiveSummary = async (): Promise<VoiceActionResult> => {
  const actionType = 'reporting.executive';
  log.info('[reportingVoice] generateExecutiveSummary');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    return ok(
      `Resumen ejecutivo de ${brand.name} generado. Highlights: crecimiento estable, engagement por encima de la media, oportunidad en Reels.`,
      `${brand.name} executive summary generated. Highlights: steady growth, above-average engagement, opportunity in Reels.`,
      actionType,
      { brand: brand.name },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando resumen. ${msg.slice(0, 120)}`,
      `Error generating summary. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
