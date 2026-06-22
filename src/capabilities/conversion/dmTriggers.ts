// @ts-nocheck
/**
 * DM Keyword Triggers
 *
 * Cuando un usuario envía un DM con ciertas palabras clave,
 * activa secuencias específicas o respuestas inmediatas.
 *
 * Ejemplo: DM con "precio" → activa secuencia de venta
 * Ejemplo: DM con "ayuda" → respuesta inmediata con FAQ
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendDm } from '../../integrations/meta.js';
import { recordAction, checkRateLimit } from '../../compliance/rateLimiter.js';
import { audit } from '../../compliance/auditLog.js';
import { inscribirEnSecuencia } from '../nurture/index.js';
import { addOrUpdateLead } from '../sales/pipeline.js';

const TRIGGERS_FILE = resolve('data/runtime/dm-triggers.json');
const LOG_FILE = resolve('data/runtime/dm-trigger-log.json');

export type TriggerAction = 'reply' | 'nurture' | 'alert' | 'escalate';

export interface DmTrigger {
  id: string;
  keywords: string[]; // e.g. ["precio", "cuánto cuesta", "valor"]
  action: TriggerAction;
  replyMessage?: string; // for action='reply'
  nurtureTrigger?: string; // for action='nurture' — sequence trigger name
  alertSeverity?: 'info' | 'warn' | 'crisis' | 'lead';
  alertTitle?: string;
  alertBody?: string;
  active: boolean;
  cooldownHours: number;
  maxActivationsPerDay: number;
  createdAt: string;
}

interface TriggerLog {
  userId: string;
  triggerId: string;
  action: TriggerAction;
  executedAt: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadTriggers = (): DmTrigger[] => {
  if (!existsSync(TRIGGERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TRIGGERS_FILE, 'utf-8')) as DmTrigger[];
  } catch {
    return [];
  }
};

const saveTriggers = (triggers: DmTrigger[]): void => {
  ensureDir();
  writeFileSync(TRIGGERS_FILE, JSON.stringify(triggers, null, 2), 'utf-8');
};

const loadLog = (): TriggerLog[] => {
  if (!existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf-8')) as TriggerLog[];
  } catch {
    return [];
  }
};

const appendLog = (entry: TriggerLog): void => {
  ensureDir();
  const log = loadLog();
  log.push(entry);
  writeFileSync(LOG_FILE, JSON.stringify(log.slice(-1000), null, 2), 'utf-8');
};

export const listTriggers = (): DmTrigger[] => loadTriggers();

export const addTrigger = (trigger: Omit<DmTrigger, 'id' | 'createdAt'>): DmTrigger => {
  const triggers = loadTriggers();
  const newTrigger: DmTrigger = {
    ...trigger,
    id: `dmt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  triggers.push(newTrigger);
  saveTriggers(triggers);
  log.success(`[DMTrigger] Creado: ${newTrigger.keywords.join('|')} → ${newTrigger.action}`);
  return newTrigger;
};

export const updateTrigger = (
  id: string,
  partial: Partial<Omit<DmTrigger, 'id' | 'createdAt'>>,
): DmTrigger | undefined => {
  const triggers = loadTriggers();
  const idx = triggers.findIndex((t) => t.id === id);
  if (idx < 0) return undefined;
  const updated = { ...triggers[idx], ...partial } as DmTrigger;
  triggers[idx] = updated;
  saveTriggers(triggers);
  return updated;
};

export const deleteTrigger = (id: string): boolean => {
  const triggers = loadTriggers();
  const filtered = triggers.filter((t) => t.id !== id);
  if (filtered.length === triggers.length) return false;
  saveTriggers(filtered);
  return true;
};

const shouldTriggerForUser = (userId: string, trigger: DmTrigger): boolean => {
  const log = loadLog();
  const cutoff = new Date(Date.now() - trigger.cooldownHours * 3600_000);
  const recent = log.filter(
    (l) => l.userId === userId && l.triggerId === trigger.id && new Date(l.executedAt) > cutoff,
  );
  return recent.length === 0;
};

const getDailyCountForTrigger = (triggerId: string): number => {
  const log = loadLog();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return log.filter((l) => l.triggerId === triggerId && new Date(l.executedAt) > dayAgo).length;
};

const sendAlert = async (trigger: DmTrigger, userId: string, messageText: string): Promise<void> => {
  const { sendAlert: sendNotification } = await import('../../integrations/notifications.js');
  await sendNotification({
    severity: trigger.alertSeverity ?? 'info',
    title: trigger.alertTitle ?? `DM Trigger: ${trigger.keywords.join(', ')}`,
    body: `${trigger.alertBody ?? ''}\nUsuario: ${userId}\nMensaje: ${messageText}`,
  });
};

/**
 * Evalúa un DM entrante y ejecuta triggers si hay match.
 * Retorna array de resultados por trigger ejecutado.
 */
export const evaluateDm = async (
  userId: string,
  messageText: string,
): Promise<Array<{ triggered: boolean; triggerId: string; action: TriggerAction; detail?: string }>> => {
  const triggers = loadTriggers().filter((t) => t.active);
  if (triggers.length === 0) return [];

  const lowerMsg = messageText.toLowerCase();
  const results: Array<{ triggered: boolean; triggerId: string; action: TriggerAction; detail?: string }> = [];

  for (const trigger of triggers) {
    const match = trigger.keywords.some((k) => lowerMsg.includes(k.toLowerCase()));
    if (!match) {
      results.push({ triggered: false, triggerId: trigger.id, action: trigger.action });
      continue;
    }

    // Rate limiting
    const rateCheck = checkRateLimit('reply_dm', 'dm-trigger');
    if (!rateCheck.allowed) {
      results.push({
        triggered: false,
        triggerId: trigger.id,
        action: trigger.action,
        detail: `rate limit: ${rateCheck.reason}`,
      });
      continue;
    }

    // Max activations per day
    if (getDailyCountForTrigger(trigger.id) >= trigger.maxActivationsPerDay) {
      results.push({
        triggered: false,
        triggerId: trigger.id,
        action: trigger.action,
        detail: 'límite diario alcanzado',
      });
      continue;
    }

    // Cooldown per user
    if (!shouldTriggerForUser(userId, trigger)) {
      results.push({ triggered: false, triggerId: trigger.id, action: trigger.action, detail: 'cooldown activo' });
      continue;
    }

    // Register lead
    addOrUpdateLead(userId, {
      source: `dm-trigger:${trigger.keywords.join(',')}`,
      stage: trigger.action === 'reply' ? 'calificado' : trigger.action === 'nurture' ? 'nuevo' : 'calificado',
      score: trigger.action === 'reply' ? 50 : 40,
      notes: [`DM recibido: "${messageText.slice(0, 100)}"`],
    });

    // Execute action
    let detail: string | undefined;
    switch (trigger.action) {
      case 'reply': {
        if (trigger.replyMessage) {
          const r = await sendDm(userId, trigger.replyMessage);
          if (r.ok) {
            recordAction('reply_dm', 'dm-trigger');
            detail = 'DM enviado';
          } else {
            detail = `fallo: ${r.error}`;
          }
        } else {
          detail = 'sin mensaje configurado';
        }
        break;
      }
      case 'nurture': {
        if (trigger.nurtureTrigger) {
          try {
            inscribirEnSecuencia(userId, trigger.nurtureTrigger as never);
            detail = `inscrito en secuencia ${trigger.nurtureTrigger}`;
          } catch (err) {
            detail = `fallo al inscribir: ${(err as Error).message}`;
          }
        } else {
          detail = 'sin secuencia configurada';
        }
        break;
      }
      case 'alert': {
        await sendAlert(trigger, userId, messageText);
        detail = 'alerta enviada';
        break;
      }
      case 'escalate': {
        const { escalateToHuman } = await import('../bot/conversationMemory.js');
        escalateToHuman(userId, `DM Trigger: ${trigger.keywords.join(', ')}`);
        detail = 'escalado a humano';
        break;
      }
    }

    appendLog({ userId, triggerId: trigger.id, action: trigger.action, executedAt: new Date().toISOString() });
    audit({
      action: 'BOT_REPLY',
      outcome: detail?.includes('fallo') ? 'failure' : 'success',
      targetUserId: userId,
      contentSummary: `DMTrigger: ${trigger.keywords.join('|')} → ${trigger.action}`,
      reason: detail,
      dryRun: false,
    });

    results.push({ triggered: true, triggerId: trigger.id, action: trigger.action, detail });
  }

  return results;
};

export const getStats = (): {
  totalTriggers: number;
  activeTriggers: number;
  totalExecutions: number;
  todayExecutions: number;
} => {
  const triggers = loadTriggers();
  const log = loadLog();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return {
    totalTriggers: triggers.length,
    activeTriggers: triggers.filter((t) => t.active).length,
    totalExecutions: log.length,
    todayExecutions: log.filter((l) => new Date(l.executedAt) > dayAgo).length,
  };
};
