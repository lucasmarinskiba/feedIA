/**
 * TikTok Business Messaging — respuestas automáticas a DMs de una Cuenta de
 * Empresa de TikTok, dentro de lo permitido (TT-BIZ-001): SOLO respuestas 1:1
 * a alguien que ya escribió primero. Nunca mass-messaging.
 *
 * Cubre los tres usos que TikTok autoriza vía plataformas de automatización
 * (SendPulse, Respond.io, etc.): responder consultas, enviar catálogo/precio
 * (o link a TikTok Shop), y ofrecer agendar una cita/llamada.
 *
 * No integra un proveedor real de TikTok Business API — genera la respuesta y
 * la pasa por tiktokGuardian; conectar el envío real (vía SendPulse/Respond.io
 * o la API oficial) es responsabilidad del webhook que llame a esta función,
 * igual que el resto del pipeline de publicación (ver publishPipeline.ts).
 */

import { ask as routerAsk } from '../../agent/tokenRouter.js';
import type { BrandProfile } from '../../config/types.js';
import * as tiktokGuardian from '../../compliance/tiktokGuardian.js';
import { log } from '../../agent/logger.js';

export type BusinessMessageIntent = 'catalogo' | 'agendar' | 'soporte' | 'general';

export interface IncomingBusinessMessage {
  /** ID de usuario de TikTok que escribió — prueba de que el contacto lo inició. */
  senderId: string;
  senderUsername?: string;
  text: string;
}

export interface BusinessMessagingLinks {
  /** Link a catálogo/precio o a la TikTok Shop de la marca. */
  catalogUrl?: string;
  /** Link de agenda (Calendly/similar) para citas o llamadas. */
  bookingUrl?: string;
}

const INTENT_PATTERNS: Record<BusinessMessageIntent, RegExp[]> = {
  catalogo: [/\bprecio/i, /\bcatálogo|catalogo\b/i, /\bcu[aá]nto\s+cuesta/i, /\bproductos?\b/i, /\bshop\b/i],
  agendar: [/\bagendar|agenda\b/i, /\bcita\b/i, /\bllamada\b/i, /\breservar?\b/i, /\bturno\b/i],
  soporte: [/\bproblema\b/i, /\bno\s+(funciona|lleg[oó])\b/i, /\bayuda\b/i, /\breclamo\b/i],
  general: [],
};

export const classifyBusinessIntent = (text: string): BusinessMessageIntent => {
  const lower = text.toLowerCase();
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'general') continue;
    if (patterns.some((p) => p.test(lower))) return intent as BusinessMessageIntent;
  }
  return 'general';
};

export interface BusinessReplyDraft {
  text: string;
  intent: BusinessMessageIntent;
}

export const draftBusinessReply = async (
  message: IncomingBusinessMessage,
  brand: BrandProfile,
  links: BusinessMessagingLinks = {},
): Promise<BusinessReplyDraft> => {
  const intent = classifyBusinessIntent(message.text);

  const linksBlock = [
    links.catalogUrl ? `Link de catálogo/TikTok Shop: ${links.catalogUrl}` : null,
    links.bookingUrl ? `Link para agendar: ${links.bookingUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `Sos el asistente de mensajería de la Cuenta de Empresa de TikTok @${brand.name}.
Un usuario que YA te escribió primero mandó este mensaje — respondé SOLO a él, en su idioma, tono ${brand.voice.tone.join(', ')}.

Mensaje del usuario: "${message.text}"
Intención detectada: ${intent}
${linksBlock ? `\nRecursos disponibles para compartir si corresponde:\n${linksBlock}` : ''}

Reglas estrictas:
- Nunca pidas seguir/like/compartir a cambio de nada ("seguime y te sigo", etc.)
- Nunca prometas resultados garantizados
- Si preguntó por precio/catálogo y hay link de catálogo, compartilo
- Si quiere agendar y hay link de agenda, compartilo
- Si es soporte y no podés resolverlo vos, decí que un humano va a seguir la conversación
- Máximo 200 caracteres, tono directo y humano, no genérico

Respondé solo con el texto del mensaje, sin comillas ni JSON.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 300 });
  return { text: result.text.trim().slice(0, 500), intent };
};

export interface RespondResult {
  sent: boolean;
  text?: string;
  intent?: BusinessMessageIntent;
  reason?: string;
}

/**
 * Genera y evalúa (nunca "envía" — eso lo hace el integrador real) una
 * respuesta a un mensaje de negocio de TikTok. Bloquea si el guardian
 * detecta cualquier señal de mass-messaging o engagement falso.
 */
export const respondToBusinessMessage = async (
  message: IncomingBusinessMessage,
  brand: BrandProfile,
  links: BusinessMessagingLinks = {},
): Promise<RespondResult> => {
  const draft = await draftBusinessReply(message, brand, links);

  const decision = tiktokGuardian.evaluate('business_dm_reply', {
    actor: 'tiktok-business-bot',
    targetTikTokUserId: message.senderId,
    userInitiatedContact: true, // por diseño: esta función solo procesa mensajes entrantes reales
    contactChannel: 'dm', // IncomingBusinessMessage solo modela DMs — nunca comentarios (ver TT-AUTO-004)
    contentText: draft.text,
  });

  if (!decision.allowed) {
    log.warn(`[TikTokBusinessMessaging] Respuesta bloqueada: ${decision.reason}`);
    return { sent: false, reason: decision.reason };
  }

  tiktokGuardian.recordSuccess('business_dm_reply', {
    actor: 'tiktok-business-bot',
    targetTikTokUserId: message.senderId,
    contentText: draft.text,
  });

  return { sent: true, text: draft.text, intent: draft.intent };
};
