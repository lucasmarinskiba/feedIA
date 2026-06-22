/**
 * Calendar Board de FeedIA — calendario editorial y de eventos.
 *
 * El usuario indica eventos (lanzamientos, campañas, colabs, feriados) y el sistema
 * organiza alrededor: prepara con anticipación, evita publicar durante quiet zones,
 * y ancla la producción de contenido a los hitos importantes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { createTask } from './taskBoard.js';
import type { CalendarEntry } from './intentParser.js';

const CAL_PATH = join(process.cwd(), 'data', 'goals', 'calendar.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventType = 'launch' | 'campaign' | 'milestone' | 'collab' | 'holiday' | 'date-anchor' | 'event' | 'task';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: string; // ISO
  endsAt?: string;
  description: string;
  goalIds: string[];
  prepareDaysAhead: number; // generar tareas X días antes
  generatedTaskIds: string[];
  notes: string[];
  createdAt: string;
  source: 'voice' | 'canvas' | 'calendar' | 'chat' | 'system';
}

interface CalendarStore {
  version: number;
  events: CalendarEvent[];
  blackoutDates: string[]; // YYYY-MM-DD donde NO publicar
  lastUpdated: string;
}

const DEFAULT_STORE: CalendarStore = {
  version: 1,
  events: [],
  blackoutDates: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'goals');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadCalendar = (): CalendarStore => {
  try {
    ensureDir();
    if (!existsSync(CAL_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(CAL_PATH, 'utf8')) as CalendarStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveCalendar = (store: CalendarStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(CAL_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Días de preparación automática según tipo de evento ──────────────────────

const defaultPrepareDays = (type: EventType): number => {
  switch (type) {
    case 'launch':
      return 14;
    case 'campaign':
      return 10;
    case 'collab':
      return 7;
    case 'milestone':
      return 5;
    case 'event':
      return 3;
    case 'date-anchor':
      return 5;
    case 'holiday':
      return 5;
    case 'task':
      return 1;
  }
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt?: string;
  description?: string;
  goalIds?: string[];
  prepareDaysAhead?: number;
  notes?: string[];
  source?: CalendarEvent['source'];
}

export const createEvent = (input: CreateEventInput): CalendarEvent => {
  const store = loadCalendar();
  const event: CalendarEvent = {
    id: `evt-${input.type}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    title: input.title,
    type: input.type,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    description: input.description ?? input.title,
    goalIds: input.goalIds ?? [],
    prepareDaysAhead: input.prepareDaysAhead ?? defaultPrepareDays(input.type),
    generatedTaskIds: [],
    notes: input.notes ?? [],
    createdAt: new Date().toISOString(),
    source: input.source ?? 'chat',
  };
  store.events.push(event);
  saveCalendar(store);
  log.info(`[CalendarBoard] Evento creado: "${event.title}" para ${event.startsAt.split('T')[0]} (${event.type})`);
  return event;
};

export const removeEvent = (eventId: string): boolean => {
  const store = loadCalendar();
  const idx = store.events.findIndex((e) => e.id === eventId);
  if (idx < 0) return false;
  store.events.splice(idx, 1);
  saveCalendar(store);
  return true;
};

export const updateEvent = (eventId: string, updates: Partial<CalendarEvent>): CalendarEvent | null => {
  const store = loadCalendar();
  const event = store.events.find((e) => e.id === eventId);
  if (!event) return null;
  Object.assign(event, updates);
  saveCalendar(store);
  return event;
};

// ── Importar entradas del intent parser ──────────────────────────────────────

export const importFromCalendarEntries = (entries: CalendarEntry[]): CalendarEvent[] => {
  const created: CalendarEvent[] = [];
  for (const entry of entries) {
    const startsAt = entry.duration ? entry.duration.startDate : entry.date;
    const endsAt = entry.duration ? entry.duration.endDate : undefined;
    created.push(
      createEvent({
        title: entry.title,
        type: entry.type as EventType,
        startsAt: startsAt.includes('T') ? startsAt : `${startsAt}T09:00:00.000Z`,
        endsAt,
        description: entry.description,
        source: 'calendar',
      }),
    );
  }
  return created;
};

// ── Generación automática de tareas de preparación ──────────────────────────

export const generatePrepTasks = (eventId: string): { event: CalendarEvent; tasks: string[] } | null => {
  const store = loadCalendar();
  const event = store.events.find((e) => e.id === eventId);
  if (!event) return null;
  if (event.generatedTaskIds.length > 0) {
    log.debug(`[CalendarBoard] Evento ${eventId} ya tiene tareas generadas`);
    return { event, tasks: event.generatedTaskIds };
  }

  const eventDate = new Date(event.startsAt);
  const prepStart = new Date(eventDate.getTime() - event.prepareDaysAhead * 86400000);

  const taskTemplates = getPrepTaskTemplates(event.type);
  const taskIds: string[] = [];

  for (let i = 0; i < taskTemplates.length; i++) {
    const template = taskTemplates[i]!;
    const progress = (i + 1) / taskTemplates.length;
    const dueDate = new Date(prepStart.getTime() + (eventDate.getTime() - prepStart.getTime()) * progress);
    const task = createTask({
      goalId: event.goalIds[0],
      title: template.title.replace('{event}', event.title),
      description: template.description,
      assignedTo: template.agent,
      priority: template.priority,
      dueDate: dueDate.toISOString().split('T')[0],
      estimatedHours: template.hours,
      tags: ['evento', event.type, event.id],
    });
    taskIds.push(task.id);
  }

  event.generatedTaskIds = taskIds;
  saveCalendar(store);
  log.info(`[CalendarBoard] Generadas ${taskIds.length} tareas de preparación para "${event.title}"`);
  return { event, tasks: taskIds };
};

const getPrepTaskTemplates = (
  type: EventType,
): Array<{
  title: string;
  description: string;
  agent: Parameters<typeof createTask>[0]['assignedTo'];
  priority: NonNullable<Parameters<typeof createTask>[0]['priority']>;
  hours: number;
}> => {
  if (type === 'launch') {
    return [
      {
        title: 'Investigar mercado para {event}',
        description: 'Análisis competitivo y de demanda',
        agent: 'scout',
        priority: 'high',
        hours: 3,
      },
      {
        title: 'Definir narrativa de lanzamiento de {event}',
        description: 'Storytelling central, ángulo, copy madre',
        agent: 'talia',
        priority: 'critical',
        hours: 2,
      },
      {
        title: 'Producir teasers para {event}',
        description: '3 piezas de teaser (carrusel + reel + post)',
        agent: 'nova',
        priority: 'high',
        hours: 4,
      },
      {
        title: 'Diseñar visual de lanzamiento {event}',
        description: 'Identidad visual, mockups, plantillas',
        agent: 'pixel',
        priority: 'high',
        hours: 3,
      },
      {
        title: 'Preparar copys para {event}',
        description: '5 captions: anuncio, beneficios, FAQ, urgencia, cierre',
        agent: 'nova',
        priority: 'high',
        hours: 3,
      },
      {
        title: 'Configurar funnel de captura para {event}',
        description: 'Link en bio, lead magnet, follow-up',
        agent: 'luca',
        priority: 'high',
        hours: 2,
      },
      {
        title: 'Coordinar engagement intensivo el día de {event}',
        description: 'Plan de respuestas a comentarios/DMs',
        agent: 'lia',
        priority: 'critical',
        hours: 2,
      },
      {
        title: 'Publicar lanzamiento {event}',
        description: 'Ejecución del post principal con boost',
        agent: 'talia',
        priority: 'critical',
        hours: 1,
      },
      {
        title: 'Medir resultados de {event}',
        description: 'Reporte completo de impacto del lanzamiento',
        agent: 'analytics',
        priority: 'high',
        hours: 2,
      },
    ];
  }
  if (type === 'campaign') {
    return [
      {
        title: 'Brief de campaña {event}',
        description: 'Objetivos, audiencia, mensaje central, KPIs',
        agent: 'talia',
        priority: 'critical',
        hours: 2,
      },
      {
        title: 'Calendario editorial de {event}',
        description: 'Distribución de piezas día por día',
        agent: 'nova',
        priority: 'high',
        hours: 2,
      },
      {
        title: 'Producción de piezas para {event}',
        description: 'Hero piece + apoyos según calendario',
        agent: 'nova',
        priority: 'high',
        hours: 6,
      },
      {
        title: 'Visuales para {event}',
        description: 'Identidad de campaña + plantillas reutilizables',
        agent: 'pixel',
        priority: 'high',
        hours: 4,
      },
      {
        title: 'Hashtag oficial para {event}',
        description: 'Crear y validar hashtag de campaña',
        agent: 'scout',
        priority: 'normal',
        hours: 1,
      },
      {
        title: 'Reporte de cierre {event}',
        description: 'KPIs vs objetivos, lecciones',
        agent: 'analytics',
        priority: 'high',
        hours: 2,
      },
    ];
  }
  if (type === 'collab') {
    return [
      {
        title: 'Brief para colaboración {event}',
        description: 'Términos, objetivos, mensaje, fechas',
        agent: 'vero',
        priority: 'high',
        hours: 1,
      },
      {
        title: 'Producir contenido para {event}',
        description: 'Piezas conjuntas o mención cruzada',
        agent: 'nova',
        priority: 'high',
        hours: 3,
      },
      {
        title: 'Coordinar timing de publicación {event}',
        description: 'Sincronizar con la otra cuenta',
        agent: 'talia',
        priority: 'high',
        hours: 1,
      },
      {
        title: 'Engagement reciproco activo durante {event}',
        description: 'Comentar / dar like / compartir',
        agent: 'lia',
        priority: 'high',
        hours: 2,
      },
    ];
  }
  if (type === 'milestone' || type === 'date-anchor' || type === 'event') {
    return [
      {
        title: 'Conceptualizar contenido para {event}',
        description: 'Decidir formato y ángulo',
        agent: 'talia',
        priority: 'high',
        hours: 1,
      },
      {
        title: 'Producir pieza principal para {event}',
        description: 'El contenido central del día',
        agent: 'nova',
        priority: 'high',
        hours: 2,
      },
      {
        title: 'Stories del día de {event}',
        description: '3-5 stories que acompañen el momento',
        agent: 'nova',
        priority: 'normal',
        hours: 1,
      },
    ];
  }
  if (type === 'holiday') {
    return [
      {
        title: 'Decidir si {event} encaja con la marca',
        description: 'Evaluar relevancia y tono apropiado',
        agent: 'gard',
        priority: 'normal',
        hours: 1,
      },
      {
        title: 'Producir post temático para {event}',
        description: 'Contenido específico para esta fecha',
        agent: 'nova',
        priority: 'normal',
        hours: 2,
      },
    ];
  }
  return [
    {
      title: 'Preparar contenido para {event}',
      description: 'Producción de pieza específica',
      agent: 'nova',
      priority: 'normal',
      hours: 2,
    },
  ];
};

// ── Vistas del calendario ────────────────────────────────────────────────────

export const listEvents = (
  filters: {
    from?: string; // YYYY-MM-DD
    to?: string;
    type?: EventType;
    goalId?: string;
  } = {},
): CalendarEvent[] => {
  let events = loadCalendar().events;
  if (filters.from) events = events.filter((e) => e.startsAt >= filters.from!);
  if (filters.to) events = events.filter((e) => e.startsAt <= `${filters.to}T23:59:59.999Z`);
  if (filters.type) events = events.filter((e) => e.type === filters.type);
  if (filters.goalId) events = events.filter((e) => e.goalIds.includes(filters.goalId!));
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
};

export interface MonthView {
  year: number;
  month: number; // 1-12
  days: Array<{ date: string; dayOfWeek: number; events: CalendarEvent[]; isBlackout: boolean }>;
}

export const getMonthView = (year: number, month: number): MonthView => {
  const monthIdx = month - 1;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const events = listEvents({
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  });
  const store = loadCalendar();

  const days: MonthView['days'] = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date,
      dayOfWeek: new Date(year, monthIdx, d).getDay(),
      events: events.filter((e) => e.startsAt.startsWith(date)),
      isBlackout: store.blackoutDates.includes(date),
    });
  }
  return { year, month, days };
};

export const getWeekView = (
  referenceDate = new Date(),
): Array<{ date: string; dayOfWeek: number; events: CalendarEvent[]; isBlackout: boolean }> => {
  const ref = new Date(referenceDate);
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const result = [];
  const store = loadCalendar();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    const date = d.toISOString().split('T')[0]!;
    const events = listEvents({ from: date, to: date });
    result.push({ date, dayOfWeek: d.getDay(), events, isBlackout: store.blackoutDates.includes(date) });
  }
  return result;
};

// ── Blackout dates ───────────────────────────────────────────────────────────

export const addBlackoutDate = (date: string): void => {
  const store = loadCalendar();
  if (!store.blackoutDates.includes(date)) {
    store.blackoutDates.push(date);
    saveCalendar(store);
  }
};

export const removeBlackoutDate = (date: string): void => {
  const store = loadCalendar();
  store.blackoutDates = store.blackoutDates.filter((d) => d !== date);
  saveCalendar(store);
};

export const isBlackout = (date: string): boolean => loadCalendar().blackoutDates.includes(date);

// ── Auto-process: revisar eventos próximos y disparar tareas ─────────────────

export const processUpcomingEvents = (
  lookaheadDays = 30,
): {
  generatedFor: number;
  eventsProcessed: number;
  generatedTaskIds: string[];
} => {
  const store = loadCalendar();
  const now = Date.now();
  const cutoff = now + lookaheadDays * 86400000;
  let generated = 0;
  const allTaskIds: string[] = [];

  for (const event of store.events) {
    const evTime = new Date(event.startsAt).getTime();
    if (evTime < now || evTime > cutoff) continue;
    const prepStart = evTime - event.prepareDaysAhead * 86400000;
    if (now < prepStart) continue; // todavía no entramos en ventana de prep
    if (event.generatedTaskIds.length > 0) continue; // ya generadas

    const result = generatePrepTasks(event.id);
    if (result) {
      generated++;
      allTaskIds.push(...result.tasks);
    }
  }

  return { generatedFor: generated, eventsProcessed: store.events.length, generatedTaskIds: allTaskIds };
};

// ── Conflicts con goals ──────────────────────────────────────────────────────

export const detectConflicts = (): Array<{ date: string; reason: string; eventIds: string[] }> => {
  const store = loadCalendar();
  const conflicts: Array<{ date: string; reason: string; eventIds: string[] }> = [];

  // Agrupar eventos por fecha
  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of store.events) {
    const date = e.startsAt.split('T')[0]!;
    const arr = byDate.get(date) ?? [];
    arr.push(e);
    byDate.set(date, arr);
  }

  // Más de 1 evento "crítico" mismo día
  for (const [date, evs] of byDate) {
    const critical = evs.filter((e) => e.type === 'launch' || e.type === 'campaign');
    if (critical.length > 1) {
      conflicts.push({
        date,
        reason: `${critical.length} eventos críticos en el mismo día: ${critical.map((e) => e.title).join(', ')}`,
        eventIds: critical.map((e) => e.id),
      });
    }
    // Evento en blackout
    if (store.blackoutDates.includes(date) && evs.length > 0) {
      conflicts.push({
        date,
        reason: `Hay ${evs.length} evento(s) programado(s) en blackout date`,
        eventIds: evs.map((e) => e.id),
      });
    }
  }

  return conflicts;
};

// ── Snapshot ─────────────────────────────────────────────────────────────────

export const getCalendarSnapshot = (): {
  totalEvents: number;
  upcoming30Days: CalendarEvent[];
  pendingPrep: CalendarEvent[];
  conflicts: ReturnType<typeof detectConflicts>;
  blackoutDates: string[];
} => {
  const store = loadCalendar();
  const now = Date.now();
  const upcoming30Days = store.events.filter((e) => {
    const t = new Date(e.startsAt).getTime();
    return t >= now && t <= now + 30 * 86400000;
  });
  const pendingPrep = upcoming30Days.filter((e) => e.generatedTaskIds.length === 0);

  return {
    totalEvents: store.events.length,
    upcoming30Days,
    pendingPrep,
    conflicts: detectConflicts(),
    blackoutDates: store.blackoutDates,
  };
};

export const exportCalendarState = (): CalendarStore => loadCalendar();
