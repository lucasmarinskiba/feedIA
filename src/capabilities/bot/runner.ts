import { fetchInbound, replyToComment, sendDm, type MetaInbound } from '../../integrations/meta.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import { emit } from '../../agent/bus.js';
import type { BrandProfile } from '../../config/types.js';
import {
  evaluate as complianceEvaluate,
  recordSuccess as complianceRecordSuccess,
  recordFailure as complianceRecordFailure,
  type GuardianContext,
} from '../../compliance/index.js';
import { recordOutgoingReply, escalateToHuman, type Channel } from './conversationMemory.js';
import { generateSmartReply, type SmartReplyOutput } from '../replies/unifiedReplyOrchestrator.js';
import { evaluateComment, evaluateDm } from '../conversion/index.js';

const SINCE_FILE_KEY = 'lastBotPoll';
const sinceMemory: Record<string, string> = {};

const channelFromInbound = (inbound: MetaInbound): Channel => (inbound.type === 'dm' ? 'dm' : 'comentario');

export interface ProcessedItem {
  inbound: MetaInbound;
  outcome: SmartReplyOutput;
  envioOk?: boolean;
}

export const processInbound = async (brand: BrandProfile, inbound: MetaInbound): Promise<ProcessedItem> => {
  const channel = channelFromInbound(inbound);

  const outcome = await generateSmartReply({
    userId: inbound.remitente,
    handle: inbound.remitente,
    channel,
    message: inbound.texto,
    brand,
    postId: inbound.postId,
    ...(inbound.postId
      ? {
          postContext: {
            postId: inbound.postId,
            tipo: 'post',
            resumenContenido: '(contexto del post no disponible vía API en esta versión)',
          },
        }
      : {}),
  });

  if (outcome.escalated) {
    escalateToHuman(
      inbound.remitente,
      `Intent=${outcome.intent} confianza=${outcome.confidence} source=${outcome.source}`,
    );
  }

  // Evaluate comment-to-DM triggers for comments
  if (channel === 'comentario') {
    const ctdResult = await evaluateComment(inbound.remitente, inbound.texto, inbound.postId);
    if (ctdResult.sent) {
      log.success(`[CommentToDm] Activado para ${inbound.remitente}`);
    }
  }

  // Evaluate DM keyword triggers for DMs
  if (channel === 'dm') {
    const dmResults = await evaluateDm(inbound.remitente, inbound.texto);
    const triggered = dmResults.filter((r) => r.triggered);
    if (triggered.length > 0) {
      log.success(`[DMTrigger] ${triggered.length} triggers activados para ${inbound.remitente}`);
    }
  }

  if (!outcome.sent) {
    log.warn(
      `Sin auto-reply para ${inbound.remitente}: ${
        outcome.blocked
          ? `bloqueado: ${outcome.rails?.motivos.join('+') ?? 'rails'}`
          : outcome.escalated
            ? `escalado source=${outcome.source}`
            : 'desconocido'
      }`,
    );
    return { inbound, outcome };
  }

  const reply = outcome.reply;

  // Verificación adicional de compliance antes de enviar
  const complianceCtx: GuardianContext = {
    actor: 'bot:auto-reply',
    targetIgUserId: inbound.remitente,
    targetContentId: inbound.postId ?? inbound.id,
    contentText: reply,
    humanInitiated: false,
  };
  const complianceDecision = complianceEvaluate(
    channel === 'comentario' ? 'bot_auto_reply' : 'bot_auto_reply',
    complianceCtx,
  );

  if (!complianceDecision.allowed) {
    log.error(`[COMPLIANCE] Bot reply bloqueado: ${complianceDecision.reason}`);
    escalateToHuman(inbound.remitente, `Bloqueado por compliance: ${complianceDecision.reason}`);
    return { inbound, outcome, envioOk: false };
  }

  let envioOk = false;
  if (channel === 'comentario' && inbound.id) {
    const r = await replyToComment(inbound.id, reply);
    envioOk = r.ok;
  } else {
    const r = await sendDm(inbound.remitente, reply);
    envioOk = r.ok;
  }
  if (envioOk) {
    recordOutgoingReply(inbound.remitente, reply, true, outcome.intent);
    complianceRecordSuccess('bot_auto_reply', complianceCtx, inbound.id);
    log.success(`Auto-reply enviado a ${inbound.remitente} (intent=${outcome.intent})`);
  } else {
    complianceRecordFailure('bot_auto_reply', complianceCtx, 'Fallo en envío a Meta API');
  }
  return { inbound, outcome, envioOk };
};

export const runOnce = async (brand: BrandProfile): Promise<ProcessedItem[]> => {
  const since = sinceMemory[SINCE_FILE_KEY] ?? new Date(Date.now() - 3600_000).toISOString();
  const items = await fetchInbound(since);
  sinceMemory[SINCE_FILE_KEY] = new Date().toISOString();
  log.info(`Bot: ${items.length} mensajes/comentarios entrantes desde ${since}`);
  const out: ProcessedItem[] = [];
  for (const it of items) {
    const processed = await processInbound(brand, it);
    out.push(processed);
    // Emitir evento para triggers automáticos
    emit({
      type: 'inbound_message_received',
      priority: 'normal',
      correlationId: `bot-poll-${Date.now()}`,
      payload: { type: it.type, text: it.texto, sender: it.remitente, postId: it.postId },
    });
  }
  return out;
};

export interface RunOptions {
  iteraciones?: number;
  onIteration?: (n: number, processed: ProcessedItem[]) => void;
}

export const runLoop = async (brand: BrandProfile, opts: RunOptions = {}): Promise<void> => {
  const intervalMs = env.bot.pollIntervalSeconds * 1000;
  const max = opts.iteraciones ?? Infinity;
  let n = 0;
  while (n < max) {
    n += 1;
    log.step(`Bot iteración ${n} (cada ${env.bot.pollIntervalSeconds}s)`);
    const processed = await runOnce(brand);
    opts.onIteration?.(n, processed);
    if (n < max) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
};

export const simulateInbound = async (
  brand: BrandProfile,
  fakeItems: Array<{ remitente: string; mensaje: string; canal: Channel; postId?: string }>,
): Promise<ProcessedItem[]> => {
  const out: ProcessedItem[] = [];
  for (const f of fakeItems) {
    const inbound: MetaInbound = {
      type: f.canal === 'dm' ? 'dm' : 'comentario',
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      remitente: f.remitente,
      texto: f.mensaje,
      ...(f.postId ? { postId: f.postId } : {}),
      recibidoEn: new Date().toISOString(),
    };
    out.push(await processInbound(brand, inbound));
  }
  return out;
};
