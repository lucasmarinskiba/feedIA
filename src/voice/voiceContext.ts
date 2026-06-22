/**
 * Voice Context — Multi-turn conversation memory for Hands-Free mode
 * ─────────────────────────────────────────────────────────────────────────
 * Persiste el historial de conversación por sesión de voz para que Talía
 * recuerde el contexto entre comandos consecutivos.
 *
 * Ejemplo de multi-turn:
 *   Usuario: "Planificá la semana"
 *   Talía:  "Listo, preparé 5 posts..."
 *   Usuario: "Y ahora creá un reel sobre el primero"
 *   → Talía entiende que "el primero" se refiere al primer post del plan.
 */

import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';

const CONTEXT_DIR = resolve('data/runtime/voice-contexts');
const MAX_HISTORY = 20;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionType?: string;
}

export interface VoiceContext {
  sessionId: string;
  turns: ConversationTurn[];
  lastActivity: string;
  confirmedIntents: string[]; // intents que ya fueron confirmados en esta sesión
  pendingConfirmation?: {
    intentJson: string;
    askedAt: string;
  };
}

const contextPath = (id: string): string => resolve(CONTEXT_DIR, `${id}.json`);

const loadContext = (id: string): VoiceContext | null => {
  const p = contextPath(id);
  if (!existsSync(p)) return null;
  try {
    const ctx = JSON.parse(readFileSync(p, 'utf-8')) as VoiceContext;
    // Check TTL
    const inactive = Date.now() - new Date(ctx.lastActivity).getTime();
    if (inactive > SESSION_TTL_MS) return null;
    return ctx;
  } catch {
    return null;
  }
};

const saveContext = (ctx: VoiceContext): void => {
  mkdirSync(CONTEXT_DIR, { recursive: true });
  ctx.lastActivity = new Date().toISOString();
  writeFileSync(contextPath(ctx.sessionId), JSON.stringify(ctx, null, 2), 'utf-8');
};

export const getOrCreateContext = (sessionId: string): VoiceContext => {
  const existing = loadContext(sessionId);
  if (existing) return existing;
  return {
    sessionId,
    turns: [],
    lastActivity: new Date().toISOString(),
    confirmedIntents: [],
  };
};

export const addTurn = (ctx: VoiceContext, turn: Omit<ConversationTurn, 'timestamp'>): VoiceContext => {
  ctx.turns.push({ ...turn, timestamp: new Date().toISOString() });
  if (ctx.turns.length > MAX_HISTORY) ctx.turns = ctx.turns.slice(-MAX_HISTORY);
  saveContext(ctx);
  return ctx;
};

export const setPendingConfirmation = (ctx: VoiceContext, intentJson: string): void => {
  ctx.pendingConfirmation = { intentJson, askedAt: new Date().toISOString() };
  saveContext(ctx);
};

export const clearPendingConfirmation = (ctx: VoiceContext): void => {
  ctx.pendingConfirmation = undefined;
  saveContext(ctx);
};

export const markConfirmed = (ctx: VoiceContext, actionType: string): void => {
  ctx.confirmedIntents.push(actionType);
  clearPendingConfirmation(ctx);
  saveContext(ctx);
};

export const getPendingConfirmation = (ctx: VoiceContext): { intent: unknown; askedAt: string } | null => {
  if (!ctx.pendingConfirmation) return null;
  try {
    return {
      intent: JSON.parse(ctx.pendingConfirmation.intentJson),
      askedAt: ctx.pendingConfirmation.askedAt,
    };
  } catch {
    return null;
  }
};

export const buildContextualGoal = (ctx: VoiceContext, newUserText: string): string => {
  // Build a rich prompt that includes recent conversation history
  const recent = ctx.turns.slice(-6);
  if (recent.length === 0) return newUserText;

  const historyLines = recent.map((t) => `${t.role === 'user' ? 'Usuario' : 'Talía'}: ${t.content}`).join('\n');
  return `Contexto de la conversación:\n${historyLines}\n\nNuevo pedido del usuario: ${newUserText}`;
};

export const listActiveSessions = (): string[] => {
  if (!existsSync(CONTEXT_DIR)) return [];
  const files = readdirSync(CONTEXT_DIR) as string[];
  return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
};
