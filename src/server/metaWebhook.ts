import { createHmac, timingSafeEqual } from 'node:crypto';
import { processInbound } from '../capabilities/bot/index.js';
import { ejecutarCrisisCheck } from '../capabilities/crisis/index.js';
import { sendAlert } from '../integrations/notifications.js';
import { log } from '../agent/logger.js';
import { emit, emitLeadHotAlert, emitCrisisDetected, emitViralOpportunity } from '../agent/bus.js';
import type { BrandProfile } from '../config/types.js';
import type { MetaInbound } from '../integrations/meta.js';
import type { RouteHandler } from './http.js';
import { json, text } from './http.js';

interface MetaChangeValue {
  from?: { id: string; username?: string };
  text?: string;
  message?: string;
  comment_id?: string;
  media?: { id: string };
  id?: string;
}

interface MetaChange {
  field: string;
  value: MetaChangeValue;
}

interface MetaEntry {
  id: string;
  time: number;
  changes?: MetaChange[];
  messaging?: Array<{
    sender?: { id: string };
    message?: { text?: string; mid?: string };
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaEntry[];
}

const verifySignature = (rawBody: Buffer, signatureHeader: string, appSecret: string): boolean => {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const expected = signatureHeader.slice('sha256='.length);
  const hmac = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  if (hmac.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
};

const recentCommentsByPost = new Map<string, string[]>();
const COMMENT_BUFFER_MAX = 25;

const captureForCrisis = (postId: string, texto: string): void => {
  const list = recentCommentsByPost.get(postId) ?? [];
  list.push(texto);
  while (list.length > COMMENT_BUFFER_MAX) list.shift();
  recentCommentsByPost.set(postId, list);
};

const shouldRunCrisisCheck = (postId: string): boolean => {
  const list = recentCommentsByPost.get(postId) ?? [];
  return list.length >= 5 && list.length % 5 === 0;
};

const changeToInbound = (entry: MetaEntry, change: MetaChange): MetaInbound | null => {
  const { value, field } = change;
  const recibidoEn = new Date(entry.time * 1000).toISOString();
  if (field === 'comments') {
    if (!value.comment_id || !value.text) return null;
    const inbound: MetaInbound = {
      type: 'comentario',
      id: value.comment_id,
      remitente: value.from?.username ?? value.from?.id ?? 'desconocido',
      texto: value.text,
      recibidoEn,
      ...(value.media?.id ? { postId: value.media.id } : {}),
    };
    return inbound;
  }
  if (field === 'mentions') {
    if (!value.id || !value.text) return null;
    const inbound: MetaInbound = {
      type: 'mencion',
      id: value.id,
      remitente: value.from?.username ?? value.from?.id ?? 'desconocido',
      texto: value.text,
      recibidoEn,
      ...(value.media?.id ? { postId: value.media.id } : {}),
    };
    return inbound;
  }
  return null;
};

const messagingToInbound = (entry: MetaEntry, msg: NonNullable<MetaEntry['messaging']>[number]): MetaInbound | null => {
  if (!msg.sender?.id || !msg.message?.text) return null;
  return {
    type: 'dm',
    id: msg.message.mid ?? `${entry.id}-${entry.time}`,
    remitente: msg.sender.id,
    texto: msg.message.text,
    recibidoEn: new Date(entry.time * 1000).toISOString(),
  };
};

/**
 * Router inteligente post-procesamiento.
 * Emite eventos al bus para que agentes especializados actúen.
 */
const routeToAgents = (texto: string, tipo: string, remitente: string, postId?: string): void => {
  const lower = texto.toLowerCase();
  const correlationId = `webhook-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Lead hot signals
  const hotSignals = [
    'quiero comprar',
    'cuánto cuesta',
    'precio',
    'me interesa',
    'cómo contrato',
    'cómo accedo',
    'dónde pago',
    'reservar',
  ];
  if (hotSignals.some((s) => lower.includes(s))) {
    emitLeadHotAlert(remitente, 75, correlationId);
  }

  // Crisis signals in comments/mentions
  const crisisSignals = [
    'estafa',
    'fraude',
    'mentira',
    'denuncia',
    'abogado',
    'demanda',
    'devuelvan mi plata',
    'estafadores',
  ];
  if ((tipo === 'comentario' || tipo === 'mencion') && crisisSignals.some((s) => lower.includes(s))) {
    emitCrisisDetected(postId ?? 'unknown', 'high', correlationId);
  }

  // Viral opportunity signals (trending topics in DMs asking about something)
  if (tipo === 'dm' && lower.includes('tendencia') && lower.includes('reel')) {
    emitViralOpportunity(lower.replace(/[^a-záéíóúñ\s]/g, '').slice(0, 50), 60, correlationId);
  }
};

export const buildVerifyHandler =
  (verifyToken: string): RouteHandler =>
  async ({ query, res }) => {
    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === verifyToken &&
      typeof query['hub.challenge'] === 'string'
    ) {
      text(res, 200, query['hub.challenge']);
      return;
    }
    text(res, 403, 'verification failed');
  };

export const buildEventHandler =
  (brand: BrandProfile, appSecret: string): RouteHandler =>
  async ({ rawBody, body, req, res }) => {
    const sig = (req.headers['x-hub-signature-256'] as string | undefined) ?? '';
    if (!appSecret) {
      log.warn('META_APP_SECRET no configurado: webhook acepta payload sin verificar firma');
    } else if (!verifySignature(rawBody, sig, appSecret)) {
      json(res, 401, { error: 'firma inválida' });
      return;
    }

    const payload = body as MetaWebhookPayload | null;
    if (!payload || !Array.isArray(payload.entry)) {
      json(res, 400, { error: 'payload inválido' });
      return;
    }

    const procesados: Array<{ tipo: string; resultado: string }> = [];

    for (const entry of payload.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          const inbound = changeToInbound(entry, change);
          if (!inbound) continue;
          try {
            const result = await processInbound(brand, inbound);
            procesados.push({
              tipo: inbound.type,
              resultado: result.outcome.sent ? 'auto-respondido' : 'derivado',
            });
            routeToAgents(inbound.texto, inbound.type, inbound.remitente, inbound.postId);
            emit({
              type: 'inbound_message_received',
              priority: 'normal',
              correlationId: `webhook-${Date.now()}`,
              payload: { type: inbound.type, text: inbound.texto, sender: inbound.remitente, postId: inbound.postId },
            });
            if (inbound.type === 'comentario' && inbound.postId) {
              captureForCrisis(inbound.postId, inbound.texto);
              if (shouldRunCrisisCheck(inbound.postId)) {
                const comentarios = recentCommentsByPost.get(inbound.postId) ?? [];
                void ejecutarCrisisCheck(brand, {
                  postId: inbound.postId,
                  comentariosRecientes: [...comentarios],
                }).catch((err: Error) => log.error(`Crisis check async falló: ${err.message}`));
              }
            }
          } catch (err) {
            await sendAlert({
              severity: 'warn',
              title: 'Webhook: error procesando comentario/mención',
              body: (err as Error).message,
              metadata: { entryId: entry.id, field: change.field },
            });
          }
        }
      }
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          const inbound = messagingToInbound(entry, msg);
          if (!inbound) continue;
          try {
            const result = await processInbound(brand, inbound);
            procesados.push({
              tipo: 'dm',
              resultado: result.outcome.sent ? 'auto-respondido' : 'derivado',
            });
            routeToAgents(inbound.texto, inbound.type, inbound.remitente);
            emit({
              type: 'inbound_message_received',
              priority: 'normal',
              correlationId: `webhook-${Date.now()}`,
              payload: { type: inbound.type, text: inbound.texto, sender: inbound.remitente },
            });
          } catch (err) {
            log.error(`Webhook DM falló: ${(err as Error).message}`);
          }
        }
      }
    }

    json(res, 200, { ok: true, procesados });
  };
