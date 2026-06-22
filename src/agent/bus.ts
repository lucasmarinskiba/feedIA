import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from './logger.js';

const EVENTS_FILE = resolve('data/runtime/events.json');

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface BusEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: EventPriority;
  timestamp: string;
  sourceAgent?: string;
  targetAgent?: string;
  correlationId: string;
}

export type EventHandler = (event: BusEvent) => Promise<void> | void;

interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
}

const subscribers: EventSubscription[] = [];
let eventHistory: BusEvent[] = [];

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadHistory = (): void => {
  if (!existsSync(EVENTS_FILE)) {
    eventHistory = [];
    return;
  }
  try {
    const raw = readFileSync(EVENTS_FILE, 'utf-8');
    eventHistory = JSON.parse(raw) as BusEvent[];
  } catch {
    eventHistory = [];
  }
};

const saveHistory = (): void => {
  ensureDir();
  try {
    writeFileSync(EVENTS_FILE, JSON.stringify(eventHistory.slice(-500), null, 2), 'utf-8');
  } catch (err) {
    log.warn(`No se pudo guardar historial de eventos: ${(err as Error).message}`);
  }
};

let seq = 0;
const nextId = (): string => {
  seq += 1;
  return `evt-${Date.now()}-${seq}`;
};

export const emit = (event: Omit<BusEvent, 'id' | 'timestamp'>): BusEvent => {
  const fullEvent: BusEvent = {
    ...event,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  eventHistory.push(fullEvent);
  saveHistory();

  const matching = subscribers.filter((s) => s.eventType === '*' || s.eventType === fullEvent.type);

  // Sort by priority for synchronous handling notification
  const priorityOrder: Record<EventPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  matching.sort(() => {
    const p = priorityOrder[fullEvent.priority] ?? 2;
    return p;
  });

  for (const sub of matching) {
    try {
      const result = sub.handler(fullEvent);
      if (result instanceof Promise) {
        result.catch((err) => log.error(`Handler async de evento ${fullEvent.type} falló: ${(err as Error).message}`));
      }
    } catch (err) {
      log.error(`Handler sync de evento ${fullEvent.type} falló: ${(err as Error).message}`);
    }
  }

  log.debug(`[BUS] ${fullEvent.type} (${fullEvent.priority}) → ${matching.length} handlers`);
  return fullEvent;
};

export const on = (eventType: string, handler: EventHandler): (() => void) => {
  const sub: EventSubscription = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    handler,
  };
  subscribers.push(sub);
  return () => {
    const idx = subscribers.findIndex((s) => s.id === sub.id);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
};

export const getHistory = (limit = 50): BusEvent[] => {
  loadHistory();
  return eventHistory.slice(-limit);
};

export const getEventsByCorrelation = (correlationId: string): BusEvent[] => {
  loadHistory();
  return eventHistory.filter((e) => e.correlationId === correlationId);
};

export const clearHistory = (): void => {
  eventHistory = [];
  saveHistory();
};

// Typed event helpers
export const emitAgentTaskRequest = (
  sourceAgent: string,
  targetAgent: string,
  task: string,
  payload: Record<string, unknown>,
  correlationId: string,
  priority: EventPriority = 'normal',
): BusEvent =>
  emit({
    type: 'AgentTaskRequest',
    sourceAgent,
    targetAgent,
    priority,
    correlationId,
    payload: { task, ...payload },
  });

export const emitAgentTaskComplete = (
  sourceAgent: string,
  targetAgent: string,
  result: Record<string, unknown>,
  correlationId: string,
  priority: EventPriority = 'normal',
): BusEvent =>
  emit({
    type: 'AgentTaskComplete',
    sourceAgent,
    targetAgent,
    priority,
    correlationId,
    payload: result,
  });

export const emitHumanCheckpointRequired = (
  checkpointId: string,
  checkpointType: string,
  description: string,
  correlationId: string,
  payload: Record<string, unknown> = {},
): BusEvent =>
  emit({
    type: 'HumanCheckpointRequired',
    sourceAgent: 'orchestrator',
    priority: 'critical',
    correlationId,
    payload: { checkpointId, checkpointType, description, ...payload },
  });

export const emitContentReadyForReview = (
  contentId: string,
  format: string,
  preview: Record<string, unknown>,
  correlationId: string,
): BusEvent =>
  emit({
    type: 'ContentReadyForReview',
    sourceAgent: 'content-creator',
    priority: 'high',
    correlationId,
    payload: { contentId, format, preview },
  });

export const emitLeadHotAlert = (leadHandle: string, score: number, correlationId: string): BusEvent =>
  emit({
    type: 'LeadHotAlert',
    sourceAgent: 'sales-closer',
    priority: 'high',
    correlationId,
    payload: { leadHandle, score },
  });

export const emitCrisisDetected = (
  postId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  correlationId: string,
): BusEvent =>
  emit({
    type: 'CrisisDetected',
    sourceAgent: 'crisis-manager',
    priority: 'critical',
    correlationId,
    payload: { postId, severity },
  });

export const emitViralOpportunity = (topic: string, confidence: number, correlationId: string): BusEvent =>
  emit({
    type: 'ViralOpportunity',
    sourceAgent: 'trend-radar',
    priority: 'high',
    correlationId,
    payload: { topic, confidence },
  });
