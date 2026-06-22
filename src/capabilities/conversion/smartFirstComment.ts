/**
 * Smart First Comment
 *
 * Publica automáticamente el primer comentario en posts recientes
 * con CTAs estratégicos que aumentan engagement y conversiones.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { commentOnPost } from '../../integrations/meta.js';
import { recordAction, checkRateLimit } from '../../compliance/rateLimiter.js';
import { audit } from '../../compliance/auditLog.js';

const CONFIG_FILE = resolve('data/runtime/smart-first-comment.json');
const LOG_FILE = resolve('data/runtime/smart-first-comment-log.json');

export type ContentType = 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'all';

export interface FirstCommentTemplate {
  id: string;
  contentTypes: ContentType[];
  messages: string[];
  active: boolean;
  rotateMode: 'sequential' | 'random';
  currentIndex: number;
  createdAt: string;
}

interface CommentLog {
  postId: string;
  templateId: string;
  message: string;
  sentAt: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadConfig = (): FirstCommentTemplate[] => {
  if (!existsSync(CONFIG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as FirstCommentTemplate[];
  } catch {
    return [];
  }
};

const saveConfig = (config: FirstCommentTemplate[]): void => {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
};

const loadLog = (): CommentLog[] => {
  if (!existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf-8')) as CommentLog[];
  } catch {
    return [];
  }
};

const appendLog = (entry: CommentLog): void => {
  ensureDir();
  const log = loadLog();
  log.push(entry);
  writeFileSync(LOG_FILE, JSON.stringify(log.slice(-500), null, 2), 'utf-8');
};

export const listTemplates = (): FirstCommentTemplate[] => loadConfig();

export const addTemplate = (
  template: Omit<FirstCommentTemplate, 'id' | 'currentIndex' | 'createdAt'>,
): FirstCommentTemplate => {
  const config = loadConfig();
  const newTemplate: FirstCommentTemplate = {
    ...template,
    id: `sfc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    currentIndex: 0,
    createdAt: new Date().toISOString(),
  };
  config.push(newTemplate);
  saveConfig(config);
  log.success(`[SmartFirstComment] Template creado: ${newTemplate.id}`);
  return newTemplate;
};

export const updateTemplate = (
  id: string,
  partial: Partial<Omit<FirstCommentTemplate, 'id' | 'createdAt'>>,
): FirstCommentTemplate | undefined => {
  const config = loadConfig();
  const idx = config.findIndex((t) => t.id === id);
  if (idx < 0) return undefined;
  const updated = { ...config[idx], ...partial } as FirstCommentTemplate;
  config[idx] = updated;
  saveConfig(config);
  return updated;
};

export const deleteTemplate = (id: string): boolean => {
  const config = loadConfig();
  const filtered = config.filter((t) => t.id !== id);
  if (filtered.length === config.length) return false;
  saveConfig(filtered);
  return true;
};

const pickMessage = (template: FirstCommentTemplate): string => {
  if (template.messages.length === 0) return '';
  if (template.rotateMode === 'random') {
    return template.messages[Math.floor(Math.random() * template.messages.length)] ?? '';
  }
  const msg = template.messages[template.currentIndex] ?? template.messages[0] ?? '';
  template.currentIndex = (template.currentIndex + 1) % template.messages.length;
  saveConfig(loadConfig()); // save updated index
  return msg;
};

/**
 * Publica el primer comentario inteligente en un post.
 * Se llama automáticamente después de publicar contenido.
 */
export const postFirstComment = async (
  postId: string,
  contentType: ContentType,
): Promise<{ sent: boolean; message?: string; reason?: string }> => {
  const templates = loadConfig().filter(
    (t) => t.active && (t.contentTypes.includes(contentType) || t.contentTypes.includes('all')),
  );
  if (templates.length === 0) {
    return { sent: false, reason: 'no hay templates activos para este tipo de contenido' };
  }

  // Rate limiting
  const rateCheck = checkRateLimit('reply_comment', 'smart-first-comment');
  if (!rateCheck.allowed) {
    return { sent: false, reason: `rate limit: ${rateCheck.reason}` };
  }

  // Pick first matching template
  const template = templates[0];
  if (!template) {
    return { sent: false, reason: 'no hay template disponible' };
  }

  const message = pickMessage(template);
  if (!message) {
    return { sent: false, reason: 'template sin mensajes configurados' };
  }

  const result = await commentOnPost(postId, message);
  if (result.ok) {
    recordAction('reply_comment', 'smart-first-comment');
    appendLog({ postId, templateId: template.id, message, sentAt: new Date().toISOString() });
    audit({
      action: 'REPLY_COMMENT',
      outcome: 'success',
      targetContentId: postId,
      contentSummary: `SmartFirstComment: ${message.slice(0, 50)}...`,
      dryRun: false,
    });
    log.success(`[SmartFirstComment] Comentario publicado en ${postId}`);
    return { sent: true, message };
  } else {
    log.error(`[SmartFirstComment] Fallo al comentar en ${postId}: ${result.error}`);
    return { sent: false, reason: result.error };
  }
};

export const getStats = (): {
  totalTemplates: number;
  activeTemplates: number;
  totalSent: number;
  sentToday: number;
} => {
  const templates = loadConfig();
  const log = loadLog();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return {
    totalTemplates: templates.length,
    activeTemplates: templates.filter((t) => t.active).length,
    totalSent: log.length,
    sentToday: log.filter((l) => new Date(l.sentAt) > dayAgo).length,
  };
};
