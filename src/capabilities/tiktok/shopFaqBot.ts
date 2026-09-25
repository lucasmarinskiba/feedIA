/**
 * TikTok Shop FAQ Bot — respuestas automáticas en el chat de TikTok Shop
 * (TT-SHOP-001): saludo/menú y precio/stock/horario/envío desde un catálogo
 * FIJO, nunca generación libre para esos datos — evita alucinar precio/stock.
 *
 * TT-SHOP-001 exige que la respuesta quede etiquetada visiblemente como
 * generada por IA (en mercados regulados como la UE, además, no cuenta para
 * la tasa de respuesta humana de 24h) — el prefijo de disclosure va SIEMPRE,
 * no solo quien esté en un mercado regulado, porque no tenemos detección de
 * región y el disclosure de más nunca es una violación.
 *
 * Igual que businessMessaging.ts: solo genera y evalúa la respuesta vía
 * tiktokGuardian — enviarla de verdad es responsabilidad del integrador
 * (SendPulse/Respond.io/API oficial) que llame a esta función.
 */

import * as tiktokGuardian from '../../compliance/tiktokGuardian.js';
import { log } from '../../agent/logger.js';

export const AI_DISCLOSURE_PREFIX = '🤖 [Respuesta automática] ';

export interface ShopCatalogEntry {
  sku: string;
  name: string;
  price: string;
  stock: 'in-stock' | 'low-stock' | 'out-of-stock';
  /** Otras formas en que un usuario puede nombrar el producto. */
  aliases?: string[];
}

export interface ShopFaqCatalog {
  entries: ShopCatalogEntry[];
  shippingInfo?: string;
  hoursInfo?: string;
}

export interface ShopFaqQuestion {
  senderId: string;
  senderUsername?: string;
  text: string;
}

export type ShopFaqTopic = 'saludo' | 'precio' | 'stock' | 'envio' | 'horario' | 'desconocido';

const TOPIC_PATTERNS: Record<Exclude<ShopFaqTopic, 'desconocido'>, RegExp[]> = {
  saludo: [/^\s*(hola|hi|buenas|hey)\s*[!.]?\s*$/i, /\bmen[uú]\b/i],
  precio: [/\bprecio\b/i, /\bcu[aá]nto\s+(cuesta|sale|vale)/i, /\bcosto\b/i],
  stock: [/\bstock\b/i, /\bhay\b/i, /\bdisponible\b/i, /\bqueda/i, /\btalle/i],
  envio: [/\benv[ií]o\b/i, /\bshipping\b/i, /\bllega\b/i, /\bdemora\b/i],
  horario: [/\bhorario\b/i, /\bat(ie|ienden)/i, /\bcu[aá]ndo\s+abren/i],
};

export const classifyShopFaqTopic = (text: string): ShopFaqTopic => {
  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return topic as ShopFaqTopic;
  }
  return 'desconocido';
};

const normalize = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const tokenize = (s: string): string[] =>
  normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

/** Match por palabra completa (no substring del nombre entero): "el serum" matchea "Serum Vitamina C". */
export const findCatalogMatch = (text: string, catalog: ShopFaqCatalog): ShopCatalogEntry | undefined => {
  const textTokens = new Set(tokenize(text));
  return catalog.entries.find((entry) => {
    const names = [entry.name, ...(entry.aliases ?? [])];
    return names.some((n) => tokenize(n).some((tok) => textTokens.has(tok)));
  });
};

const STOCK_LABEL: Record<ShopCatalogEntry['stock'], string> = {
  'in-stock': 'hay stock disponible',
  'low-stock': 'queda poco stock',
  'out-of-stock': 'está agotado por ahora',
};

export interface ShopFaqReply {
  text: string;
  topic: ShopFaqTopic;
  matchedSku?: string;
  /** true si el bot no pudo resolverlo desde el catálogo fijo — debe pasar a un humano. */
  shouldEscalate: boolean;
}

/** Genera la respuesta SOLO desde datos fijos del catálogo — nunca inventa precio/stock. */
export const buildShopFaqReply = (question: ShopFaqQuestion, catalog: ShopFaqCatalog): ShopFaqReply => {
  const topic = classifyShopFaqTopic(question.text);

  if (topic === 'saludo') {
    const menu = catalog.entries.map((e) => `• ${e.name}`).join('\n');
    return {
      text: `${AI_DISCLOSURE_PREFIX}¡Hola! ¿Sobre qué producto querés saber precio, stock, envío u horario?\n${menu}`,
      topic,
      shouldEscalate: false,
    };
  }

  if (topic === 'envio') {
    return {
      text: `${AI_DISCLOSURE_PREFIX}${catalog.shippingInfo ?? 'No tengo info de envío cargada — un humano te va a responder.'}`,
      topic,
      shouldEscalate: !catalog.shippingInfo,
    };
  }

  if (topic === 'horario') {
    return {
      text: `${AI_DISCLOSURE_PREFIX}${catalog.hoursInfo ?? 'No tengo el horario cargado — un humano te va a responder.'}`,
      topic,
      shouldEscalate: !catalog.hoursInfo,
    };
  }

  if (topic === 'precio' || topic === 'stock') {
    const match = findCatalogMatch(question.text, catalog);
    if (!match) {
      return {
        text: `${AI_DISCLOSURE_PREFIX}No encontré ese producto en el catálogo — ¿podés escribir el nombre exacto? Si no, un humano te va a responder.`,
        topic,
        shouldEscalate: true,
      };
    }
    const text =
      topic === 'precio'
        ? `${AI_DISCLOSURE_PREFIX}${match.name}: ${match.price}.`
        : `${AI_DISCLOSURE_PREFIX}${match.name}: ${STOCK_LABEL[match.stock]}.`;
    return { text, topic, matchedSku: match.sku, shouldEscalate: false };
  }

  return {
    text: `${AI_DISCLOSURE_PREFIX}No tengo esa info en el catálogo — un humano va a seguir la conversación.`,
    topic,
    shouldEscalate: true,
  };
};

export interface ShopFaqResult {
  sent: boolean;
  text?: string;
  topic?: ShopFaqTopic;
  matchedSku?: string;
  shouldEscalate?: boolean;
  reason?: string;
}

/**
 * Genera y evalúa (nunca envía) una respuesta de FAQ de TikTok Shop.
 * Usa la categoría `catalog_send` del guardian — misma familia de reglas que
 * business_dm_reply (TT-BIZ-001: solo respuesta a quien escribió primero;
 * TT-AUTO-004: nunca a partir de un comentario público).
 */
export const respondToShopFaq = (question: ShopFaqQuestion, catalog: ShopFaqCatalog): ShopFaqResult => {
  const reply = buildShopFaqReply(question, catalog);

  const decision = tiktokGuardian.evaluate('catalog_send', {
    actor: 'tiktok-shop-faq-bot',
    targetTikTokUserId: question.senderId,
    userInitiatedContact: true,
    contactChannel: 'dm',
    contentText: reply.text,
  });

  if (!decision.allowed) {
    log.warn(`[TikTokShopFaqBot] Respuesta bloqueada: ${decision.reason}`);
    return { sent: false, reason: decision.reason };
  }

  tiktokGuardian.recordSuccess('catalog_send', {
    actor: 'tiktok-shop-faq-bot',
    targetTikTokUserId: question.senderId,
    contentText: reply.text,
  });

  return {
    sent: true,
    text: reply.text,
    topic: reply.topic,
    matchedSku: reply.matchedSku,
    shouldEscalate: reply.shouldEscalate,
  };
};
