/**
 * CU DM Responder — gestiona inbox IG vía Computer Use.
 *
 * Lee mensajes nuevos, clasifica intent (lead/soporte/colab/spam),
 * arma respuesta con tono de marca, escala a humano si requiere.
 *
 * Sin Anthropic call directo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const DM_DIR = path.resolve('data/cu/dm');

export type DMIntent =
  | 'lead-caliente'
  | 'lead-tibio'
  | 'soporte'
  | 'colaboracion'
  | 'feedback'
  | 'spam'
  | 'saludo'
  | 'pregunta-info'
  | 'reclamo'
  | 'agradecimiento';
export type DMAction =
  | 'auto-reply'
  | 'queue-for-human'
  | 'mark-as-lead'
  | 'mark-as-spam'
  | 'ignore'
  | 'escalate-urgent';
export type ConversationStage = 'first-message' | 'in-progress' | 'qualifying' | 'closing' | 'post-sale' | 'cold';

export interface DMThread {
  threadId: string;
  brandId: string;
  contactHandle: string;
  contactName?: string;
  contactIsFollower: boolean;
  contactFollowerCount?: number;
  messages: DMMessage[];
  stage: ConversationStage;
  lastActivityAt: string;
  unreadCount: number;
  isVerified: boolean;
  tags: string[];
}

export interface DMMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
  isRead: boolean;
  hasMedia: boolean;
  mediaType?: 'image' | 'video' | 'voice' | 'reel-share' | 'post-share';
}

export interface DMResponsePlan {
  threadId: string;
  messageId: string;
  intent: DMIntent;
  intentConfidence: number;
  action: DMAction;
  reply?: string;
  stage: ConversationStage;
  nextStepSuggestion?: string;
  shouldNotifyHuman: boolean;
  shouldAddToLeads: boolean;
  shouldMarkAsSpam: boolean;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  cuInstructions: string[];
  estimatedConversionProbability: number;
}

const LEAD_KEYWORDS = [
  'precio',
  'costo',
  'cu[aá]nto',
  'comprar',
  'adquirir',
  'me interesa',
  'quiero',
  'necesito',
  'busco',
  'puedo conseguir',
  'env[ií]os',
];
const SUPPORT_KEYWORDS = ['no funciona', 'problema', 'error', 'ayuda', 'no me llega', 'no anda', 'roto'];
const COLLAB_KEYWORDS = ['colab', 'colaboraci[oó]n', 'propuesta', 'trabajemos', 'union', 'partnership', 'sponsor'];
const SPAM_KEYWORDS = ['ganar dinero', 'inversi[oó]n', 'crypto', 'bitcoin', 'visit my', 'check my'];
const GREETING_KEYWORDS = ['hola', 'buenos d[ií]as', 'buenas', 'qu[eé] tal', 'saludos'];
const COMPLAINT_KEYWORDS = ['queja', 'reclamo', 'devoluci[oó]n', 'reembolso', 'cancelar', 'mal servicio'];

const matchAny = (text: string, keywords: string[]): boolean => {
  return keywords.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(text));
};

const classifyIntent = (
  message: string,
  threadContext?: { previousMessages: DMMessage[] },
): { intent: DMIntent; confidence: number } => {
  const t = message.toLowerCase().trim();
  if (matchAny(t, SPAM_KEYWORDS)) return { intent: 'spam', confidence: 0.9 };
  if (matchAny(t, COLLAB_KEYWORDS)) return { intent: 'colaboracion', confidence: 0.85 };
  if (matchAny(t, COMPLAINT_KEYWORDS)) return { intent: 'reclamo', confidence: 0.9 };
  if (matchAny(t, SUPPORT_KEYWORDS)) return { intent: 'soporte', confidence: 0.85 };
  if (matchAny(t, LEAD_KEYWORDS)) {
    const hasContext = threadContext && threadContext.previousMessages.length > 2;
    return { intent: hasContext ? 'lead-caliente' : 'lead-tibio', confidence: 0.8 };
  }
  if (/\b(gracias|grax|thx)\b/i.test(t)) return { intent: 'agradecimiento', confidence: 0.9 };
  if (matchAny(t, GREETING_KEYWORDS) && t.split(/\s+/).length < 6) return { intent: 'saludo', confidence: 0.8 };
  if (/\?$/.test(t) || /^(c[oó]mo|cu[aá]ndo|d[oó]nde|qu[eé])/i.test(t))
    return { intent: 'pregunta-info', confidence: 0.75 };
  return { intent: 'feedback', confidence: 0.5 };
};

const REPLY_TEMPLATES: Record<DMIntent, Array<string>> = {
  'lead-caliente': [
    '¡Hola {{name}}! Te paso info ahora mismo. ¿Buscás algo específico o querés que te cuente todo?',
    'Hola {{name}}, gracias por escribir. Decime un poco más sobre lo que necesitás y te armo propuesta concreta.',
  ],
  'lead-tibio': [
    'Hola {{name}}, ¡gracias por escribir! Contame qué buscás y te paso info útil.',
    '¡Hola! Te leí. Para ayudarte mejor, decime qué necesitás resolver exactamente.',
  ],
  soporte: [
    'Hola {{name}}, lamentamos esto. Contame qué pasó con detalle y lo resolvemos.',
    '{{name}}, te leo. Pasame fecha + número de pedido o capturas y vemos cómo arreglarlo.',
  ],
  colaboracion: [
    'Hola {{name}}, gracias por la propuesta. Pasala con detalle (qué proponés, cuándo, qué ofrecés) y la evaluamos en equipo.',
    '{{name}}, gracias. Mandanos un brief con la propuesta concreta y te respondemos en 48-72h.',
  ],
  feedback: [
    'Gracias por contarnos, {{name}}. Lo valoramos mucho.',
    '{{name}}, gracias por tomarte el tiempo. Lo registramos.',
  ],
  spam: [''],
  saludo: ['¡Hola {{name}}! ¿En qué te puedo ayudar?', 'Hola {{name}} 👋 Contame qué necesitás.'],
  'pregunta-info': ['¡Buena pregunta! Te respondo en detalle.', 'Hola {{name}}, te paso la info ahora.'],
  reclamo: [
    '{{name}}, lo lamentamos mucho. Vamos a resolverlo. Pasame todos los detalles: fecha, número de pedido, qué pasó.',
    'Hola {{name}}, gracias por avisarnos. Te derivamos a alguien para resolverlo cuanto antes.',
  ],
  agradecimiento: ['Gracias a vos, {{name}} 💛', '¡Lo valoramos, {{name}}! 🙌'],
};

const interpolate = (template: string, vars: Record<string, string>): string => {
  return template.replace(/{{(\w+)}}/g, (_, key) => vars[key] ?? '');
};

const decideAction = (
  intent: DMIntent,
  isVerified: boolean,
  followerCount?: number,
): {
  action: DMAction;
  priority: DMResponsePlan['priority'];
  notifyHuman: boolean;
  addToLeads: boolean;
  markAsSpam: boolean;
} => {
  switch (intent) {
    case 'lead-caliente':
      return { action: 'mark-as-lead', priority: 'urgent', notifyHuman: true, addToLeads: true, markAsSpam: false };
    case 'lead-tibio':
      return { action: 'auto-reply', priority: 'high', notifyHuman: false, addToLeads: true, markAsSpam: false };
    case 'soporte':
      return { action: 'queue-for-human', priority: 'high', notifyHuman: true, addToLeads: false, markAsSpam: false };
    case 'colaboracion': {
      const bigFish = isVerified || (followerCount ?? 0) > 50000;
      return {
        action: bigFish ? 'escalate-urgent' : 'queue-for-human',
        priority: bigFish ? 'urgent' : 'normal',
        notifyHuman: true,
        addToLeads: false,
        markAsSpam: false,
      };
    }
    case 'reclamo':
      return { action: 'escalate-urgent', priority: 'urgent', notifyHuman: true, addToLeads: false, markAsSpam: false };
    case 'spam':
      return { action: 'mark-as-spam', priority: 'low', notifyHuman: false, addToLeads: false, markAsSpam: true };
    case 'feedback':
    case 'agradecimiento':
    case 'saludo':
    case 'pregunta-info':
      return { action: 'auto-reply', priority: 'normal', notifyHuman: false, addToLeads: false, markAsSpam: false };
  }
};

const determineStage = (thread: DMThread): ConversationStage => {
  if (thread.messages.length === 1 && !thread.messages[0]!.fromMe) return 'first-message';
  if (thread.messages.length < 4) return 'in-progress';
  const recentLeadWords = thread.messages.slice(-5).some((m) => m.fromMe && /precio|env[ií]o|stock|pago/i.test(m.text));
  if (recentLeadWords) return 'qualifying';
  const recentClosing = thread.messages
    .slice(-3)
    .some((m) => m.fromMe && /comprado|confirmad|recibido|hecho/i.test(m.text));
  if (recentClosing) return 'post-sale';
  const hoursSinceLast = (Date.now() - new Date(thread.lastActivityAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceLast > 168) return 'cold';
  return 'in-progress';
};

const estimateConversionProbability = (intent: DMIntent, stage: ConversationStage, isFollower: boolean): number => {
  let prob = 0;
  if (intent === 'lead-caliente') prob = 0.6;
  else if (intent === 'lead-tibio') prob = 0.3;
  else if (intent === 'pregunta-info') prob = 0.2;
  else if (intent === 'colaboracion') prob = 0.15;
  else prob = 0.05;
  if (stage === 'qualifying') prob *= 1.5;
  if (stage === 'closing') prob *= 2;
  if (isFollower) prob *= 1.2;
  return Math.min(1, prob);
};

const buildCuInstructions = (
  thread: DMThread,
  plan: Pick<DMResponsePlan, 'action' | 'reply' | 'shouldNotifyHuman' | 'shouldAddToLeads' | 'shouldMarkAsSpam'>,
): string[] => {
  const steps: string[] = [];
  steps.push(`1. Abrir Instagram → Inbox (ícono avión)`);
  steps.push(`2. Localizar chat con @${thread.contactHandle}`);
  steps.push(`3. Abrir thread`);
  steps.push(`4. Leer último mensaje del usuario`);

  if (plan.action === 'auto-reply' || plan.action === 'mark-as-lead') {
    if (plan.reply) {
      steps.push(`5. Tap input de mensaje`);
      steps.push(`6. Escribir respuesta: "${plan.reply}"`);
      steps.push(`7. Tap enviar (avión azul)`);
    }
  }
  if (plan.shouldAddToLeads) {
    steps.push(`${steps.length + 1}. Tap ícono ⓘ arriba derecha → "Etiquetar" → agregar tag "lead"`);
  }
  if (plan.shouldMarkAsSpam) {
    steps.push(`${steps.length + 1}. Tap "..." → "Marcar como spam"`);
  }
  if (plan.action === 'queue-for-human' || plan.action === 'escalate-urgent') {
    steps.push(`${steps.length + 1}. Etiquetar conversación como "human-review"`);
    steps.push(`${steps.length + 1}. NO responder automáticamente`);
  }
  if (plan.shouldNotifyHuman) {
    steps.push(`${steps.length + 1}. (Sistema) Enviar notification al owner con resumen + link al chat`);
  }
  steps.push(`${steps.length + 1}. Marcar mensaje como leído`);
  return steps;
};

export const planDMResponse = (thread: DMThread, brandTone = 'cálido'): DMResponsePlan => {
  const lastMessage = [...thread.messages].reverse().find((m) => !m.fromMe);
  if (!lastMessage) {
    return {
      threadId: thread.threadId,
      messageId: '',
      intent: 'feedback',
      intentConfidence: 0,
      action: 'ignore',
      stage: thread.stage,
      shouldNotifyHuman: false,
      shouldAddToLeads: false,
      shouldMarkAsSpam: false,
      priority: 'low',
      cuInstructions: [],
      estimatedConversionProbability: 0,
    };
  }

  const { intent, confidence } = classifyIntent(lastMessage.text, { previousMessages: thread.messages });
  const stage = determineStage(thread);
  const { action, priority, notifyHuman, addToLeads, markAsSpam } = decideAction(
    intent,
    thread.isVerified,
    thread.contactFollowerCount,
  );
  const templates = REPLY_TEMPLATES[intent];
  const template = templates[Math.floor(Math.random() * templates.length)] ?? templates[0]!;
  const reply = template ? interpolate(template, { name: thread.contactName ?? thread.contactHandle }) : undefined;

  const plan: DMResponsePlan = {
    threadId: thread.threadId,
    messageId: lastMessage.id,
    intent,
    intentConfidence: confidence,
    action,
    reply: action === 'auto-reply' || action === 'mark-as-lead' ? reply : undefined,
    stage,
    nextStepSuggestion:
      stage === 'qualifying'
        ? 'Pedir más data (presupuesto, urgencia)'
        : stage === 'closing'
          ? 'Cerrar venta + agradecer'
          : undefined,
    shouldNotifyHuman: notifyHuman,
    shouldAddToLeads: addToLeads,
    shouldMarkAsSpam: markAsSpam,
    priority,
    cuInstructions: [],
    estimatedConversionProbability: estimateConversionProbability(intent, stage, thread.contactIsFollower),
  };
  plan.cuInstructions = buildCuInstructions(thread, plan);
  void brandTone;
  return plan;
};

const queuePath = (brandId: string): string => path.join(DM_DIR, `${brandId}-queue.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(DM_DIR, { recursive: true });
};

export const queueDMResponse = async (brandId: string, thread: DMThread, plan: DMResponsePlan): Promise<void> => {
  await ensureDir();
  const file = queuePath(brandId);
  let queue: Array<{
    thread: DMThread;
    plan: DMResponsePlan;
    status: 'queued' | 'executed' | 'failed';
    queuedAt: string;
  }> = [];
  try {
    queue = JSON.parse(await fs.readFile(file, 'utf-8')) as typeof queue;
  } catch {
    /* noop */
  }
  queue.push({ thread, plan, status: 'queued', queuedAt: new Date().toISOString() });
  await fs.writeFile(file, JSON.stringify(queue.slice(-500), null, 2), 'utf-8');
  log.info('[cuDMResponder] queued', { brandId, threadId: thread.threadId, intent: plan.intent, action: plan.action });
};

export const processInbox = async (
  brandId: string,
  threads: DMThread[],
): Promise<{
  total: number;
  byIntent: Record<string, number>;
  byAction: Record<string, number>;
  urgentLeads: number;
  conversionsPotential: number;
}> => {
  const byIntent: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  let urgentLeads = 0;
  let conversionsPotential = 0;
  for (const thread of threads) {
    const plan = planDMResponse(thread);
    byIntent[plan.intent] = (byIntent[plan.intent] ?? 0) + 1;
    byAction[plan.action] = (byAction[plan.action] ?? 0) + 1;
    if (plan.priority === 'urgent') urgentLeads++;
    conversionsPotential += plan.estimatedConversionProbability;
    await queueResponse(brandId, thread, plan);
  }
  log.info('[cuDMResponder] inbox processed', { brandId, total: threads.length, urgent: urgentLeads });
  return { total: threads.length, byIntent, byAction, urgentLeads, conversionsPotential };
};

const queueResponse = queueDMResponse;

export const getQueuedDMs = async (
  brandId: string,
): Promise<Array<{ thread: DMThread; plan: DMResponsePlan; status: string; queuedAt: string }>> => {
  try {
    const all = JSON.parse(await fs.readFile(queuePath(brandId), 'utf-8')) as Array<{
      thread: DMThread;
      plan: DMResponsePlan;
      status: 'queued' | 'executed' | 'failed';
      queuedAt: string;
    }>;
    return all
      .filter((r) => r.status === 'queued')
      .sort((a, b) => {
        const pri: Record<DMResponsePlan['priority'], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        return pri[a.plan.priority] - pri[b.plan.priority];
      });
  } catch {
    return [];
  }
};

export const buildBatchCuScript = async (brandId: string, limit = 15): Promise<string> => {
  const queued = (await getQueuedDMs(brandId)).slice(0, limit);
  const lines: string[] = [];
  lines.push(`TASK: Procesar ${queued.length} DMs de Instagram en batch.`);
  lines.push(`PRIORIDAD: urgent → high → normal → low.`);
  lines.push('');
  for (let i = 0; i < queued.length; i++) {
    const { thread, plan } = queued[i]!;
    lines.push(`════ DM ${i + 1}/${queued.length} (${plan.priority}) ════`);
    lines.push(
      `Contacto: @${thread.contactHandle}${thread.isVerified ? ' ✓' : ''}${thread.contactFollowerCount ? ` (${thread.contactFollowerCount.toLocaleString()} followers)` : ''}`,
    );
    lines.push(`Stage: ${plan.stage} · Intent: ${plan.intent} (${(plan.intentConfidence * 100).toFixed(0)}%)`);
    lines.push(`Convert prob: ${(plan.estimatedConversionProbability * 100).toFixed(0)}%`);
    lines.push(`Acción: ${plan.action}${plan.reply ? ` con reply "${plan.reply}"` : ''}`);
    if (plan.nextStepSuggestion) lines.push(`Next step: ${plan.nextStepSuggestion}`);
    lines.push('Pasos:');
    for (const s of plan.cuInstructions) lines.push(`  ${s}`);
    lines.push('');
  }
  return lines.join('\n');
};
