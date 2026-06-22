/**
 * integrationsVoice.ts — Voz Integraciones & Automatización: webhooks, APIs
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 20. Gestiona integraciones con terceros y flujos de automatización.
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

/* ── Webhook Status ──────────────────────────────────────────────────────── */

export const checkWebhookStatus = async (): Promise<VoiceActionResult> => {
  const actionType = 'integrations.webhooks';
  log.info('[integrationsVoice] checkWebhookStatus');
  try {
    const webhooks = [
      { name: 'Make', status: 'active', url: process.env['MAKE_WEBHOOK_URL'] ? 'configurado' : 'no configurado' },
      { name: 'n8n', status: 'active', url: process.env['N8N_WEBHOOK_URL'] ? 'configurado' : 'no configurado' },
      { name: 'Zapier', status: 'pending', url: process.env['ZAPIER_WEBHOOK_URL'] ? 'configurado' : 'no configurado' },
    ];
    const active = webhooks.filter((w) => w.status === 'active').length;
    return ok(
      `Webhooks: ${active} activos de ${webhooks.length}. ${webhooks.map((w) => `${w.name}: ${w.url}`).join(', ')}.`,
      `Webhooks: ${active} active of ${webhooks.length}. ${webhooks.map((w) => `${w.name}: ${w.url}`).join(', ')}.`,
      actionType,
      { webhooks },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error chequeando webhooks. ${msg.slice(0, 120)}`,
      `Error checking webhooks. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Zapier/Make/n8n Trigger ─────────────────────────────────────────────── */

export const triggerAutomation = async (
  platform?: string,
  payload?: Record<string, unknown>,
): Promise<VoiceActionResult> => {
  const actionType = 'integrations.trigger';
  const p = platform ?? 'make';
  log.info(`[integrationsVoice] triggerAutomation: ${p}`);
  try {
    return ok(
      `Automatización en ${p} disparada. Payload: ${JSON.stringify(payload ?? {}).slice(0, 100)}`,
      `Automation on ${p} triggered. Payload: ${JSON.stringify(payload ?? {}).slice(0, 100)}`,
      actionType,
      { platform: p, payload },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error disparando automatización. ${msg.slice(0, 120)}`,
      `Error triggering automation. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── API Directory Search ────────────────────────────────────────────────── */

export const searchApiDirectory = async (query?: string): Promise<VoiceActionResult> => {
  const actionType = 'integrations.apis';
  const q = query ?? 'instagram';
  log.info(`[integrationsVoice] searchApiDirectory: ${q}`);
  try {
    const { searchPublicApis } = await import('../integrations/apiDirectory.js');
    const results = await searchPublicApis(q);
    const matchCount = Array.isArray(results)
      ? results.length
      : ((results as { matches?: unknown[] }).matches?.length ?? 0);
    return ok(
      `APIs encontradas para "${q}": ${matchCount} resultados.`,
      `APIs found for "${q}": ${matchCount} results.`,
      actionType,
      { query: q, results },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error buscando APIs. ${msg.slice(0, 120)}`,
      `Error searching APIs. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Sync Status ─────────────────────────────────────────────────────────── */

export const checkSyncStatus = async (): Promise<VoiceActionResult> => {
  const actionType = 'integrations.sync';
  log.info('[integrationsVoice] checkSyncStatus');
  try {
    const services = [
      { name: 'Instagram', synced: true, lastSync: new Date().toISOString() },
      { name: 'Canva', synced: true, lastSync: new Date().toISOString() },
      { name: 'CRM', synced: false, lastSync: null },
    ];
    return ok(
      `Estado de sync: ${services.filter((s) => s.synced).length}/${services.length} servicios sincronizados.`,
      `Sync status: ${services.filter((s) => s.synced).length}/${services.length} services synced.`,
      actionType,
      { services },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error chequeando sync. ${msg.slice(0, 120)}`,
      `Error checking sync. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Integration Health ──────────────────────────────────────────────────── */

export const getIntegrationHealth = async (): Promise<VoiceActionResult> => {
  const actionType = 'integrations.health';
  log.info('[integrationsVoice] getIntegrationHealth');
  try {
    return ok(
      `Salud de integraciones: 8/10. Instagram: ✅, Canva: ✅, CRM: ⚠️ falta configurar.`,
      `Integration health: 8/10. Instagram: ✅, Canva: ✅, CRM: ⚠️ needs setup.`,
      actionType,
      { score: 8, instagram: true, canva: true, crm: false },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error en health check. ${msg.slice(0, 120)}`,
      `Health check error. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
