import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import type { Channel, UserContext } from './conversationMemory.js';
import { recentTurnsFormatted } from './conversationMemory.js';
import { evaluateRails, type BlockReason } from './safetyRails.js';
import { injectIntoAutoReply } from '../../brain/bridge/brainEnrichment.js';
import { learnFromInteraction } from '../../brain/bridge/interactionLearner.js';

export type Intent =
  | 'saludo'
  | 'pregunta-info'
  | 'pregunta-soporte'
  | 'pregunta-precio'
  | 'feedback-positivo'
  | 'feedback-negativo'
  | 'colaboracion'
  | 'spam'
  | 'lead-caliente'
  | 'troll'
  | 'consulta-tecnica'
  | 'fuera-de-tema'
  | 'otro';

export interface AutoReplyDecision {
  intent: Intent;
  confianza: number;
  esRespondibleAuto: boolean;
  motivoSiNoLoEs: string;
  respuestaPropuesta: string;
  derivarAHumano: boolean;
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  etiquetasInternas: string[];
}

export interface AutoReplyContext {
  channel: Channel;
  postContext?: { postId: string; tipo: string; resumenContenido: string };
  mensaje: string;
}

const INTENT_AUTOREPLY_WHITELIST: Intent[] = ['saludo', 'pregunta-info', 'feedback-positivo', 'consulta-tecnica'];

export const decideAutoReply = async (
  brand: BrandProfile,
  ctx: UserContext,
  incoming: AutoReplyContext,
): Promise<AutoReplyDecision> => {
  const historial = recentTurnsFormatted(ctx, 8);
  const postInfo = incoming.postContext
    ? `\nCONTEXTO DEL POST (${incoming.postContext.tipo}): ${incoming.postContext.resumenContenido}`
    : '';

  let prompt = `Sos el bot conversacional de la marca en Instagram. Decidís intent + si el bot puede responder solo o derivar a humano.

${brandContext(brand)}

CANAL: ${incoming.channel === 'dm' ? 'Mensaje directo' : 'Comentario en post'}${postInfo}

HISTORIAL CON @${ctx.handle} (mensajes previos: ${ctx.mensajesTotales}, auto-replies hoy: ${
    ctx.autoRepliesPorDia[new Date().toISOString().split('T')[0]!] ?? 0
  }):
${historial || '(primer contacto)'}

NUEVO MENSAJE DE @${ctx.handle}:
"${incoming.mensaje}"

Reglas críticas para "esRespondibleAuto":
- TRUE solo para intents: saludo, pregunta-info (general, no específica de cuenta), feedback-positivo, consulta-tecnica fácilmente respondible.
- FALSE siempre que: pidan precio cerrado, soliciten contrato, mencionen problema legal, sean lead-caliente con intención de compra, sea spam, sea troll, sea queja grave.
- Si la confianza < ${env.bot.escalateThreshold} → esRespondibleAuto=false y derivarAHumano=true.

Reglas para "respuestaPropuesta":
- Tono: ${brand.voice.tone.join(', ')}.
- Prohibido decir: ${brand.voice.forbidden.join(', ') || 'sin restricciones'}.
- Si es comentario público → max 2 oraciones, suena humano.
- Si es DM → puede ser un poco más extenso pero nunca más de 4 oraciones.
- NUNCA promesas que la marca no puede sostener.
- NUNCA inventar datos del producto que no estén en el contexto.
- Si derivarAHumano=true, igual proponer una respuesta puente cálida tipo: "te respondemos por acá en breve, ${ctx.handle}".

JSON:
{
  "intent": "saludo|pregunta-info|pregunta-soporte|pregunta-precio|feedback-positivo|feedback-negativo|colaboracion|spam|lead-caliente|troll|consulta-tecnica|fuera-de-tema|otro",
  "confianza": 0.0,
  "esRespondibleAuto": true,
  "motivoSiNoLoEs": "razón concreta o cadena vacía",
  "respuestaPropuesta": "texto de respuesta listo para enviar",
  "derivarAHumano": false,
  "prioridad": "urgente|alta|media|baja",
  "etiquetasInternas": ["etiqueta para CRM/triage"]
}`;

  // 🧠 Inject brain context
  prompt = await injectIntoAutoReply(brand, ctx, incoming.mensaje, prompt);

  const decision = await askJson<AutoReplyDecision>(prompt, { maxTokens: 1500, fast: true });

  if (decision.esRespondibleAuto && !INTENT_AUTOREPLY_WHITELIST.includes(decision.intent)) {
    decision.esRespondibleAuto = false;
    decision.derivarAHumano = true;
    decision.motivoSiNoLoEs = `intent ${decision.intent} fuera de whitelist`;
  }
  if (decision.confianza < env.bot.escalateThreshold) {
    decision.esRespondibleAuto = false;
    decision.derivarAHumano = true;
    if (!decision.motivoSiNoLoEs) decision.motivoSiNoLoEs = 'confianza baja';
  }
  return decision;
};

export interface AutoReplyOutcome {
  decision: AutoReplyDecision;
  enviado: boolean;
  motivoBloqueoRails?: BlockReason[];
  motivoBloqueoIntent?: string;
}

export const evaluateAndDecide = async (
  brand: BrandProfile,
  ctx: UserContext,
  incoming: AutoReplyContext,
): Promise<AutoReplyOutcome> => {
  const rails = evaluateRails(ctx, incoming.mensaje);
  const decision = await decideAutoReply(brand, ctx, incoming);

  if (!rails.permitir) {
    return { decision, enviado: false, motivoBloqueoRails: rails.motivos };
  }
  if (!decision.esRespondibleAuto) {
    // Aunque no respondamos auto, APRENDER del mensaje
    await learnFromInteraction({
      handle: ctx.handle,
      incoming: incoming.mensaje,
      outgoing: decision.respuestaPropuesta || '(escalado a humano)',
      channel: incoming.channel === 'comentario' ? 'comment' : incoming.channel,
      intent: decision.intent,
      confidence: decision.confianza,
      brand,
      metadata: { escalated: true, autoReplied: false, sentiment: 'neutral' },
    });
    return { decision, enviado: false, motivoBloqueoIntent: decision.motivoSiNoLoEs };
  }

  // ✅ APRENDER de la interacción — el cerebro guarda TODO
  await learnFromInteraction({
    handle: ctx.handle,
    incoming: incoming.mensaje,
    outgoing: decision.respuestaPropuesta,
    channel: incoming.channel === 'comentario' ? 'comment' : incoming.channel,
    intent: decision.intent,
    confidence: decision.confianza,
    brand,
    metadata: {
      postId: incoming.postContext?.postId,
      postType: incoming.postContext?.tipo,
      autoReplied: true,
      sentiment: decision.prioridad === 'urgente' ? 'negative' : 'neutral',
    },
  });

  return { decision, enviado: true };
};
