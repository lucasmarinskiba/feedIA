/**
 * DM Conversation Engine — Gestión de mensajes directos de Instagram.
 *
 * Clasifica intenciones, genera borradores de respuesta, procesa bandejas
 * de entrada en lote y mantiene un repositorio persistente de conversaciones.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../agent/logger.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

// ── Cliente Anthropic ─────────────────────────────────────────────────────────

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type DMIntent =
  | 'consulta-precio'
  | 'consulta-producto'
  | 'consulta-disponibilidad'
  | 'queja-reclamo'
  | 'agradecimiento'
  | 'colaboracion'
  | 'spam'
  | 'consulta-general'
  | 'solicitud-presupuesto'
  | 'seguimiento-compra'
  | 'otro';

export type DMUrgency = 'baja' | 'media' | 'alta' | 'critica';
export type DMStatus = 'nuevo' | 'respondido' | 'escalado' | 'archivado' | 'spam';

export interface DMMessage {
  id: string;
  from: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

export interface DMConversation {
  id: string;
  userId: string;
  username: string;
  brandId: string;
  messages: DMMessage[];
  intent: DMIntent;
  urgency: DMUrgency;
  status: DMStatus;
  suggestedReply?: string;
  autoReplyApproved?: boolean;
  tags: string[];
  value: 'hot-lead' | 'warm-lead' | 'cold' | 'customer' | 'influencer' | 'spam' | 'unknown';
  notes?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface DMReplyDraft {
  conversationId: string;
  draft: string;
  tone: string;
  intent: DMIntent;
  confidence: number; // 0-100
  alternativeDrafts: string[];
  warnings: string[]; // e.g. "No confirmar precio sin verificar stock"
  requiresHumanReview: boolean;
}

// ── Interfaces internas de respuesta Claude ───────────────────────────────────

interface ClassifyDMResponse {
  intent: DMIntent;
  urgency: DMUrgency;
  value: DMConversation['value'];
  tags: string[];
}

interface GenerateReplyResponse {
  draft: string;
  tone: string;
  confidence: number;
  alternativeDrafts: string[];
  warnings: string[];
}

interface QuickRepliesResponse {
  replies: string[];
}

interface AutoResponseTemplate {
  template: string;
  delay: number;
  requiresApproval: boolean;
}

interface AutoResponseTemplatesResponse {
  templates: Record<DMIntent, AutoResponseTemplate>;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

const askJson = async <T>(prompt: string): Promise<T> => {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'enabled', budget_tokens: 2000 },
    messages: [{ role: 'user', content: prompt }],
  });

  // Extraer el bloque de texto (puede haber un bloque thinking antes)
  let rawText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      rawText = block.text;
      break;
    }
  }

  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    log.error(`[DMEngine] JSON parse error: ${(err as Error).message}`);
    throw new Error(
      `No se pudo parsear JSON de Claude. Error: ${(err as Error).message}\nRespuesta:\n${rawText.slice(0, 500)}`,
    );
  }
};

// ── Paths de persistencia ─────────────────────────────────────────────────────

const dmConversationsDir = (brandId: string): string => resolve(join('data', 'runtime', 'dm-conversations', brandId));

const dmTemplatesDir = (): string => resolve(join('data', 'runtime', 'dm-templates'));

// ── Detección de spam local ───────────────────────────────────────────────────

/**
 * Detecta spam a nivel de texto: 3+ mensajes consecutivos con solo emojis
 * o solo links (excluyendo los propios de la marca).
 */
const isSpamByPattern = (messages: DMMessage[]): boolean => {
  const inbound = messages.filter((m) => !m.isOwn);
  if (inbound.length < 3) return false;

  const emojiOnlyRegex = /^[\p{Emoji}\s]+$/u;
  const linkOnlyRegex = /^(https?:\/\/\S+\s*)+$/i;

  let consecutiveEmoji = 0;
  let consecutiveLink = 0;

  for (const msg of inbound) {
    const text = msg.text.trim();
    if (emojiOnlyRegex.test(text)) {
      consecutiveEmoji++;
      consecutiveLink = 0;
    } else if (linkOnlyRegex.test(text)) {
      consecutiveLink++;
      consecutiveEmoji = 0;
    } else {
      consecutiveEmoji = 0;
      consecutiveLink = 0;
    }
    if (consecutiveEmoji >= 3 || consecutiveLink >= 3) return true;
  }
  return false;
};

// ── Función 1: classifyDM ─────────────────────────────────────────────────────

export const classifyDM = async (
  conversation: Pick<DMConversation, 'messages' | 'username'>,
  brand: BrandProfile,
): Promise<{ intent: DMIntent; urgency: DMUrgency; value: DMConversation['value']; tags: string[] }> => {
  log.debug(`[DMEngine] Clasificando DM de @${conversation.username}`);

  const inboundMessages = conversation.messages.filter((m) => !m.isOwn);
  const conversationText = conversation.messages
    .map((m) => `[${m.isOwn ? 'MARCA' : `@${conversation.username}`}]: ${m.text}`)
    .join('\n');

  const isHighUrgencyNiche =
    brand.industryCategory === 'plomeria-gas-electricidad' ||
    brand.niche.toLowerCase().includes('gas') ||
    brand.niche.toLowerCase().includes('plom') ||
    brand.niche.toLowerCase().includes('electric') ||
    brand.niche.toLowerCase().includes('emergencia');

  const prompt = `Sos un clasificador de DMs de Instagram para una marca.

${brandContext(brand)}
INDUSTRIA: ${brand.industryCategory ?? 'no especificada'}
NICHO_ALTA_URGENCIA: ${isHighUrgencyNiche ? 'SÍ — las consultas de precio/disponibilidad se clasifican como urgencia ALTA o CRITICA' : 'NO'}

CONVERSACIÓN CON @${conversation.username}:
${conversationText}

TOTAL MENSAJES ENTRANTES: ${inboundMessages.length}

Clasificá esta conversación y respondé EXCLUSIVAMENTE con JSON válido, sin texto antes ni después:
{
  "intent": "consulta-precio|consulta-producto|consulta-disponibilidad|queja-reclamo|agradecimiento|colaboracion|spam|consulta-general|solicitud-presupuesto|seguimiento-compra|otro",
  "urgency": "baja|media|alta|critica",
  "value": "hot-lead|warm-lead|cold|customer|influencer|spam|unknown",
  "tags": ["array de strings descriptivos, max 5"]
}

Reglas de urgencia:
- critica: queja grave, emergencia, cliente que perdió dinero, reclamo legal
- alta: lead caliente con intención de compra, queja moderada, nicho de alta urgencia + consulta de precio/disponibilidad
- media: consultas de información, seguimiento, colaboraciones
- baja: agradecimientos, spam, curiosos sin intención clara`;

  const result = await askJson<ClassifyDMResponse>(prompt);

  log.debug(
    `[DMEngine] @${conversation.username} → intent=${result.intent}, urgency=${result.urgency}, value=${result.value}`,
  );

  return {
    intent: result.intent,
    urgency: result.urgency,
    value: result.value,
    tags: result.tags ?? [],
  };
};

// ── Función 2: generateReply ──────────────────────────────────────────────────

export const generateReply = async (
  conversation: DMConversation,
  brand: BrandProfile,
  options?: {
    mode?: 'autopilot' | 'supervised';
    style?: 'formal' | 'casual' | 'empático';
  },
): Promise<DMReplyDraft> => {
  const mode = options?.mode ?? 'supervised';
  const style = options?.style ?? 'casual';

  log.debug(`[DMEngine] Generando respuesta para conv ${conversation.id} (modo=${mode}, estilo=${style})`);

  const conversationText = conversation.messages
    .map((m) => `[${m.isOwn ? 'MARCA' : `@${conversation.username}`}]: ${m.text}`)
    .join('\n');

  const complianceLines = brand.complianceRules
    .map((r) => `- ${r.description}${r.example ? ` (ej: ${r.example})` : ''}`)
    .join('\n');

  const forbiddenWords = brand.voice.forbidden.length ? `PALABRAS PROHIBIDAS: ${brand.voice.forbidden.join(', ')}` : '';

  const requiresHumanReview =
    conversation.intent === 'queja-reclamo' ||
    conversation.intent === 'solicitud-presupuesto' ||
    conversation.urgency === 'critica';

  const prompt = `Sos un experto en comunicación de marca respondiendo DMs de Instagram.

${brandContext(brand)}
${forbiddenWords}

REGLAS DE COMPLIANCE:
${complianceLines || '- No hay reglas de compliance definidas, aplicá sentido común'}

CONVERSACIÓN:
${conversationText}

CLASIFICACIÓN:
- Intención: ${conversation.intent}
- Urgencia: ${conversation.urgency}
- Valor del contacto: ${conversation.value}
- Tags: ${conversation.tags.join(', ')}

ESTILO SOLICITADO: ${style}
MODO: ${mode}

Generá una respuesta principal y 2 alternativas. La respuesta debe:
1. Ser auténtica al tono de la marca (${brand.voice.tone.join(', ')})
2. No confirmar precios ni condiciones sin que un humano lo apruebe
3. Respetar TODAS las reglas de compliance
4. No usar palabras prohibidas
5. Ser concisa (máximo 4 oraciones)
6. Adaptarse al estilo solicitado (${style})

Respondé EXCLUSIVAMENTE con JSON válido:
{
  "draft": "respuesta principal lista para enviar",
  "tone": "descripción breve del tono usado",
  "confidence": 85,
  "alternativeDrafts": ["alternativa 1", "alternativa 2"],
  "warnings": ["warning si hay algo que el humano debe revisar, array vacío si no hay"]
}`;

  let replyData: GenerateReplyResponse;
  try {
    replyData = await askJson<GenerateReplyResponse>(prompt);
  } catch (err) {
    log.error(`[DMEngine] Error generando respuesta: ${(err as Error).message}`);
    replyData = {
      draft: 'Hola! Gracias por tu mensaje. Te respondo a la brevedad.',
      tone: 'neutral',
      confidence: 10,
      alternativeDrafts: [],
      warnings: ['Error al generar respuesta automática — revisión humana obligatoria'],
    };
  }

  const autoReplyApproved = mode === 'autopilot' && !requiresHumanReview;

  return {
    conversationId: conversation.id,
    draft: replyData.draft,
    tone: replyData.tone,
    intent: conversation.intent,
    confidence: Math.min(100, Math.max(0, replyData.confidence ?? 50)),
    alternativeDrafts: replyData.alternativeDrafts ?? [],
    warnings: replyData.warnings ?? [],
    requiresHumanReview,
    ...(autoReplyApproved ? { autoReplyApproved: true } : {}),
  };
};

// ── Función 3: processInboxBatch ──────────────────────────────────────────────

export const processInboxBatch = async (
  conversations: DMConversation[],
  brand: BrandProfile,
): Promise<{ processed: DMReplyDraft[]; escalated: DMConversation[]; spam: DMConversation[] }> => {
  log.step(`[DMEngine] Procesando lote de ${conversations.length} conversaciones`);

  const processed: DMReplyDraft[] = [];
  const escalated: DMConversation[] = [];
  const spam: DMConversation[] = [];

  for (const conv of conversations) {
    try {
      // 1. Detectar spam por patrón de texto (rápido, sin API)
      if (isSpamByPattern(conv.messages) || conv.intent === 'spam') {
        log.debug(`[DMEngine] Spam detectado: ${conv.id}`);
        spam.push({ ...conv, status: 'spam' });
        continue;
      }

      // 2. Clasificar si no tiene intención o tiene estado nuevo
      let classified = conv;
      if (conv.status === 'nuevo' || conv.intent === 'otro') {
        const classification = await classifyDM({ messages: conv.messages, username: conv.username }, brand);
        classified = { ...conv, ...classification };

        if (classification.intent === 'spam') {
          spam.push({ ...classified, status: 'spam' });
          continue;
        }
      }

      // 3. Escalar conversaciones de alto riesgo
      const isHighRisk =
        classified.urgency === 'critica' ||
        classified.intent === 'queja-reclamo' ||
        classified.intent === 'solicitud-presupuesto';

      if (isHighRisk) {
        log.warn(`[DMEngine] Escalando conv ${conv.id} (${classified.intent}, ${classified.urgency})`);
        escalated.push({ ...classified, status: 'escalado' });
        continue;
      }

      // 4. Generar respuesta para las conversaciones de bajo riesgo
      const draft = await generateReply(classified, brand, { mode: 'supervised' });
      processed.push(draft);
    } catch (err) {
      log.error(`[DMEngine] Error procesando conv ${conv.id}: ${(err as Error).message}`);
      escalated.push({ ...conv, status: 'escalado' });
    }
  }

  log.success(
    `[DMEngine] Lote completo: ${processed.length} procesados, ${escalated.length} escalados, ${spam.length} spam`,
  );

  return { processed, escalated, spam };
};

// ── Función 4: saveDMConversation ─────────────────────────────────────────────

export const saveDMConversation = (conv: DMConversation): void => {
  const dir = dmConversationsDir(conv.brandId);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${conv.id}.json`);
  writeFileSync(filePath, JSON.stringify(conv, null, 2), 'utf-8');
  log.debug(`[DMEngine] Conversación guardada: ${filePath}`);
};

// ── Función 5: loadDMConversations ────────────────────────────────────────────

export const loadDMConversations = (brandId: string): DMConversation[] => {
  const dir = dmConversationsDir(brandId);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const conversations: DMConversation[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        const conv = JSON.parse(raw) as DMConversation;
        conversations.push(conv);
      } catch (err) {
        log.warn(`[DMEngine] No se pudo leer ${file}: ${(err as Error).message}`);
      }
    }

    return conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  } catch (err) {
    log.error(`[DMEngine] Error cargando conversaciones de ${brandId}: ${(err as Error).message}`);
    return [];
  }
};

// ── Función 6: generateQuickReplies ──────────────────────────────────────────

export const generateQuickReplies = async (intent: DMIntent, brand: BrandProfile): Promise<string[]> => {
  log.debug(`[DMEngine] Generando quick replies para intent=${intent}`);

  const prompt = `Sos un experto en comunicación de Instagram para la marca "${brand.name}".

NICHO: ${brand.niche}
TONO DE MARCA: ${brand.voice.tone.join(', ')}
PALABRAS PROHIBIDAS: ${brand.voice.forbidden.join(', ') || 'ninguna'}

Generá exactamente 5 respuestas rápidas (quick replies) para el intent: "${intent}".

Reglas:
- Cada respuesta debe tener máximo 30 caracteres
- Deben ser botones de respuesta rápida, no respuestas completas
- Usá el tono de la marca
- Deben ser accionables y directas

Respondé EXCLUSIVAMENTE con JSON válido:
{
  "replies": ["reply1", "reply2", "reply3", "reply4", "reply5"]
}`;

  try {
    const result = await askJson<QuickRepliesResponse>(prompt);
    return (result.replies ?? []).slice(0, 5).map((r) => r.slice(0, 30));
  } catch (err) {
    log.error(`[DMEngine] Error generando quick replies: ${(err as Error).message}`);
    // Fallback por intent
    const fallbacks: Record<DMIntent, string[]> = {
      'consulta-precio': [
        'Ver precios 💰',
        'Te paso info',
        'Depende del trabajo',
        'Pedí presupuesto',
        'Te escribo por privado',
      ],
      'consulta-producto': [
        'Te cuento más',
        'Mirá nuestro perfil',
        'Qué necesitás?',
        'Con gusto te ayudo',
        'Pasate por nuestro link',
      ],
      'consulta-disponibilidad': [
        'Consulto stock',
        'Hay disponibilidad',
        'Te confirmo hoy',
        'Depende la fecha',
        'Escribime más tarde',
      ],
      'queja-reclamo': ['Lamentamos eso 😔', 'Lo resolvemos', 'Hablemos por acá', 'Te contamos', 'Comunicanos el caso'],
      agradecimiento: [
        'Gracias a vos! 🙌',
        '¡Nos alegra!',
        'Fue un placer',
        'Siempre a disposición',
        '¡Hasta la próxima!',
      ],
      colaboracion: ['Nos interesa!', 'Contanos más', 'Hablamos por mail', 'Mandá propuesta', 'Te leo'],
      spam: ['Gracias, chau', 'No gracias', 'Adiós', 'No nos interesa', 'Bloqueado'],
      'consulta-general': ['Claro, te ayudo', 'Contame más', 'Con gusto!', 'Decime qué necesitás', 'Estamos aquí'],
      'solicitud-presupuesto': [
        'Armamos uno',
        'Te lo enviamos',
        'Necesito más datos',
        'Cuándo lo necesitás?',
        'Te contactamos',
      ],
      'seguimiento-compra': [
        'Revisamos tu pedido',
        'Cómo va tu compra?',
        'Te actualizo',
        'Verifico estado',
        'Dame un momento',
      ],
      otro: ['Hola! 👋', 'Te ayudo?', 'Contame', 'En qué te ayudo?', 'Decime todo'],
    };
    return fallbacks[intent] ?? ['Hola! 👋', 'Te ayudo?', 'Contame', 'En qué te ayudo?', 'Decime todo'];
  }
};

// ── Función 7: buildAutoResponseTemplates ────────────────────────────────────

export const buildAutoResponseTemplates = async (
  brand: BrandProfile,
): Promise<Record<DMIntent, { template: string; delay: number; requiresApproval: boolean }>> => {
  log.step(`[DMEngine] Construyendo biblioteca de plantillas para "${brand.name}"`);

  const prompt = `Sos un experto en automatización de DMs de Instagram para la marca "${brand.name}".

${brandContext(brand)}

Generá una plantilla de respuesta automática para CADA uno de los siguientes intents.

Para cada intent definí:
- template: texto de respuesta (puede tener variables como {{nombre}})
- delay: minutos a esperar antes de auto-responder (0=inmediato)
- requiresApproval: si requiere que un humano apruebe antes de enviar

Guías de delay:
- spam → delay: 0 (responder de inmediato o no responder)
- queja-reclamo → delay: 1 (urgente, pero requiere aprobación)
- consulta-precio → delay: 5
- consulta-producto → delay: 5
- consulta-disponibilidad → delay: 5
- solicitud-presupuesto → delay: 10 (requiere aprobación siempre)
- seguimiento-compra → delay: 3
- colaboracion → delay: 15
- agradecimiento → delay: 30
- consulta-general → delay: 5
- otro → delay: 10

Respondé EXCLUSIVAMENTE con JSON válido con esta estructura:
{
  "templates": {
    "consulta-precio": { "template": "...", "delay": 5, "requiresApproval": false },
    "consulta-producto": { "template": "...", "delay": 5, "requiresApproval": false },
    "consulta-disponibilidad": { "template": "...", "delay": 5, "requiresApproval": false },
    "queja-reclamo": { "template": "...", "delay": 1, "requiresApproval": true },
    "agradecimiento": { "template": "...", "delay": 30, "requiresApproval": false },
    "colaboracion": { "template": "...", "delay": 15, "requiresApproval": true },
    "spam": { "template": "...", "delay": 0, "requiresApproval": false },
    "consulta-general": { "template": "...", "delay": 5, "requiresApproval": false },
    "solicitud-presupuesto": { "template": "...", "delay": 10, "requiresApproval": true },
    "seguimiento-compra": { "template": "...", "delay": 3, "requiresApproval": false },
    "otro": { "template": "...", "delay": 10, "requiresApproval": false }
  }
}`;

  let templates: Record<DMIntent, { template: string; delay: number; requiresApproval: boolean }>;

  try {
    const result = await askJson<AutoResponseTemplatesResponse>(prompt);
    templates = result.templates as Record<DMIntent, { template: string; delay: number; requiresApproval: boolean }>;
  } catch (err) {
    log.error(`[DMEngine] Error generando plantillas: ${(err as Error).message}`);
    // Fallback mínimo
    const defaultTemplate = {
      template: 'Hola! Gracias por escribirnos. Te respondemos a la brevedad.',
      delay: 5,
      requiresApproval: false,
    };
    templates = {
      'consulta-precio': { ...defaultTemplate, delay: 5 },
      'consulta-producto': { ...defaultTemplate, delay: 5 },
      'consulta-disponibilidad': { ...defaultTemplate, delay: 5 },
      'queja-reclamo': {
        template: 'Hola, lamentamos lo sucedido. Te contactamos a la brevedad para resolverlo.',
        delay: 1,
        requiresApproval: true,
      },
      agradecimiento: { template: 'Gracias por tu mensaje! 🙌', delay: 30, requiresApproval: false },
      colaboracion: {
        template: 'Gracias por escribirnos! Revisamos tu propuesta y te respondemos.',
        delay: 15,
        requiresApproval: true,
      },
      spam: { template: '', delay: 0, requiresApproval: false },
      'consulta-general': { ...defaultTemplate },
      'solicitud-presupuesto': {
        template: 'Recibimos tu solicitud de presupuesto. Te enviamos los detalles a la brevedad.',
        delay: 10,
        requiresApproval: true,
      },
      'seguimiento-compra': {
        template: 'Hola! Verificamos el estado de tu pedido y te avisamos.',
        delay: 3,
        requiresApproval: false,
      },
      otro: { ...defaultTemplate, delay: 10 },
    };
  }

  // Persistir en disco
  const dir = dmTemplatesDir();
  mkdirSync(dir, { recursive: true });
  const brandId = brand.name.toLowerCase().replace(/\s+/g, '-');
  const filePath = join(dir, `${brandId}.json`);
  writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
  log.success(`[DMEngine] Plantillas guardadas en ${filePath}`);

  return templates;
};

// ── Helpers de creación de conversaciones ─────────────────────────────────────

export const createDMConversation = (
  partial: Omit<
    DMConversation,
    'id' | 'createdAt' | 'lastMessageAt' | 'status' | 'tags' | 'value' | 'intent' | 'urgency'
  > &
    Partial<Pick<DMConversation, 'status' | 'tags' | 'value' | 'intent' | 'urgency'>>,
): DMConversation => {
  const now = new Date().toISOString();
  const lastMsg = partial.messages[partial.messages.length - 1];
  return {
    id: randomUUID(),
    status: 'nuevo',
    tags: [],
    value: 'unknown',
    intent: 'otro',
    urgency: 'baja',
    createdAt: now,
    lastMessageAt: lastMsg?.timestamp ?? now,
    ...partial,
  };
};

export const createDMMessage = (partial: Omit<DMMessage, 'id'>): DMMessage => ({
  id: randomUUID(),
  ...partial,
});
