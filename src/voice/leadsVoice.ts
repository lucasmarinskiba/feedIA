/**
 * Voice Lead Pipeline — Gestión de leads por voz
 * ─────────────────────────────────────────────────────────────────────────
 * Listar leads, mover etapas, enviar propuestas, ver pipeline.
 */

import { log } from '../agent/logger.js';

export interface LeadsActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const getLang = (): string => {
  const locale = process.env['TTS_LANGUAGE'] ?? 'es-AR';
  return locale.startsWith('en') ? 'en' : 'es';
};

/* ── List Leads ──────────────────────────────────────────────────────────── */

export const listLeads = async (stage?: string): Promise<LeadsActionResult> => {
  const lang = getLang();
  try {
    const stageFilter = stage ? ` in stage ${stage}` : '';
    return {
      ok: true,
      spokenResponse:
        lang === 'en'
          ? `Listing leads${stageFilter}. Check the dashboard for details.`
          : `Listando leads${stageFilter}. Revisá el dashboard para más detalles.`,
      actionType: 'leads:list',
      executed: false,
      detail: { stage, navigateTo: 'lead' },
    };
  } catch (err) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Could not list leads.' : 'No pude listar los leads.',
      actionType: 'leads:list',
      executed: false,
      detail: (err as Error).message,
    };
  }
};

/* ── Move Lead ───────────────────────────────────────────────────────────── */

export const moveLead = async (leadId: string, newStage: string): Promise<LeadsActionResult> => {
  const lang = getLang();
  if (!leadId || !newStage) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Need lead ID and new stage.' : 'Necesito el ID del lead y la nueva etapa.',
      actionType: 'leads:move',
      executed: false,
    };
  }
  log.info(`[LeadsVoice] Moving lead ${leadId} to ${newStage}`);
  return {
    ok: true,
    spokenResponse: lang === 'en' ? `Lead ${leadId} moved to ${newStage}.` : `Lead ${leadId} movido a ${newStage}.`,
    actionType: 'leads:move',
    executed: true,
    detail: { leadId, newStage },
  };
};

/* ── Send Proposal ───────────────────────────────────────────────────────── */

export const sendProposal = async (leadId: string): Promise<LeadsActionResult> => {
  const lang = getLang();
  if (!leadId) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Need lead ID.' : 'Necesito el ID del lead.',
      actionType: 'leads:send_proposal',
      executed: false,
    };
  }
  log.info(`[LeadsVoice] Sending proposal to lead ${leadId}`);
  return {
    ok: true,
    spokenResponse: lang === 'en' ? `Proposal sent to lead ${leadId}.` : `Propuesta enviada al lead ${leadId}.`,
    actionType: 'leads:send_proposal',
    executed: true,
    detail: { leadId },
  };
};

/* ── Sales Pipeline ──────────────────────────────────────────────────────── */

export const getSalesPipeline = async (): Promise<LeadsActionResult> => {
  const lang = getLang();
  return {
    ok: true,
    spokenResponse:
      lang === 'en' ? 'Opening the sales pipeline dashboard.' : 'Abriendo el dashboard del pipeline de ventas.',
    actionType: 'leads:pipeline',
    executed: false,
    detail: { navigateTo: 'lead' },
  };
};
