/**
 * Conversation Export — Exporta sesiones de voz a formatos reutilizables
 * ─────────────────────────────────────────────────────────────────────────
 * Formatos soportados:
 *   • JSON — estructura completa con metadata
 *   • Markdown — transcript human-readable
 *   • TXT — solo texto plano
 *   • CSV — para análisis en Excel/Sheets
 */

import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { log } from '../agent/logger.js';
import { getOrCreateContext, listActiveSessions } from './voiceContext.js';

export type ExportFormat = 'json' | 'markdown' | 'txt' | 'csv';

export interface ExportOptions {
  sessionId?: string;
  format?: ExportFormat;
  includeMetadata?: boolean;
}

const EXPORT_DIR = resolve('data/runtime/voice-exports');

/* ── Export Engine ───────────────────────────────────────────────────────── */

export const exportConversation = (opts: ExportOptions = {}): { path: string; content: string } => {
  const format = opts.format ?? 'markdown';
  const sessions = opts.sessionId ? [opts.sessionId] : listActiveSessions().slice(-10);

  let content: string;
  switch (format) {
    case 'json':
      content = exportAsJSON(sessions, opts.includeMetadata ?? true);
      break;
    case 'csv':
      content = exportAsCSV(sessions);
      break;
    case 'txt':
      content = exportAsTXT(sessions);
      break;
    case 'markdown':
    default:
      content = exportAsMarkdown(sessions);
      break;
  }

  mkdirSync(EXPORT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `voice-export-${opts.sessionId ?? 'all'}-${timestamp}.${format === 'markdown' ? 'md' : format}`;
  const filePath = resolve(EXPORT_DIR, fileName);
  writeFileSync(filePath, content, 'utf-8');

  log.info(`[ConversationExport] Exportado: ${filePath}`);
  return { path: filePath, content };
};

/* ── Formatters ──────────────────────────────────────────────────────────── */

const exportAsJSON = (sessionIds: string[], includeMetadata: boolean): string => {
  const data = sessionIds.map((sid) => {
    const ctx = getOrCreateContext(sid);
    return {
      sessionId: sid,
      ...(includeMetadata && {
        totalTurns: ctx.turns.length,
        lastActivity: ctx.lastActivity,
      }),
      turns: ctx.turns.map((t) => ({
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
        actionType: t.actionType,
      })),
    };
  });
  return JSON.stringify(data, null, 2);
};

const exportAsMarkdown = (sessionIds: string[]): string => {
  const lines: string[] = ['# Conversación de Voz\n'];
  for (const sid of sessionIds) {
    const ctx = getOrCreateContext(sid);
    lines.push(`## Sesión: ${sid}\n`);
    lines.push(`_Turnos: ${ctx.turns.length} | Última actividad: ${ctx.lastActivity}_\n`);
    for (const turn of ctx.turns) {
      const prefix = turn.role === 'user' ? '**Usuario**' : '**Talía**';
      lines.push(`${prefix}: ${turn.content}\n`);
    }
    lines.push('---\n');
  }
  return lines.join('\n');
};

const exportAsTXT = (sessionIds: string[]): string => {
  const lines: string[] = [];
  for (const sid of sessionIds) {
    const ctx = getOrCreateContext(sid);
    lines.push(`=== Sesión: ${sid} ===`);
    for (const turn of ctx.turns) {
      const prefix = turn.role === 'user' ? 'U' : 'T';
      lines.push(`[${prefix}] ${turn.content}`);
    }
    lines.push('');
  }
  return lines.join('\n');
};

const exportAsCSV = (sessionIds: string[]): string => {
  const rows: string[] = ['sessionId,turn,role,content,timestamp,actionType'];
  for (const sid of sessionIds) {
    const ctx = getOrCreateContext(sid);
    for (const [idx, turn] of ctx.turns.entries()) {
      const content = `"${turn.content.replace(/"/g, '""').slice(0, 500)}"`;
      rows.push(`${sid},${idx},${turn.role},${content},${turn.timestamp},${turn.actionType ?? ''}`);
    }
  }
  return rows.join('\n');
};

/* ── Batch Export ────────────────────────────────────────────────────────── */

export const exportAllConversations = (): string[] => {
  const formats: ExportFormat[] = ['json', 'markdown', 'csv'];
  const paths: string[] = [];
  for (const format of formats) {
    const result = exportConversation({ format });
    paths.push(result.path);
  }
  return paths;
};
