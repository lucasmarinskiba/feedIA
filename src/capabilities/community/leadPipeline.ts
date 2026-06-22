/**
 * Lead Pipeline de FeedIA — CRM lite con scoring, etapas y follow-ups automáticos.
 *
 * Reemplaza al CM/SDR que detecta leads en DMs y los califica. Mantiene el pipeline
 * estilo Kanban (new → qualified → engaged → proposal → won/lost), aplica scoring
 * automático con BANT/MEDDIC y dispara follow-ups en momentos óptimos.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getConversation, appendOurReply, addPromise } from './dmInbox.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

const PIPELINE_PATH = join(process.cwd(), 'data', 'community', 'lead-pipeline.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type LeadStage =
  | 'new' // recién detectado
  | 'qualified' // pasó el filtro BANT mínimo
  | 'engaged' // conversación activa de venta
  | 'proposal' // propuesta enviada / link compartido
  | 'negotiation' // discutiendo precio/términos
  | 'won' // cliente
  | 'lost' // se perdió
  | 'nurture'; // no compra ahora pero seguimos en contacto

export interface LeadScore {
  budget: number; // 0-25 (BANT: Budget)
  authority: number; // 0-25 (Authority)
  need: number; // 0-25 (Need)
  timeline: number; // 0-25 (Timeline)
  total: number; // suma 0-100
  classification: 'cold' | 'warm' | 'hot' | 'unqualified';
}

export interface FollowUp {
  id: string;
  scheduledFor: string; // ISO
  status: 'pending' | 'sent' | 'cancelled';
  template: string; // template id o texto
  context: string;
  reason: string;
  sentAt?: string;
}

export interface Lead {
  id: string;
  conversationId: string;
  contactUsername: string;
  contactDisplayName?: string;
  source: 'dm-direct' | 'comment-lead' | 'story-reply' | 'mention' | 'profile-visit' | 'referral';
  stage: LeadStage;
  score: LeadScore;
  productInterest: string;
  estimatedValue?: { amount: number; currency: string };
  objections: string[];
  promisesMade: string[];
  nextStepDescription: string;
  followUps: FollowUp[];
  timeline: Array<{ at: string; event: string; stage?: LeadStage }>;
  attachedGoalId?: string;
  ownerAgent: 'luca' | 'max' | 'human';
  createdAt: string;
  updatedAt: string;
  wonAt?: string;
  lostAt?: string;
  lossReason?: string;
  notes: string[];
}

interface PipelineStore {
  version: number;
  leads: Lead[];
  conversionStats: {
    totalLeadsLast30Days: number;
    wonLast30Days: number;
    lostLast30Days: number;
    avgTimeToWonDays: number;
    totalRevenueLast30Days: number;
  };
  lastUpdated: string;
}

const DEFAULT_STORE: PipelineStore = {
  version: 1,
  leads: [],
  conversionStats: {
    totalLeadsLast30Days: 0,
    wonLast30Days: 0,
    lostLast30Days: 0,
    avgTimeToWonDays: 0,
    totalRevenueLast30Days: 0,
  },
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadPipeline = (): PipelineStore => {
  try {
    ensureDir();
    if (!existsSync(PIPELINE_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(PIPELINE_PATH, 'utf8')) as PipelineStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const savePipeline = (store: PipelineStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PIPELINE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Scoring BANT ──────────────────────────────────────────────────────────────

export const computeLeadScore = (signals: {
  hasBudget?: boolean;
  budgetAmount?: number;
  isDecisionMaker?: boolean;
  hasUrgency?: boolean;
  problemSeverity?: 'low' | 'medium' | 'high' | 'critical';
  hasTimeline?: boolean;
  timelineDays?: number;
}): LeadScore => {
  let budget = 0;
  let authority = 0;
  let need = 0;
  let timeline = 0;

  if (signals.hasBudget) budget += 15;
  if (signals.budgetAmount && signals.budgetAmount > 0) budget = Math.min(25, budget + 10);

  if (signals.isDecisionMaker) authority += 25;
  else if (signals.isDecisionMaker === false) authority += 5; // mencionó que tiene que consultar = al menos sabe quien decide

  if (signals.problemSeverity === 'critical') need = 25;
  else if (signals.problemSeverity === 'high') need = 20;
  else if (signals.problemSeverity === 'medium') need = 12;
  else if (signals.problemSeverity === 'low') need = 5;

  if (signals.hasUrgency) timeline = Math.min(25, timeline + 15);
  if (signals.timelineDays !== undefined) {
    if (signals.timelineDays <= 7) timeline = 25;
    else if (signals.timelineDays <= 30) timeline = 18;
    else if (signals.timelineDays <= 90) timeline = 10;
    else timeline = 3;
  }

  const total = budget + authority + need + timeline;
  const classification: LeadScore['classification'] =
    total >= 75 ? 'hot' : total >= 50 ? 'warm' : total >= 25 ? 'cold' : 'unqualified';

  return { budget, authority, need, timeline, total, classification };
};

// ── Análisis BANT desde conversación ──────────────────────────────────────────

export const extractBANTFromConversation = async (
  conversationId: string,
  brand: BrandProfile,
): Promise<{
  hasBudget: boolean;
  budgetAmount?: number;
  isDecisionMaker?: boolean;
  hasUrgency: boolean;
  problemSeverity: 'low' | 'medium' | 'high' | 'critical';
  hasTimeline: boolean;
  timelineDays?: number;
  productInterest: string;
  objections: string[];
}> => {
  const conv = getConversation(conversationId);
  if (!conv) throw new Error(`Conversación ${conversationId} no encontrada`);

  const dialog = conv.messages
    .slice(-15)
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');

  const prompt = `Sos un SDR senior analizando una conversación de DM para extraer señales BANT.

MARCA: ${brand.name} | Nicho: ${brand.niche}

CONVERSACIÓN:
${dialog}

JSON:
{
  "hasBudget": boolean (si mencionaron presupuesto / capacidad de pago),
  "budgetAmount": número en USD (si lo mencionaron explícitamente),
  "isDecisionMaker": boolean (si parece poder decidir solo),
  "hasUrgency": boolean (si hay deadline o motivo de urgencia),
  "problemSeverity": "low | medium | high | critical",
  "hasTimeline": boolean,
  "timelineDays": número (si mencionaron cuándo quieren empezar),
  "productInterest": "qué producto / servicio le interesa (1 línea)",
  "objections": ["objeciones específicas planteadas"]
}`;

  return routerAskJson<{
    hasBudget: boolean;
    budgetAmount?: number;
    isDecisionMaker?: boolean;
    hasUrgency: boolean;
    problemSeverity: 'low' | 'medium' | 'high' | 'critical';
    hasTimeline: boolean;
    timelineDays?: number;
    productInterest: string;
    objections: string[];
  }>(prompt, {
    taskType: 'analysis',
    maxTokens: 1500,
    systemPrompt:
      'Sos un SDR experimentado, leés señales sutiles. Si no podés inferir algo, devolvé el valor más conservador.',
  });
};

// ── Crear lead ────────────────────────────────────────────────────────────────

export const createLead = async (input: {
  conversationId: string;
  source?: Lead['source'];
  productInterest?: string;
  estimatedValue?: Lead['estimatedValue'];
  goalId?: string;
}): Promise<Lead> => {
  const conv = getConversation(input.conversationId);
  if (!conv) throw new Error(`Conversación ${input.conversationId} no encontrada`);
  const brand = loadBrandProfile();

  // Extraer BANT si la conversación tiene suficiente historia
  let bantSignals;
  let score: LeadScore;
  let productInterest = input.productInterest ?? 'sin definir';
  let objections: string[] = [];

  if (conv.messages.length >= 2) {
    try {
      bantSignals = await extractBANTFromConversation(input.conversationId, brand);
      score = computeLeadScore(bantSignals);
      productInterest = bantSignals.productInterest;
      objections = bantSignals.objections;
    } catch {
      score = { budget: 0, authority: 0, need: 5, timeline: 0, total: 5, classification: 'cold' };
    }
  } else {
    score = { budget: 0, authority: 0, need: 5, timeline: 0, total: 5, classification: 'cold' };
  }

  const lead: Lead = {
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    conversationId: input.conversationId,
    contactUsername: conv.contact.username,
    contactDisplayName: conv.contact.displayName,
    source: input.source ?? 'dm-direct',
    stage: score.classification === 'unqualified' ? 'nurture' : 'new',
    score,
    productInterest,
    estimatedValue: input.estimatedValue,
    objections,
    promisesMade: [...conv.context.promisesMade],
    nextStepDescription:
      score.classification === 'hot' ? 'Agendar llamada o cerrar venta' : 'Calificar mejor con preguntas BANT',
    followUps: [],
    timeline: [{ at: new Date().toISOString(), event: 'Lead creado', stage: 'new' }],
    attachedGoalId: input.goalId,
    ownerAgent: score.classification === 'hot' ? 'luca' : score.classification === 'warm' ? 'luca' : 'max',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
  };

  const store = loadPipeline();
  store.leads.push(lead);
  if (store.leads.length > 1000) store.leads = store.leads.slice(-1000);
  savePipeline(store);

  log.info(
    `[LeadPipeline] Lead creado para @${conv.contact.username}: score=${score.total}/100 (${score.classification})`,
  );

  if (score.classification === 'hot') {
    await sendAlert({
      severity: 'lead',
      title: `🔥 Hot lead: @${conv.contact.username}`,
      body: `Score: ${score.total}/100 (B:${score.budget} A:${score.authority} N:${score.need} T:${score.timeline})\nInterés: ${productInterest}\nNext: ${lead.nextStepDescription}`,
      metadata: { leadId: lead.id },
    }).catch(() => undefined);
  }

  return lead;
};

// ── Transiciones de stage ────────────────────────────────────────────────────

export const advanceLeadStage = (
  leadId: string,
  newStage: LeadStage,
  note?: string,
  valueDelta?: number,
): Lead | null => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;

  const oldStage = lead.stage;
  lead.stage = newStage;
  lead.updatedAt = new Date().toISOString();
  lead.timeline.push({
    at: new Date().toISOString(),
    event: `Stage ${oldStage} → ${newStage}${note ? `: ${note}` : ''}`,
    stage: newStage,
  });

  if (newStage === 'won') {
    lead.wonAt = new Date().toISOString();
    if (valueDelta !== undefined && lead.estimatedValue) {
      lead.estimatedValue.amount = valueDelta;
    }
  }
  if (newStage === 'lost') {
    lead.lostAt = new Date().toISOString();
    if (note) lead.lossReason = note;
  }

  savePipeline(store);

  if (newStage === 'won') {
    log.info(
      `[LeadPipeline] 💰 Lead WON: @${lead.contactUsername} (${lead.estimatedValue?.amount ?? '?'} ${lead.estimatedValue?.currency ?? 'USD'})`,
    );
  }
  return lead;
};

// ── Follow-ups programados ────────────────────────────────────────────────────

export const scheduleFollowUp = (
  leadId: string,
  input: {
    daysFromNow: number;
    template: string;
    context: string;
    reason: string;
  },
): FollowUp | null => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;

  const scheduledFor = new Date(Date.now() + input.daysFromNow * 86400000).toISOString();
  const followUp: FollowUp = {
    id: `fu-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    scheduledFor,
    status: 'pending',
    template: input.template,
    context: input.context,
    reason: input.reason,
  };
  lead.followUps.push(followUp);
  lead.timeline.push({
    at: new Date().toISOString(),
    event: `Follow-up programado para ${scheduledFor.split('T')[0]}: ${input.reason}`,
  });
  savePipeline(store);
  return followUp;
};

// ── Ejecutar follow-ups que están "due" ──────────────────────────────────────

export const processFollowUpsDue = async (
  brand?: BrandProfile,
): Promise<{ processed: number; sent: number; failed: number }> => {
  const store = loadPipeline();
  const b = brand ?? loadBrandProfile();
  const now = Date.now();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const lead of store.leads) {
    if (lead.stage === 'won' || lead.stage === 'lost') continue;

    for (const fu of lead.followUps) {
      if (fu.status !== 'pending') continue;
      const due = new Date(fu.scheduledFor).getTime();
      if (due > now) continue;
      processed++;

      try {
        // Generar mensaje contextualizado
        const prompt = `Generá un follow-up de venta no invasivo para este lead.

LEAD: @${lead.contactUsername} (stage: ${lead.stage}, score: ${lead.score.total}/100, ${lead.score.classification})
PRODUCTO: ${lead.productInterest}
RAZÓN DEL FOLLOW-UP: ${fu.reason}
CONTEXTO: ${fu.context}
TEMPLATE BASE: ${fu.template}
OBJECIONES PASADAS: ${lead.objections.join(' | ') || '(ninguna)'}
PROMESAS QUE HICIMOS: ${lead.promisesMade.join(' | ') || '(ninguna)'}

MARCA: ${b.name} | TONO: ${b.voice.tone.join(', ')}

El mensaje debe:
- No empezar con "Hola" si ya hubo conversación antes
- Mencionar de qué estábamos hablando
- Ofrecer un siguiente paso concreto
- Máximo 280 caracteres
- Suena humano, no automatizado

Devolvé SOLO el mensaje, sin prefijos.`;

        const { ask } = await import('../../agent/tokenRouter.js');
        const result = await ask(prompt, { taskType: 'response', maxTokens: 400 });
        const message = result.text.trim();

        appendOurReply(lead.conversationId, message, {
          isAutoGenerated: true,
          note: `Follow-up automático: ${fu.reason}`,
        });

        fu.status = 'sent';
        fu.sentAt = new Date().toISOString();
        lead.timeline.push({ at: new Date().toISOString(), event: `Follow-up enviado: "${message.slice(0, 60)}..."` });
        sent++;
      } catch (err) {
        log.warn(`[LeadPipeline] Follow-up falló para lead ${lead.id}: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  savePipeline(store);
  return { processed, sent, failed };
};

// ── Sincronizar con conversación (updates desde inbox) ───────────────────────

export const syncLeadFromConversation = async (leadId: string, brand?: BrandProfile): Promise<Lead | null> => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const b = brand ?? loadBrandProfile();

  const conv = getConversation(lead.conversationId);
  if (!conv) return lead;

  // Re-extraer BANT
  try {
    const bant = await extractBANTFromConversation(lead.conversationId, b);
    lead.score = computeLeadScore(bant);
    lead.objections = bant.objections;
    if (!lead.productInterest || lead.productInterest === 'sin definir') {
      lead.productInterest = bant.productInterest;
    }
  } catch {
    /* skip si falla */
  }

  // Actualizar promesas
  lead.promisesMade = [...new Set([...lead.promisesMade, ...conv.context.promisesMade])];
  lead.updatedAt = new Date().toISOString();
  savePipeline(store);

  return lead;
};

// ── Pipeline view (Kanban) ────────────────────────────────────────────────────

export const getPipelineKanban = (): Record<LeadStage, Lead[]> => {
  const all = loadPipeline().leads;
  return {
    new: all.filter((l) => l.stage === 'new'),
    qualified: all.filter((l) => l.stage === 'qualified'),
    engaged: all.filter((l) => l.stage === 'engaged'),
    proposal: all.filter((l) => l.stage === 'proposal'),
    negotiation: all.filter((l) => l.stage === 'negotiation'),
    won: all.filter((l) => l.stage === 'won'),
    lost: all.filter((l) => l.stage === 'lost'),
    nurture: all.filter((l) => l.stage === 'nurture'),
  };
};

export const listLeads = (
  filters: { stage?: LeadStage; classification?: LeadScore['classification']; ownerAgent?: Lead['ownerAgent'] } = {},
): Lead[] => {
  let leads = loadPipeline().leads;
  if (filters.stage) leads = leads.filter((l) => l.stage === filters.stage);
  if (filters.classification) leads = leads.filter((l) => l.score.classification === filters.classification);
  if (filters.ownerAgent) leads = leads.filter((l) => l.ownerAgent === filters.ownerAgent);
  return leads.sort((a, b) => b.score.total - a.score.total);
};

export const getLead = (leadId: string): Lead | null => loadPipeline().leads.find((l) => l.id === leadId) ?? null;

export const getPipelineSnapshot = (): {
  totalLeads: number;
  byStage: Record<string, number>;
  byClassification: Record<string, number>;
  hotLeads: Lead[];
  pendingFollowUps: number;
  conversionRateLast30Days: number;
  revenueLast30Days: number;
} => {
  const store = loadPipeline();
  const byStage: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  for (const l of store.leads) {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
    byClass[l.score.classification] = (byClass[l.score.classification] ?? 0) + 1;
  }
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const last30 = store.leads.filter((l) => l.createdAt >= cutoff);
  const won30 = last30.filter((l) => l.wonAt);
  const conversionRate = last30.length > 0 ? (won30.length / last30.length) * 100 : 0;
  const revenue = won30.reduce((sum, l) => sum + (l.estimatedValue?.amount ?? 0), 0);

  const pendingFollowUps = store.leads.flatMap((l) => l.followUps).filter((fu) => fu.status === 'pending').length;

  return {
    totalLeads: store.leads.length,
    byStage,
    byClassification: byClass,
    hotLeads: store.leads.filter((l) => l.score.classification === 'hot' && l.stage !== 'won' && l.stage !== 'lost'),
    pendingFollowUps,
    conversionRateLast30Days: conversionRate,
    revenueLast30Days: revenue,
  };
};

export const recordWonRevenue = (leadId: string, amount: number, currency = 'USD'): Lead | null => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  lead.stage = 'won';
  lead.wonAt = new Date().toISOString();
  lead.estimatedValue = { amount, currency };
  lead.timeline.push({ at: new Date().toISOString(), event: `Win registrado: ${amount} ${currency}`, stage: 'won' });
  savePipeline(store);
  return lead;
};

export const addObjectionToLead = (leadId: string, objection: string): Lead | null => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  if (!lead.objections.includes(objection)) lead.objections.push(objection);
  lead.timeline.push({ at: new Date().toISOString(), event: `Objeción registrada: ${objection}` });
  savePipeline(store);
  return lead;
};

export const addPromiseToLead = (leadId: string, promise: string): Lead | null => {
  const store = loadPipeline();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  if (!lead.promisesMade.includes(promise)) lead.promisesMade.push(promise);
  lead.timeline.push({ at: new Date().toISOString(), event: `Promesa hecha: ${promise}` });
  savePipeline(store);
  // Sync con inbox
  addPromise(lead.conversationId, promise);
  return lead;
};

export const exportPipeline = (): PipelineStore => loadPipeline();
