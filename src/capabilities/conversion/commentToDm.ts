/**
 * Comment-to-DM Automation
 *
 * Cuando un usuario comenta ciertas palabras clave en un post,
 * el sistema le envía un DM automático con un recurso, link o mensaje.
 *
 * Ejemplo: usuario comenta "INFO" → recibe DM con guía descargable.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendDm } from '../../integrations/meta.js';
import { recordAction, checkRateLimit } from '../../compliance/rateLimiter.js';
import { audit } from '../../compliance/auditLog.js';
import { addOrUpdateLead } from '../sales/pipeline.js';
import { recordAttribution } from '../sales/attribution.js';

const RULES_FILE = resolve('data/runtime/comment-to-dm-rules.json');
const LOG_FILE = resolve('data/runtime/comment-to-dm-log.json');

export interface CommentToDmRule {
  id: string;
  keyword: string; // e.g. "INFO", "GUÍA", "LINK"
  dmMessage: string;
  active: boolean;
  cooldownHours: number; // cooldown per user
  maxDmsPerDay: number;
  createdAt: string;
}

interface SentLog {
  userId: string;
  ruleId: string;
  postId?: string;
  sentAt: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadRules = (): CommentToDmRule[] => {
  if (!existsSync(RULES_FILE)) return [];
  try {
    return JSON.parse(readFileSync(RULES_FILE, 'utf-8')) as CommentToDmRule[];
  } catch {
    return [];
  }
};

const saveRules = (rules: CommentToDmRule[]): void => {
  ensureDir();
  writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
};

const loadLog = (): SentLog[] => {
  if (!existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf-8')) as SentLog[];
  } catch {
    return [];
  }
};

const appendLog = (entry: SentLog): void => {
  ensureDir();
  const log = loadLog();
  log.push(entry);
  writeFileSync(LOG_FILE, JSON.stringify(log.slice(-1000), null, 2), 'utf-8');
};

export const listRules = (): CommentToDmRule[] => loadRules();

export const addRule = (rule: Omit<CommentToDmRule, 'id' | 'createdAt'>): CommentToDmRule => {
  const rules = loadRules();
  const newRule: CommentToDmRule = {
    ...rule,
    id: `ctdm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  rules.push(newRule);
  saveRules(rules);
  log.success(`[CommentToDm] Regla creada: ${newRule.keyword}`);
  return newRule;
};

export const updateRule = (
  id: string,
  partial: Partial<Omit<CommentToDmRule, 'id' | 'createdAt'>>,
): CommentToDmRule | undefined => {
  const rules = loadRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx < 0) return undefined;
  const updated = { ...rules[idx], ...partial } as CommentToDmRule;
  rules[idx] = updated;
  saveRules(rules);
  return updated;
};

export const deleteRule = (id: string): boolean => {
  const rules = loadRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  saveRules(filtered);
  return true;
};

const shouldSendToUser = (userId: string, rule: CommentToDmRule): boolean => {
  const log = loadLog();
  const cutoff = new Date(Date.now() - rule.cooldownHours * 3600_000);
  const recent = log.filter((l) => l.userId === userId && l.ruleId === rule.id && new Date(l.sentAt) > cutoff);
  return recent.length === 0;
};

const getDailyCountForRule = (ruleId: string): number => {
  const log = loadLog();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return log.filter((l) => l.ruleId === ruleId && new Date(l.sentAt) > dayAgo).length;
};

/**
 * Evalúa un comentario entrante y envía DM si hay match con una regla activa.
 * Retorna información sobre qué se hizo.
 */
export const evaluateComment = async (
  userId: string,
  commentText: string,
  postId?: string,
): Promise<{ sent: boolean; ruleId?: string; reason?: string }> => {
  const rules = loadRules().filter((r) => r.active);
  if (rules.length === 0) return { sent: false, reason: 'no hay reglas activas' };

  const lowerComment = commentText.toLowerCase();

  for (const rule of rules) {
    const keywords = rule.keyword.split(',').map((k) => k.trim().toLowerCase());
    const match = keywords.some((k) => lowerComment.includes(k));
    if (!match) continue;

    // Rate limiting global
    const rateCheck = checkRateLimit('send_dm', 'comment-to-dm');
    if (!rateCheck.allowed) {
      return { sent: false, reason: `rate limit: ${rateCheck.reason}` };
    }

    // Max DMs per day for this rule
    if (getDailyCountForRule(rule.id) >= rule.maxDmsPerDay) {
      return { sent: false, reason: `límite diario alcanzado para regla ${rule.id}` };
    }

    // Cooldown per user
    if (!shouldSendToUser(userId, rule)) {
      return { sent: false, reason: `cooldown activo para usuario ${userId}` };
    }

    // Send DM
    const result = await sendDm(userId, rule.dmMessage);
    if (result.ok) {
      recordAction('send_dm', 'comment-to-dm');
      appendLog({ userId, ruleId: rule.id, postId, sentAt: new Date().toISOString() });
      audit({
        action: 'SEND_DM',
        outcome: 'success',
        targetUserId: userId,
        targetContentId: postId,
        contentSummary: `CommentToDm: keyword="${rule.keyword}"`,
        dryRun: false,
      });
      addOrUpdateLead(userId, {
        source: `comment-to-dm:${rule.keyword}`,
        stage: 'nuevo',
        score: 30,
        notes: [`Activado por comentario "${commentText.slice(0, 100)}" en post ${postId ?? 'unknown'}`],
      });
      if (postId) {
        recordAttribution({
          leadId: userId,
          handle: userId,
          contentId: postId,
          contentType: 'post-imagen',
          touchpoint: 'comment',
        });
      }
      log.success(`[CommentToDm] DM enviado a ${userId} por keyword "${rule.keyword}"`);
      return { sent: true, ruleId: rule.id };
    } else {
      log.error(`[CommentToDm] Fallo al enviar DM a ${userId}: ${result.error}`);
      return { sent: false, reason: result.error };
    }
  }

  return { sent: false, reason: 'ninguna keyword matcheó' };
};

export const getStats = (): {
  totalRules: number;
  activeRules: number;
  totalSent: number;
  sentToday: number;
} => {
  const rules = loadRules();
  const log = loadLog();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.active).length,
    totalSent: log.length,
    sentToday: log.filter((l) => new Date(l.sentAt) > dayAgo).length,
  };
};
