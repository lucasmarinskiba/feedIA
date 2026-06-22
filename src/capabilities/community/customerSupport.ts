/**
 * Customer Support de FeedIA — flujos estructurados de atención al cliente.
 *
 * Reemplaza al CM que hace soporte de ventas, post-venta, devoluciones, consultas
 * técnicas, etc. Diagnostica el tipo de consulta y aplica el flow correspondiente
 * con templates probados.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { loadBrandProfile } from '../../config/index.js';
import { getConversation, appendOurReply, addPromise } from './dmInbox.js';
import type { BrandProfile } from '../../config/types.js';

const SUPPORT_PATH = join(process.cwd(), 'data', 'community', 'support-cases.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SupportFlowType =
  | 'pre-sale-inquiry' // pregunta antes de comprar
  | 'sale-objection' // ya casi compra pero tiene objeción
  | 'post-purchase-issue' // problema con producto/servicio comprado
  | 'refund-request' // pidió devolución
  | 'shipping-tracking' // pregunta por su envío
  | 'how-to' // necesita ayuda usando algo
  | 'feature-request' // pide una funcionalidad
  | 'bug-report' // reporta un error
  | 'cancellation' // quiere cancelar suscripción/servicio
  | 'general-info'; // info genérica

export type SupportStage =
  | 'open'
  | 'gathering-info'
  | 'investigating'
  | 'proposed-resolution'
  | 'awaiting-customer-confirmation'
  | 'resolved'
  | 'escalated';

export interface SupportCase {
  id: string;
  conversationId: string;
  contactUsername: string;
  flowType: SupportFlowType;
  stage: SupportStage;
  priority: 'critical' | 'high' | 'normal';
  problemSummary: string;
  customerData: {
    orderId?: string;
    productName?: string;
    purchaseDate?: string;
    amountPaid?: number;
    currency?: string;
    contactEmail?: string;
    phone?: string;
  };
  timeline: Array<{ at: string; event: string; actor: 'system' | 'human' | 'customer' }>;
  proposedResolution?: string;
  finalResolution?: string;
  satisfactionScore?: number; // 1-5
  slaTargetHours: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];
}

interface SupportStore {
  version: number;
  cases: SupportCase[];
  templates: Record<SupportFlowType, FlowTemplate>;
  lastUpdated: string;
}

interface FlowTemplate {
  flowType: SupportFlowType;
  description: string;
  slaHours: number;
  questionsToAsk: string[]; // info que debemos conseguir del cliente
  resolutionApproaches: string[];
  escalationTriggers: string[];
}

const DEFAULT_TEMPLATES: Record<SupportFlowType, FlowTemplate> = {
  'pre-sale-inquiry': {
    flowType: 'pre-sale-inquiry',
    description: 'Cliente potencial preguntando antes de comprar',
    slaHours: 2,
    questionsToAsk: [
      'Qué problema específico estás buscando resolver',
      'Si querés que armemos algo a medida o te sirve la oferta actual',
      'Tu presupuesto aproximado',
    ],
    resolutionApproaches: [
      'Responder dudas técnicas con claridad',
      'Mostrar casos similares al suyo',
      'Invitar a llamada de 15min para personalizar',
      'Ofrecer demo / prueba gratuita si existe',
    ],
    escalationTriggers: [
      'Cliente B2B grande / corporativo',
      'Pedido enterprise / volumen alto',
      'Pregunta legal o contractual',
    ],
  },
  'sale-objection': {
    flowType: 'sale-objection',
    description: 'Cliente con objeción específica antes de cerrar',
    slaHours: 4,
    questionsToAsk: ['Qué te genera duda específicamente', 'Si ya probaste algo similar, qué pasó'],
    resolutionApproaches: [
      'Reconocer la objeción sin desestimarla',
      'Mostrar prueba social / casos / testimonios',
      'Ofrecer garantía de satisfacción si aplica',
      'Plantear "qué pasaría si funciona" para shift mental',
    ],
    escalationTriggers: ['Objeción legítima de fit / no encaja', 'Negociación de precio importante'],
  },
  'post-purchase-issue': {
    flowType: 'post-purchase-issue',
    description: 'Cliente con problema en producto/servicio ya comprado',
    slaHours: 1,
    questionsToAsk: [
      'Número de pedido / fecha de compra',
      'Qué exactamente está pasando',
      'Capturas o evidencia si aplica',
    ],
    resolutionApproaches: [
      'Empatía primero, solución después',
      'Reproducir el problema antes de proponer fix',
      'Ofrecer reemplazo / reembolso / asistencia técnica',
    ],
    escalationTriggers: ['Daño material / lesión', 'Reembolso > $200 USD', 'Cliente menciona acciones legales'],
  },
  'refund-request': {
    flowType: 'refund-request',
    description: 'Cliente pide devolución',
    slaHours: 6,
    questionsToAsk: ['Número de pedido y fecha', 'Razón principal (para registro)'],
    resolutionApproaches: [
      'Confirmar política de devolución aplicable',
      'Iniciar proceso administrativo si entra en plazo',
      'Ofrecer alternativa (crédito, cambio) antes de reembolso',
    ],
    escalationTriggers: ['Fuera de plazo de devolución', 'Producto consumido', 'Reembolso > $200 USD'],
  },
  'shipping-tracking': {
    flowType: 'shipping-tracking',
    description: 'Cliente pregunta dónde está su envío',
    slaHours: 4,
    questionsToAsk: ['Número de pedido o email de compra'],
    resolutionApproaches: [
      'Buscar tracking en sistema',
      'Si está en tránsito normal, tranquilizar con ETA',
      'Si hay demora real, gestionar con courier',
    ],
    escalationTriggers: ['Envío perdido / extraviado', 'Más de 14 días sin movimiento'],
  },
  'how-to': {
    flowType: 'how-to',
    description: 'Cliente necesita ayuda para usar algo',
    slaHours: 8,
    questionsToAsk: ['Qué estás intentando lograr exactamente', 'En qué paso te trabaste'],
    resolutionApproaches: ['Tutorial paso a paso', 'Captura o video corto', 'Link a documentación o video existente'],
    escalationTriggers: ['Bug aparente en el producto', 'Problema repetitivo en varios clientes'],
  },
  'feature-request': {
    flowType: 'feature-request',
    description: 'Cliente pide nueva funcionalidad',
    slaHours: 24,
    questionsToAsk: ['Para qué la necesitarías', 'Qué workaround usás hoy'],
    resolutionApproaches: [
      'Registrar como feature request',
      'Confirmar al cliente que se registra',
      'Si ya está planeada, dar timeline aproximado',
    ],
    escalationTriggers: ['Cliente enterprise con caso de uso clave'],
  },
  'bug-report': {
    flowType: 'bug-report',
    description: 'Cliente reporta un error',
    slaHours: 4,
    questionsToAsk: ['Pasos para reproducir', 'Browser/device usado', 'Capturas o video del error'],
    resolutionApproaches: [
      'Reproducir antes de prometer fix',
      'Workaround temporal si es posible',
      'Loguear en sistema de bugs internos',
    ],
    escalationTriggers: ['Bug crítico (bloquea uso del producto)', 'Vulnerabilidad de seguridad'],
  },
  cancellation: {
    flowType: 'cancellation',
    description: 'Cliente quiere cancelar suscripción/servicio',
    slaHours: 6,
    questionsToAsk: ['Razón principal de la cancelación', 'Algo que podríamos hacer diferente'],
    resolutionApproaches: [
      'Empatía, no insistir en retener',
      'Procesar cancelación según política',
      'Ofrecer pausa en vez de cancelación si es por dinero/uso',
    ],
    escalationTriggers: ['Cliente grande / cuenta importante', 'Cancelación por error en el servicio'],
  },
  'general-info': {
    flowType: 'general-info',
    description: 'Consulta informativa genérica',
    slaHours: 12,
    questionsToAsk: [],
    resolutionApproaches: ['Responder con info clara y concisa', 'Link a recursos si hay info más extensa'],
    escalationTriggers: [],
  },
};

const DEFAULT_STORE: SupportStore = {
  version: 1,
  cases: [],
  templates: DEFAULT_TEMPLATES,
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadSupport = (): SupportStore => {
  try {
    ensureDir();
    if (!existsSync(SUPPORT_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(SUPPORT_PATH, 'utf8')) as SupportStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveSupport = (store: SupportStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(SUPPORT_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Detección automática del flow ─────────────────────────────────────────────

export const detectFlowType = async (
  messageText: string,
  conversationContext = '',
): Promise<{
  flowType: SupportFlowType;
  confidence: number;
  rationale: string;
}> => {
  const prompt = `Clasificá el tipo de consulta de este mensaje de Instagram DM.

MENSAJE: "${messageText}"

${conversationContext ? `CONTEXTO DE CONVERSACIÓN:\n${conversationContext}\n` : ''}

Tipos posibles:
- pre-sale-inquiry: pregunta antes de comprar
- sale-objection: tiene objeción específica
- post-purchase-issue: problema con producto/servicio comprado
- refund-request: pide devolución
- shipping-tracking: pregunta por envío
- how-to: necesita ayuda usando algo
- feature-request: pide funcionalidad
- bug-report: reporta error
- cancellation: quiere cancelar
- general-info: info genérica

JSON: { "flowType": "uno de los anteriores", "confidence": 0.0-1.0, "rationale": "1 línea" }`;

  return routerAskJson<{ flowType: SupportFlowType; confidence: number; rationale: string }>(prompt, {
    taskType: 'analysis',
    maxTokens: 400,
    freeOnly: true,
  }).catch(() => ({ flowType: 'general-info' as SupportFlowType, confidence: 0.3, rationale: 'Default fallback' }));
};

// ── Apertura de caso ──────────────────────────────────────────────────────────

export const openSupportCase = (input: {
  conversationId: string;
  contactUsername: string;
  flowType: SupportFlowType;
  problemSummary: string;
  customerData?: Partial<SupportCase['customerData']>;
}): SupportCase => {
  const store = loadSupport();
  const template = store.templates[input.flowType];

  const priority: SupportCase['priority'] =
    input.flowType === 'post-purchase-issue' || input.flowType === 'bug-report'
      ? 'critical'
      : input.flowType === 'refund-request' || input.flowType === 'sale-objection'
        ? 'high'
        : 'normal';

  const supportCase: SupportCase = {
    id: `case-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    conversationId: input.conversationId,
    contactUsername: input.contactUsername,
    flowType: input.flowType,
    stage: 'open',
    priority,
    problemSummary: input.problemSummary,
    customerData: input.customerData ?? {},
    timeline: [{ at: new Date().toISOString(), event: 'Caso abierto', actor: 'system' }],
    slaTargetHours: template.slaHours,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [input.flowType],
  };

  store.cases.push(supportCase);
  saveSupport(store);
  log.info(`[CustomerSupport] Caso abierto: ${supportCase.id} (${input.flowType}, prioridad ${priority})`);
  return supportCase;
};

// ── Ejecutar el flow paso a paso ──────────────────────────────────────────────

export interface SupportStepResult {
  case: SupportCase;
  replyToCustomer: string;
  shouldEscalate: boolean;
  nextStage: SupportStage;
  needsHumanAction?: string;
}

export const advanceSupportCase = async (
  caseId: string,
  newCustomerMessage: string,
  brand?: BrandProfile,
): Promise<SupportStepResult | null> => {
  const store = loadSupport();
  const supportCase = store.cases.find((c) => c.id === caseId);
  if (!supportCase) return null;
  const template = store.templates[supportCase.flowType];
  const b = brand ?? loadBrandProfile();

  // Agregar al timeline
  supportCase.timeline.push({
    at: new Date().toISOString(),
    event: `Cliente respondió: "${newCustomerMessage.slice(0, 80)}..."`,
    actor: 'customer',
  });

  const prompt = `Sos especialista de Customer Support de @${b.name}.

FLOW: ${supportCase.flowType} (${template.description})
STAGE ACTUAL: ${supportCase.stage}
PROBLEMA INICIAL: ${supportCase.problemSummary}
CLIENTE: @${supportCase.contactUsername}
SLA OBJETIVO: ${template.slaHours} horas

DATOS DEL CLIENTE:
${JSON.stringify(supportCase.customerData, null, 2)}

INFO QUE NECESITO RECOLECTAR PARA RESOLVER:
${template.questionsToAsk.join(' | ')}

APPROACHES DE RESOLUCIÓN:
${template.resolutionApproaches.join(' | ')}

CUÁNDO ESCALAR:
${template.escalationTriggers.join(' | ')}

ÚLTIMO MENSAJE DEL CLIENTE:
"${newCustomerMessage}"

TIMELINE DEL CASO:
${supportCase.timeline
  .slice(-5)
  .map((t) => `[${t.at}] ${t.actor}: ${t.event}`)
  .join('\n')}

TONO DE MARCA: ${b.voice.tone.join(', ')}

Generá la próxima respuesta. Si todavía falta info, pedila. Si ya tenés todo, propón resolución. Si excede los escalation triggers, marcar shouldEscalate.

JSON:
{
  "replyToCustomer": "mensaje a enviar al cliente (max 350 chars)",
  "shouldEscalate": boolean,
  "nextStage": "open | gathering-info | investigating | proposed-resolution | awaiting-customer-confirmation | resolved | escalated",
  "needsHumanAction": "si corresponde, qué acción humana se necesita",
  "extractedData": { "field": "value que se extrajo del mensaje del cliente" },
  "proposedResolution": "si llegamos a proponer una resolución, qué es"
}`;

  const result = await routerAskJson<{
    replyToCustomer: string;
    shouldEscalate: boolean;
    nextStage: SupportStage;
    needsHumanAction?: string;
    extractedData?: Record<string, unknown>;
    proposedResolution?: string;
  }>(prompt, {
    taskType: 'response',
    maxTokens: 1500,
    systemPrompt:
      'Sos un agente de customer support senior con experiencia en ecommerce y servicios digitales. Sos empático, claro y resolutivo.',
  });

  // Aplicar updates
  supportCase.stage = result.nextStage;
  supportCase.updatedAt = new Date().toISOString();
  if (result.proposedResolution) supportCase.proposedResolution = result.proposedResolution;

  // Merge extracted data
  if (result.extractedData) {
    supportCase.customerData = { ...supportCase.customerData, ...result.extractedData };
  }

  supportCase.timeline.push({
    at: new Date().toISOString(),
    event: `Respuesta enviada (stage→${result.nextStage}): "${result.replyToCustomer.slice(0, 80)}..."`,
    actor: 'system',
  });

  if (result.shouldEscalate) {
    supportCase.stage = 'escalated';
    supportCase.timeline.push({
      at: new Date().toISOString(),
      event: `Escalado: ${result.needsHumanAction ?? 'sin razón especificada'}`,
      actor: 'system',
    });
  }

  if (result.nextStage === 'resolved' && !supportCase.resolvedAt) {
    supportCase.resolvedAt = new Date().toISOString();
    supportCase.finalResolution = result.proposedResolution ?? supportCase.proposedResolution;
  }

  saveSupport(store);

  // También aplicar al inbox: agregar la respuesta como nuestra
  if (!result.shouldEscalate) {
    appendOurReply(supportCase.conversationId, result.replyToCustomer, {
      isAutoGenerated: true,
      note: `Customer support flow: ${supportCase.flowType}, stage: ${result.nextStage}`,
    });
    if (result.proposedResolution) {
      addPromise(supportCase.conversationId, result.proposedResolution);
    }
  }

  return {
    case: supportCase,
    replyToCustomer: result.replyToCustomer,
    shouldEscalate: result.shouldEscalate,
    nextStage: result.nextStage,
    needsHumanAction: result.needsHumanAction,
  };
};

// ── Iniciar un caso desde una conversación existente ─────────────────────────

export const openCaseFromConversation = async (
  conversationId: string,
  brand?: BrandProfile,
): Promise<SupportCase | null> => {
  const conv = getConversation(conversationId);
  if (!conv) return null;
  const b = brand ?? loadBrandProfile();

  const lastMessage = conv.messages[conv.messages.length - 1];
  if (!lastMessage || lastMessage.sender !== 'them') return null;

  const context = conv.messages
    .slice(-5)
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');
  const detection = await detectFlowType(lastMessage.text, context);

  // Generar el problemSummary
  const summaryPrompt = `Resumí en 1 línea el problema o consulta del cliente:

ÚLTIMO MENSAJE: ${lastMessage.text}
CONTEXTO: ${context}

Respondé SOLO el resumen, sin preámbulos.`;
  const { ask } = await import('../../agent/tokenRouter.js');
  const summaryResult = await ask(summaryPrompt, { taskType: 'analysis', freeOnly: true, maxTokens: 200 });

  return openSupportCase({
    conversationId,
    contactUsername: conv.contact.username,
    flowType: detection.flowType,
    problemSummary: summaryResult.text.trim(),
    customerData: {},
  });

  // Note: usar `b` brand está implícito via loadBrandProfile en pasos siguientes
  void b;
};

// ── Consultas y vistas ────────────────────────────────────────────────────────

export const listCases = (
  filters: {
    stage?: SupportStage;
    flowType?: SupportFlowType;
    priority?: SupportCase['priority'];
    contactUsername?: string;
  } = {},
): SupportCase[] => {
  let cases = loadSupport().cases;
  if (filters.stage) cases = cases.filter((c) => c.stage === filters.stage);
  if (filters.flowType) cases = cases.filter((c) => c.flowType === filters.flowType);
  if (filters.priority) cases = cases.filter((c) => c.priority === filters.priority);
  if (filters.contactUsername) cases = cases.filter((c) => c.contactUsername === filters.contactUsername);
  return cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const getCase = (caseId: string): SupportCase | null => loadSupport().cases.find((c) => c.id === caseId) ?? null;

export const getSupportSnapshot = (): {
  totalActive: number;
  byStage: Record<string, number>;
  byFlow: Record<string, number>;
  byPriority: Record<string, number>;
  slaBreaches: SupportCase[];
  avgResolutionHours: number;
  resolvedLast30Days: number;
} => {
  const cases = loadSupport().cases;
  const byStage: Record<string, number> = {};
  const byFlow: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const c of cases) {
    byStage[c.stage] = (byStage[c.stage] ?? 0) + 1;
    byFlow[c.flowType] = (byFlow[c.flowType] ?? 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;
  }

  // SLA breaches: casos abiertos que pasaron el SLA target
  const now = Date.now();
  const slaBreaches = cases.filter((c) => {
    if (c.stage === 'resolved' || c.stage === 'escalated') return false;
    const ageHours = (now - new Date(c.createdAt).getTime()) / (60 * 60 * 1000);
    return ageHours > c.slaTargetHours;
  });

  // Resolution time promedio (últimos 30 días)
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const resolved30 = cases.filter((c) => c.resolvedAt && c.resolvedAt >= cutoff);
  const avgResolutionHours =
    resolved30.length > 0
      ? resolved30.reduce((sum, c) => {
          const h = (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) / (60 * 60 * 1000);
          return sum + h;
        }, 0) / resolved30.length
      : 0;

  const totalActive = cases.filter((c) => c.stage !== 'resolved' && c.stage !== 'escalated').length;

  return {
    totalActive,
    byStage,
    byFlow,
    byPriority,
    slaBreaches,
    avgResolutionHours,
    resolvedLast30Days: resolved30.length,
  };
};

// ── Rating de satisfacción (post-resolución) ─────────────────────────────────

export const rateSupportCase = (caseId: string, score: 1 | 2 | 3 | 4 | 5, comment?: string): SupportCase | null => {
  const store = loadSupport();
  const c = store.cases.find((sc) => sc.id === caseId);
  if (!c) return null;
  c.satisfactionScore = score;
  if (comment)
    c.timeline.push({
      at: new Date().toISOString(),
      event: `Customer rating ${score}/5: ${comment}`,
      actor: 'customer',
    });
  saveSupport(store);
  return c;
};

export const exportSupportState = (): SupportStore => loadSupport();
