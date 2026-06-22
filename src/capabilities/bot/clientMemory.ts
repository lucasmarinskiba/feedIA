/**
 * Client Memory — memoria a largo plazo por usuario/cliente para respuestas personalizadas.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const MEMORY_DIR = join(process.cwd(), 'data', 'runtime', 'client-memory');

export const ClientMemorySchema = z.object({
  userId: z.string(),
  updatedAt: z.string(),
  preferences: z.record(z.string()).default({}),
  interactionHistory: z
    .array(
      z.object({
        date: z.string(),
        channel: z.enum(['dm', 'comment', 'story_reply', 'email']),
        intent: z.string(),
        summary: z.string(),
      }),
    )
    .default([]),
  objections: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  stage: z.enum(['nuevo', 'conocedor', 'interesado', 'negociacion', 'cliente', 'recurrente']).default('nuevo'),
  notes: z.array(z.string()).default([]),
  crmSyncedAt: z.string().optional(),
});

export type ClientMemory = z.infer<typeof ClientMemorySchema>;

const ensureDir = (): void => {
  if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
};

const memoryPath = (userId: string): string => join(MEMORY_DIR, `${sanitize(userId)}.json`);

const sanitize = (userId: string): string => userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);

export const getClientMemory = (userId: string): ClientMemory => {
  ensureDir();
  const path = memoryPath(userId);
  if (!existsSync(path)) {
    return {
      userId,
      updatedAt: new Date().toISOString(),
      preferences: {},
      interactionHistory: [],
      objections: [],
      interests: [],
      stage: 'nuevo',
      notes: [],
    };
  }
  try {
    return ClientMemorySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return {
      userId,
      updatedAt: new Date().toISOString(),
      preferences: {},
      interactionHistory: [],
      objections: [],
      interests: [],
      stage: 'nuevo',
      notes: [],
    };
  }
};

const saveMemory = (memory: ClientMemory): void => {
  ensureDir();
  memory.updatedAt = new Date().toISOString();
  writeFileSync(memoryPath(memory.userId), JSON.stringify(memory, null, 2), 'utf8');
};

export const updateClientMemory = (
  userId: string,
  patch: Partial<Pick<ClientMemory, 'preferences' | 'stage' | 'interests' | 'objections' | 'notes'>>,
): ClientMemory => {
  const memory = getClientMemory(userId);
  if (patch.preferences) Object.assign(memory.preferences, patch.preferences);
  if (patch.stage) memory.stage = patch.stage;
  if (patch.interests) memory.interests = Array.from(new Set([...memory.interests, ...patch.interests]));
  if (patch.objections) memory.objections = Array.from(new Set([...memory.objections, ...patch.objections]));
  if (patch.notes) memory.notes = [...memory.notes, ...patch.notes];
  saveMemory(memory);
  return memory;
};

export const recordInteraction = (
  userId: string,
  interaction: {
    channel: ClientMemory['interactionHistory'][number]['channel'];
    intent: string;
    summary: string;
  },
): ClientMemory => {
  const memory = getClientMemory(userId);
  memory.interactionHistory.push({
    date: new Date().toISOString(),
    channel: interaction.channel,
    intent: interaction.intent,
    summary: interaction.summary,
  });
  // Mantener últimos 50
  if (memory.interactionHistory.length > 50) {
    memory.interactionHistory = memory.interactionHistory.slice(-50);
  }
  saveMemory(memory);
  return memory;
};

export const buildMemoryContext = (userId: string): string => {
  const memory = getClientMemory(userId);
  const lines: string[] = [];
  lines.push(`Etapa del cliente: ${memory.stage}`);
  if (memory.interests.length > 0) lines.push(`Intereses: ${memory.interests.join(', ')}`);
  if (memory.objections.length > 0) lines.push(`Objeciones previas: ${memory.objections.join(', ')}`);
  if (Object.keys(memory.preferences).length > 0) {
    lines.push(
      `Preferencias: ${Object.entries(memory.preferences)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );
  }
  if (memory.interactionHistory.length > 0) {
    const last = memory.interactionHistory[memory.interactionHistory.length - 1];
    lines.push(`Última interacción (${last?.date.split('T')[0]}): ${last?.summary}`);
  }
  return lines.join('\n');
};
