/**
 * CU Comment Responder — responde comentarios IG vía Computer Use.
 *
 * Lee comments, clasifica intent (positivo/pregunta/queja/spam), genera respuesta
 * con tono de marca, posiciona reply, like, hide, o report según política.
 *
 * Sin Anthropic call directo — usa templates + reglas. Caller puede enriquecer
 * con LLM si decide.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const COMMENT_DIR = path.resolve('data/cu/comments');

export type CommentIntent =
  | 'praise'
  | 'question'
  | 'complaint'
  | 'sales-lead'
  | 'spam'
  | 'troll'
  | 'neutral'
  | 'mention-friend';
export type CommentAction = 'reply' | 'like' | 'like-and-reply' | 'hide' | 'report' | 'pin' | 'ignore';
export type ReplyTone = 'cálido' | 'profesional' | 'humorístico' | 'firme' | 'empático' | 'corto';

export interface IncomingComment {
  id: string;
  postId: string;
  postUrl: string;
  authorHandle: string;
  authorIsFollower: boolean;
  text: string;
  postedAt: string;
  likeCount: number;
  isReplyToComment: boolean;
  parentCommentId?: string;
  detectedLanguage: string;
}

export interface CommentResponsePlan {
  commentId: string;
  intent: CommentIntent;
  intentConfidence: number;
  action: CommentAction;
  reply?: string;
  tone?: ReplyTone;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'skip';
  reasoning: string;
  shouldPin: boolean;
  shouldHide: boolean;
  shouldReport: boolean;
  cuInstructions: string[];
}

const SPAM_PATTERNS = [
  /\b(visit my profile|check my bio|click link)\b/i,
  /\b(crypto|bitcoin|investment opportunity)\b/i,
  /💰💰💰|🔥🔥🔥|⚡⚡⚡/,
  /^[👋🙌👌🔥]{3,}$/,
  /^\.+$|^\?+$/,
  /\b(free followers|gain followers|f4f)\b/i,
];

const TROLL_PATTERNS = [
  /\b(basura|garbage|trash|inútil|patético|mediocre)\b/i,
  /\b(estúpid[oa]|idiota|imbécil|tonto)\b/i,
  /[¿!?¡]{4,}/,
];

const QUESTION_PATTERNS = [
  /\?$/,
  /\b(c[oó]mo|cu[aá]ndo|d[oó]nde|qu[eé]|por qu[eé]|cu[aá]nto|cu[aá]l)\b/i,
  /\b(me pueden|alguien sabe|info sobre)\b/i,
];

const COMPLAINT_PATTERNS = [
  /\b(no funciona|no anda|no llega|defectuos|mal hecho)\b/i,
  /\b(quiero (mi )?devoluci[oó]n|reembolso|cancelar)\b/i,
  /\b(estafa|fraude|mentira|enga[ñn]o)\b/i,
];

const SALES_LEAD_PATTERNS = [
  /\b(precio|costo|cu[aá]nto sale|cu[aá]nto vale)\b/i,
  /\b(quiero (comprar|adquirir)|me interesa)\b/i,
  /\b(d[oó]nde compro|c[oó]mo lo consigo)\b/i,
  /\b(env[ií]o|env[ií]an|hacen env[ií]os)\b/i,
];

const PRAISE_PATTERNS = [
  /\b(genial|excelente|increíble|me encanta|me encantó|qué buen[oa]|hermos[oa])\b/i,
  /\b(love|amazing|awesome|great|brilliant)\b/i,
  /❤️|🔥|👏|💪|🙌|✨/,
];

const MENTION_FRIEND_PATTERN = /@\w+/;

const detectIntent = (text: string): { intent: CommentIntent; confidence: number } => {
  const t = text.toLowerCase().trim();
  if (SPAM_PATTERNS.some((p) => p.test(t))) return { intent: 'spam', confidence: 0.9 };
  if (TROLL_PATTERNS.some((p) => p.test(t))) return { intent: 'troll', confidence: 0.8 };
  if (COMPLAINT_PATTERNS.some((p) => p.test(t))) return { intent: 'complaint', confidence: 0.85 };
  if (SALES_LEAD_PATTERNS.some((p) => p.test(t))) return { intent: 'sales-lead', confidence: 0.9 };
  if (QUESTION_PATTERNS.some((p) => p.test(t))) return { intent: 'question', confidence: 0.8 };
  if (PRAISE_PATTERNS.some((p) => p.test(t))) return { intent: 'praise', confidence: 0.85 };
  if (MENTION_FRIEND_PATTERN.test(t) && t.split(/\s+/).length < 5) return { intent: 'mention-friend', confidence: 0.7 };
  return { intent: 'neutral', confidence: 0.5 };
};

const REPLY_TEMPLATES: Record<CommentIntent, Array<{ text: string; tone: ReplyTone }>> = {
  praise: [
    { text: '¡Gracias, {{author}}! 🙌', tone: 'cálido' },
    { text: 'Mil gracias, {{author}} 💛', tone: 'cálido' },
    { text: 'Esto nos hace el día, {{author}} ✨', tone: 'cálido' },
  ],
  question: [
    { text: 'Buena pregunta, {{author}}. Te respondo por DM con detalle 📩', tone: 'profesional' },
    { text: '¡Gracias por preguntar, {{author}}! Te paso info al privado.', tone: 'profesional' },
    { text: 'Te respondo por DM en breve, {{author}}.', tone: 'corto' },
  ],
  complaint: [
    { text: 'Lamentamos esto, {{author}}. Te escribimos por DM para resolverlo cuanto antes.', tone: 'empático' },
    { text: '{{author}}, gracias por avisarnos. Pasamos al DM para encontrarte solución.', tone: 'empático' },
  ],
  'sales-lead': [
    { text: '{{author}}, te paso info por DM 📩', tone: 'corto' },
    { text: 'Hola {{author}}, ya te escribimos al privado con todos los detalles.', tone: 'profesional' },
    { text: 'Te escribimos al DM, {{author}} 💌', tone: 'cálido' },
  ],
  spam: [{ text: '', tone: 'corto' }],
  troll: [{ text: '', tone: 'firme' }],
  neutral: [
    { text: 'Gracias por el comentario, {{author}}.', tone: 'corto' },
    { text: '{{author}} 👋', tone: 'corto' },
  ],
  'mention-friend': [{ text: '¡Hola, gracias por compartir! 🙌', tone: 'cálido' }],
};

const interpolate = (template: string, vars: Record<string, string>): string => {
  return template.replace(/{{(\w+)}}/g, (_, key) => vars[key] ?? '');
};

const decideAction = (
  intent: CommentIntent,
): {
  action: CommentAction;
  priority: CommentResponsePlan['priority'];
  shouldPin: boolean;
  shouldHide: boolean;
  shouldReport: boolean;
} => {
  switch (intent) {
    case 'spam':
      return { action: 'hide', priority: 'high', shouldPin: false, shouldHide: true, shouldReport: false };
    case 'troll':
      return { action: 'hide', priority: 'high', shouldPin: false, shouldHide: true, shouldReport: false };
    case 'complaint':
      return { action: 'reply', priority: 'critical', shouldPin: false, shouldHide: false, shouldReport: false };
    case 'sales-lead':
      return {
        action: 'like-and-reply',
        priority: 'critical',
        shouldPin: false,
        shouldHide: false,
        shouldReport: false,
      };
    case 'question':
      return { action: 'like-and-reply', priority: 'high', shouldPin: false, shouldHide: false, shouldReport: false };
    case 'praise':
      return { action: 'like-and-reply', priority: 'medium', shouldPin: true, shouldHide: false, shouldReport: false };
    case 'mention-friend':
      return { action: 'like', priority: 'low', shouldPin: false, shouldHide: false, shouldReport: false };
    case 'neutral':
      return { action: 'like', priority: 'low', shouldPin: false, shouldHide: false, shouldReport: false };
  }
};

const buildCuInstructions = (
  comment: IncomingComment,
  plan: Pick<CommentResponsePlan, 'action' | 'reply' | 'shouldPin' | 'shouldHide' | 'shouldReport'>,
): string[] => {
  const steps: string[] = [];
  steps.push(`1. Abrir post ${comment.postUrl}`);
  steps.push(
    `2. Buscar comentario de @${comment.authorHandle} que dice: "${comment.text.slice(0, 80)}${comment.text.length > 80 ? '...' : ''}"`,
  );

  if (plan.action === 'like' || plan.action === 'like-and-reply') {
    steps.push(`3. Tap ícono ❤️ junto al comentario`);
  }
  if ((plan.action === 'reply' || plan.action === 'like-and-reply') && plan.reply) {
    steps.push(`${plan.action === 'like-and-reply' ? '4' : '3'}. Tap "Responder" debajo del comentario`);
    steps.push(`${plan.action === 'like-and-reply' ? '5' : '4'}. Escribir: "${plan.reply}"`);
    steps.push(`${plan.action === 'like-and-reply' ? '6' : '5'}. Tap "Publicar"`);
  }
  if (plan.shouldPin) {
    steps.push(`${steps.length + 1}. Swipe izquierda sobre el comentario → Pin / Fijar`);
  }
  if (plan.shouldHide) {
    steps.push(`${steps.length + 1}. Swipe izquierda sobre el comentario → Ocultar`);
  }
  if (plan.shouldReport) {
    steps.push(`${steps.length + 1}. Tap "..." → Reportar → Spam o motivo correspondiente`);
  }
  steps.push(`${steps.length + 1}. Capturar screenshot de confirmación`);
  return steps;
};

export const planResponse = (comment: IncomingComment, brandTone: ReplyTone = 'cálido'): CommentResponsePlan => {
  const { intent, confidence } = detectIntent(comment.text);
  const { action, priority, shouldPin, shouldHide, shouldReport } = decideAction(intent);

  const templates = REPLY_TEMPLATES[intent];
  const template = templates[Math.floor(Math.random() * templates.length)] ?? templates[0]!;
  const reply = template.text ? interpolate(template.text, { author: comment.authorHandle }) : undefined;

  const plan: CommentResponsePlan = {
    commentId: comment.id,
    intent,
    intentConfidence: confidence,
    action,
    reply,
    tone: template.tone ?? brandTone,
    priority,
    reasoning: `Intent ${intent} (conf ${(confidence * 100).toFixed(0)}%) → action ${action}`,
    shouldPin,
    shouldHide,
    shouldReport,
    cuInstructions: [],
  };
  plan.cuInstructions = buildCuInstructions(comment, plan);
  return plan;
};

const responsesPath = (brandId: string): string => path.join(COMMENT_DIR, `${brandId}-responses.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(COMMENT_DIR, { recursive: true });
};

export const queueResponse = async (
  brandId: string,
  comment: IncomingComment,
  plan: CommentResponsePlan,
): Promise<void> => {
  await ensureDir();
  const file = responsesPath(brandId);
  let queue: Array<{
    comment: IncomingComment;
    plan: CommentResponsePlan;
    status: 'queued' | 'executed' | 'failed';
    queuedAt: string;
  }> = [];
  try {
    queue = JSON.parse(await fs.readFile(file, 'utf-8')) as typeof queue;
  } catch {
    /* noop */
  }
  queue.push({ comment, plan, status: 'queued', queuedAt: new Date().toISOString() });
  await fs.writeFile(file, JSON.stringify(queue.slice(-500), null, 2), 'utf-8');
  log.info('[cuCommentResponder] queued', { brandId, commentId: comment.id, intent: plan.intent, action: plan.action });
};

export const processBatch = async (
  brandId: string,
  comments: IncomingComment[],
): Promise<{
  totalProcessed: number;
  byIntent: Record<string, number>;
  byAction: Record<string, number>;
  criticalCount: number;
}> => {
  const byIntent: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  let criticalCount = 0;
  for (const comment of comments) {
    const plan = planResponse(comment);
    byIntent[plan.intent] = (byIntent[plan.intent] ?? 0) + 1;
    byAction[plan.action] = (byAction[plan.action] ?? 0) + 1;
    if (plan.priority === 'critical') criticalCount++;
    await queueResponse(brandId, comment, plan);
  }
  log.info('[cuCommentResponder] batch processed', { brandId, total: comments.length, critical: criticalCount });
  return { totalProcessed: comments.length, byIntent, byAction, criticalCount };
};

export const getQueuedResponses = async (
  brandId: string,
): Promise<Array<{ comment: IncomingComment; plan: CommentResponsePlan; status: string; queuedAt: string }>> => {
  try {
    const all = JSON.parse(await fs.readFile(responsesPath(brandId), 'utf-8')) as Array<{
      comment: IncomingComment;
      plan: CommentResponsePlan;
      status: 'queued' | 'executed' | 'failed';
      queuedAt: string;
    }>;
    return all
      .filter((r) => r.status === 'queued')
      .sort((a, b) => {
        const priOrder: Record<CommentResponsePlan['priority'], number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
          skip: 4,
        };
        return priOrder[a.plan.priority] - priOrder[b.plan.priority];
      });
  } catch {
    return [];
  }
};

export const buildBatchCuScript = async (brandId: string, limit = 20): Promise<string> => {
  const queued = (await getQueuedResponses(brandId)).slice(0, limit);
  const lines: string[] = [];
  lines.push(`TASK: Procesar ${queued.length} comentarios de Instagram en batch.`);
  lines.push(`PRIORIDAD: críticos primero, después high, después resto.`);
  lines.push('');
  for (let i = 0; i < queued.length; i++) {
    const { comment, plan } = queued[i]!;
    lines.push(`════ COMENTARIO ${i + 1}/${queued.length} (${plan.priority}) ════`);
    lines.push(`Autor: @${comment.authorHandle}${comment.authorIsFollower ? ' (sigue)' : ' (no sigue)'}`);
    lines.push(`Post: ${comment.postUrl}`);
    lines.push(`Texto: "${comment.text}"`);
    lines.push(`Intent detectado: ${plan.intent} (${(plan.intentConfidence * 100).toFixed(0)}%)`);
    lines.push(`Acción: ${plan.action}${plan.reply ? ` con reply "${plan.reply}"` : ''}`);
    lines.push('Pasos:');
    for (const s of plan.cuInstructions) lines.push(`  ${s}`);
    lines.push('');
  }
  return lines.join('\n');
};
