import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type Channel = 'dm' | 'comentario';

export interface ConversationTurn {
  rol: 'usuario' | 'marca' | 'bot';
  texto: string;
  timestamp: string;
  postId?: string;
}

export interface UserContext {
  userId: string;
  handle: string;
  channel: Channel;
  primerContacto: string;
  ultimoContacto: string;
  mensajesTotales: number;
  autoRepliesEnviados: number;
  autoRepliesPorDia: Record<string, number>;
  intentHistory: string[];
  escaladoAHumano: boolean;
  notas: string;
  turnos: ConversationTurn[];
}

const DIR = resolve('data/runtime/conversations');
const MAX_TURNS_PERSISTED = 30;

const filePath = (userId: string): string => resolve(DIR, `${userId.replace(/[^a-z0-9_-]/gi, '_')}.json`);

const today = (): string => new Date().toISOString().split('T')[0]!;

export const loadContext = (userId: string): UserContext | null => {
  const fp = filePath(userId);
  if (!existsSync(fp)) return null;
  return JSON.parse(readFileSync(fp, 'utf-8')) as UserContext;
};

export const upsertContext = (userId: string, handle: string, channel: Channel): UserContext => {
  mkdirSync(dirname(filePath(userId)), { recursive: true });
  const existing = loadContext(userId);
  if (existing) {
    existing.ultimoContacto = new Date().toISOString();
    existing.handle = handle;
    return existing;
  }
  const fresh: UserContext = {
    userId,
    handle,
    channel,
    primerContacto: new Date().toISOString(),
    ultimoContacto: new Date().toISOString(),
    mensajesTotales: 0,
    autoRepliesEnviados: 0,
    autoRepliesPorDia: {},
    intentHistory: [],
    escaladoAHumano: false,
    notas: '',
    turnos: [],
  };
  writeFileSync(filePath(userId), JSON.stringify(fresh, null, 2), 'utf-8');
  return fresh;
};

export const persistContext = (ctx: UserContext): void => {
  ctx.turnos = ctx.turnos.slice(-MAX_TURNS_PERSISTED);
  writeFileSync(filePath(ctx.userId), JSON.stringify(ctx, null, 2), 'utf-8');
};

export const recordIncomingMessage = (
  userId: string,
  handle: string,
  channel: Channel,
  texto: string,
  postId?: string,
): UserContext => {
  const ctx = upsertContext(userId, handle, channel);
  ctx.mensajesTotales += 1;
  ctx.turnos.push({
    rol: 'usuario',
    texto,
    timestamp: new Date().toISOString(),
    ...(postId ? { postId } : {}),
  });
  persistContext(ctx);
  return ctx;
};

export const recordOutgoingReply = (
  userId: string,
  texto: string,
  byBot: boolean,
  intent?: string,
): UserContext | null => {
  const ctx = loadContext(userId);
  if (!ctx) return null;
  ctx.turnos.push({
    rol: byBot ? 'bot' : 'marca',
    texto,
    timestamp: new Date().toISOString(),
  });
  if (byBot) {
    const day = today();
    ctx.autoRepliesEnviados += 1;
    ctx.autoRepliesPorDia[day] = (ctx.autoRepliesPorDia[day] ?? 0) + 1;
  }
  if (intent) ctx.intentHistory.push(intent);
  persistContext(ctx);
  return ctx;
};

export const escalateToHuman = (userId: string, motivo: string): void => {
  const ctx = loadContext(userId);
  if (!ctx) return;
  ctx.escaladoAHumano = true;
  ctx.notas = `${ctx.notas}\n[${new Date().toISOString()}] Escalado: ${motivo}`.trim();
  persistContext(ctx);
};

export const autoRepliesToday = (ctx: UserContext): number => ctx.autoRepliesPorDia[today()] ?? 0;

export const recentTurnsFormatted = (ctx: UserContext, max = 10): string =>
  ctx.turnos
    .slice(-max)
    .map((t) => `${t.rol === 'usuario' ? `${ctx.handle}` : t.rol === 'bot' ? 'Bot' : 'Marca'}: ${t.texto}`)
    .join('\n');

export const listAllContexts = (): UserContext[] => {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(resolve(DIR, f), 'utf-8')) as UserContext);
};
