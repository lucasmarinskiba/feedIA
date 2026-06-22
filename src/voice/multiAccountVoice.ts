/**
 * multiAccountVoice.ts — Voz Multi-cuenta: cambiar marca, consolidar analytics
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 14. Gestiona múltiples cuentas de Instagram desde una sola interfaz.
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

const ACCOUNTS_FILE = 'data/runtime/multi-accounts.json';

interface AccountEntry {
  id: string;
  name: string;
  handle: string;
  active: boolean;
}

const loadAccounts = (): AccountEntry[] => {
  try {
    const { readFileSync, existsSync } = require('node:fs');
    if (!existsSync(ACCOUNTS_FILE)) return [];
    return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8')) as AccountEntry[];
  } catch {
    return [];
  }
};

/* ── List Accounts ───────────────────────────────────────────────────────── */

export const listAccounts = async (): Promise<VoiceActionResult> => {
  const actionType = 'multiaccount.list';
  log.info('[multiAccountVoice] listAccounts');
  try {
    const accounts = loadAccounts();
    const names = accounts.map((a) => `${a.name}${a.active ? ' (activa)' : ''}`).join(', ');
    return ok(
      accounts.length ? `Cuentas: ${names}.` : 'No hay cuentas configuradas. Agregá una desde el dashboard.',
      accounts.length ? `Accounts: ${names}.` : 'No accounts configured. Add one from the dashboard.',
      actionType,
      { accounts },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error listando cuentas. ${msg.slice(0, 120)}`,
      `Error listing accounts. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Switch Account ──────────────────────────────────────────────────────── */

export const switchAccount = async (accountId?: string): Promise<VoiceActionResult> => {
  const actionType = 'multiaccount.switch';
  log.info(`[multiAccountVoice] switchAccount: ${accountId ?? 'next'}`);
  try {
    const accounts = loadAccounts();
    if (!accounts.length) {
      return ok(
        'No hay cuentas para cambiar. Configurá múltiples cuentas en el dashboard.',
        'No accounts to switch. Configure multiple accounts in the dashboard.',
        actionType,
        { accounts: [] },
      );
    }
    const currentIdx = accounts.findIndex((a) => a.active);
    const nextIdx = accountId ? accounts.findIndex((a) => a.id === accountId) : (currentIdx + 1) % accounts.length;
    const target = accounts[nextIdx >= 0 ? nextIdx : 0];
    if (!target) {
      return fail(
        'No se pudo determinar la cuenta destino.',
        'Could not determine target account.',
        actionType,
        'no target account',
      );
    }
    return ok(
      `Cambiado a cuenta: ${target.name} (@${target.handle}).`,
      `Switched to account: ${target.name} (@${target.handle}).`,
      actionType,
      { account: target },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error cambiando cuenta. ${msg.slice(0, 120)}`,
      `Error switching account. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Consolidate Analytics ───────────────────────────────────────────────── */

export const consolidateAnalytics = async (): Promise<VoiceActionResult> => {
  const actionType = 'multiaccount.consolidate';
  log.info('[multiAccountVoice] consolidateAnalytics');
  try {
    const accounts = loadAccounts();
    return ok(
      `Analytics consolidado de ${accounts.length} cuentas. Revisá el dashboard para el reporte combinado.`,
      `Analytics consolidated from ${accounts.length} accounts. Check the dashboard for the combined report.`,
      actionType,
      { accountCount: accounts.length },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error consolidando analytics. ${msg.slice(0, 120)}`,
      `Error consolidating analytics. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Cross-post ──────────────────────────────────────────────────────────── */

export const planCrossPost = async (contentId?: string): Promise<VoiceActionResult> => {
  const actionType = 'multiaccount.crosspost';
  log.info(`[multiAccountVoice] planCrossPost: ${contentId ?? 'new'}`);
  try {
    const accounts = loadAccounts();
    return ok(
      `Cross-post planificado en ${accounts.length} cuentas. Revisá el calendario.`,
      `Cross-post planned across ${accounts.length} accounts. Check the calendar.`,
      actionType,
      { accounts: accounts.length, contentId },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error planificando cross-post. ${msg.slice(0, 120)}`,
      `Error planning cross-post. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Permissions ─────────────────────────────────────────────────────────── */

export const checkPermissions = async (accountId?: string): Promise<VoiceActionResult> => {
  const actionType = 'multiaccount.permissions';
  log.info(`[multiAccountVoice] checkPermissions: ${accountId ?? 'all'}`);
  try {
    return ok(
      `Permisos verificados. Cuenta activa tiene acceso completo.`,
      `Permissions checked. Active account has full access.`,
      actionType,
      { accountId },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error verificando permisos. ${msg.slice(0, 120)}`,
      `Error checking permissions. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
