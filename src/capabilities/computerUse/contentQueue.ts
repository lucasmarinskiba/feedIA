/**
 * Content Queue — Cola inteligente de publicación de contenido.
 *
 * Gestiona el ciclo de vida completo del contenido: desde draft hasta publicado.
 * Incluye scheduling óptimo con consciencia del contexto argentino.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
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

export type QueueItemStatus = 'draft' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'paused';

export interface QueueItem {
  id: string;
  brandId: string;
  format: 'reel' | 'carrusel' | 'post-imagen' | 'historia';
  topic: string;
  caption: string;
  hashtags: string[];
  visualAsset?: string;
  canvaDesignId?: string;
  scheduledFor: string; // ISO datetime
  status: QueueItemStatus;
  coherenceScore?: number;
  abTestId?: string;
  variantId?: string;
  publishedPostId?: string;
  failReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  meta: {
    generatedBy: 'master-brain' | 'canva-brain' | 'manual' | 'autopilot';
    pillar?: string;
    nichePackId?: string;
    extraInstructions?: string;
  };
}

export interface PublishingWindow {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
  hour: number; // 0-23
  minute: number;
  quality: 'prime' | 'good' | 'ok' | 'avoid';
}

export interface QueueSummary {
  total: number;
  byStatus: Record<QueueItemStatus, number>;
  nextScheduled: QueueItem | null;
  coverageDays: number; // how many days ahead are covered
  gaps: string[]; // dates with no content scheduled
}

// ── Interfaces internas ───────────────────────────────────────────────────────

interface ScheduleSuggestion {
  id: string;
  scheduledFor: string;
  rationale: string;
}

interface ScheduleResponse {
  assignments: ScheduleSuggestion[];
}

// ── Helpers internos ──────────────────────────────────────────────────────────

const askJson = async <T>(prompt: string): Promise<T> => {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'enabled', budget_tokens: 2000 },
    messages: [{ role: 'user', content: prompt }],
  });

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
    log.error(`[ContentQueue] JSON parse error: ${(err as Error).message}`);
    throw new Error(
      `No se pudo parsear JSON de Claude. Error: ${(err as Error).message}\nRespuesta:\n${rawText.slice(0, 500)}`,
    );
  }
};

// ── Paths de persistencia ─────────────────────────────────────────────────────

const queueDir = (brandId: string): string => resolve(join('data', 'runtime', 'queue', brandId));

// ── Función 1: addToQueue ─────────────────────────────────────────────────────

export const addToQueue = (
  item: Omit<QueueItem, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'status'> & {
    status?: QueueItemStatus;
  },
): QueueItem => {
  const now = new Date().toISOString();
  const newItem: QueueItem = {
    ...item,
    id: randomUUID(),
    status: item.status ?? 'draft',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const dir = queueDir(newItem.brandId);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${newItem.id}.json`);
  writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf-8');
  log.debug(`[ContentQueue] Item agregado: ${newItem.id} (${newItem.format} — ${newItem.topic})`);

  return newItem;
};

// ── Función 2: getQueue ───────────────────────────────────────────────────────

export const getQueue = (
  brandId: string,
  filters?: {
    status?: QueueItemStatus;
    format?: QueueItem['format'];
    fromDate?: string;
  },
): QueueItem[] => {
  const dir = queueDir(brandId);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const items: QueueItem[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        const item = JSON.parse(raw) as QueueItem;
        items.push(item);
      } catch (err) {
        log.warn(`[ContentQueue] No se pudo leer ${file}: ${(err as Error).message}`);
      }
    }

    let filtered = items;

    if (filters?.status) {
      filtered = filtered.filter((i) => i.status === filters.status);
    }
    if (filters?.format) {
      filtered = filtered.filter((i) => i.format === filters.format);
    }
    if (filters?.fromDate) {
      const from = new Date(filters.fromDate).getTime();
      filtered = filtered.filter((i) => new Date(i.scheduledFor).getTime() >= from);
    }

    return filtered.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  } catch (err) {
    log.error(`[ContentQueue] Error cargando cola de ${brandId}: ${(err as Error).message}`);
    return [];
  }
};

// ── Función 3: updateQueueItem ────────────────────────────────────────────────

export const updateQueueItem = (id: string, brandId: string, updates: Partial<QueueItem>): QueueItem | null => {
  const dir = queueDir(brandId);
  const filePath = join(dir, `${id}.json`);

  if (!existsSync(filePath)) {
    log.warn(`[ContentQueue] Item no encontrado: ${id}`);
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const existing = JSON.parse(raw) as QueueItem;
    const updated: QueueItem = {
      ...existing,
      ...updates,
      id: existing.id, // ID inmutable
      brandId: existing.brandId, // brandId inmutable
      createdAt: existing.createdAt, // createdAt inmutable
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    log.debug(`[ContentQueue] Item actualizado: ${id}`);
    return updated;
  } catch (err) {
    log.error(`[ContentQueue] Error actualizando ${id}: ${(err as Error).message}`);
    return null;
  }
};

// ── Función 4: removeFromQueue ────────────────────────────────────────────────

export const removeFromQueue = (id: string, brandId: string): boolean => {
  const dir = queueDir(brandId);
  const filePath = join(dir, `${id}.json`);

  if (!existsSync(filePath)) {
    log.warn(`[ContentQueue] Item no encontrado para eliminar: ${id}`);
    return false;
  }

  try {
    unlinkSync(filePath);
    log.debug(`[ContentQueue] Item eliminado: ${id}`);
    return true;
  } catch (err) {
    log.error(`[ContentQueue] Error eliminando ${id}: ${(err as Error).message}`);
    return false;
  }
};

// ── Función 5: getQueueSummary ────────────────────────────────────────────────

export const getQueueSummary = (brandId: string): QueueSummary => {
  const allItems = getQueue(brandId);
  const now = new Date();

  // Conteos por estado
  const byStatus: Record<QueueItemStatus, number> = {
    draft: 0,
    approved: 0,
    scheduled: 0,
    publishing: 0,
    published: 0,
    failed: 0,
    paused: 0,
  };
  for (const item of allItems) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
  }

  // Próximo item schedulado
  const upcoming = allItems
    .filter(
      (i) =>
        (i.status === 'approved' || i.status === 'scheduled') && new Date(i.scheduledFor).getTime() >= now.getTime(),
    )
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const nextScheduled = upcoming[0] ?? null;

  // Calcular coverageDays y gaps (próximos 14 días)
  const scheduledDates = new Set(
    allItems
      .filter((i) => i.status === 'approved' || i.status === 'scheduled' || i.status === 'published')
      .map((i) => i.scheduledFor.split('T')[0] ?? ''),
  );

  const gaps: string[] = [];
  let coverageDays = 0;

  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0] ?? '';

    if (scheduledDates.has(dateStr)) {
      coverageDays++;
    } else {
      gaps.push(dateStr);
    }
  }

  return {
    total: allItems.length,
    byStatus,
    nextScheduled,
    coverageDays,
    gaps,
  };
};

// ── Función 6: suggestOptimalSchedule ────────────────────────────────────────

export const suggestOptimalSchedule = async (brand: BrandProfile, items: QueueItem[]): Promise<QueueItem[]> => {
  const unscheduled = items.filter((i) => !i.scheduledFor || i.status === 'draft');

  if (unscheduled.length === 0) {
    log.debug('[ContentQueue] No hay items sin schedule');
    return items;
  }

  log.step(`[ContentQueue] Sugiriendo schedule óptimo para ${unscheduled.length} items`);

  const locale = brand.audience.locale ?? 'es-AR';
  const isArgentine = locale === 'es-AR' || locale.includes('AR');
  const today = new Date().toISOString().split('T')[0] ?? '';

  const existingScheduled = items
    .filter((i) => i.scheduledFor && i.status !== 'draft')
    .map((i) => `${i.scheduledFor} — ${i.format} — ${i.topic}`);

  const prompt = `Sos un planificador experto de contenido en Instagram.

${brandContext(brand)}
LOCALE: ${locale}
CONTEXTO ARGENTINO: ${isArgentine ? 'SÍ' : 'NO'}
HOY: ${today}

ITEMS YA PROGRAMADOS (no repetir slots):
${existingScheduled.length ? existingScheduled.join('\n') : 'Ninguno'}

ITEMS A PROGRAMAR:
${unscheduled.map((i, idx) => `${idx + 1}. ID=${i.id} | Formato=${i.format} | Tema="${i.topic}"`).join('\n')}

Reglas de scheduling:
${
  isArgentine
    ? `- ARGENTINA: Evitar horario de siesta (13:00-16:00 local)
- Picos de engagement: 19:00-22:00hs (prime time) y 12:00-13:00hs
- Días prime: Martes, Miércoles, Jueves 19:00-21:00hs; Lunes 20:00-22:00hs
- Evitar sábados antes de las 11:00 y domingos antes de las 10:00`
    : ''
}
- No programar 2 reels el mismo día
- No programar más de 2 posts (no stories) el mismo día
- Distribuir el contenido a lo largo de la semana
- Respetar el objetivo de la marca: ${brand.goals.primary}
- Historias: preferir mañana (8-10hs) y noche (21-23hs)

Asigná fechas y horas específicas para los próximos 14 días.

Respondé EXCLUSIVAMENTE con JSON válido:
{
  "assignments": [
    { "id": "uuid-del-item", "scheduledFor": "ISO-8601-datetime", "rationale": "por qué este slot" }
  ]
}`;

  let assignments: ScheduleSuggestion[] = [];
  try {
    const result = await askJson<ScheduleResponse>(prompt);
    assignments = result.assignments ?? [];
  } catch (err) {
    log.error(`[ContentQueue] Error sugiriendo schedule: ${(err as Error).message}`);
    // Fallback: distribuir automáticamente en horarios prime
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(20, 0, 0, 0); // 20hs por defecto

    for (const item of unscheduled) {
      assignments.push({
        id: item.id,
        scheduledFor: baseDate.toISOString(),
        rationale: 'Horario prime por defecto (fallback)',
      });
      baseDate.setDate(baseDate.getDate() + 1);
    }
  }

  // Aplicar assignments
  const updated = items.map((item) => {
    const assignment = assignments.find((a) => a.id === item.id);
    if (!assignment) return item;
    return {
      ...item,
      scheduledFor: assignment.scheduledFor,
      status: 'scheduled' as QueueItemStatus,
      updatedAt: new Date().toISOString(),
    };
  });

  // Persistir actualizaciones
  for (const item of updated) {
    const original = items.find((i) => i.id === item.id);
    if (original && original.scheduledFor !== item.scheduledFor) {
      updateQueueItem(item.id, item.brandId, {
        scheduledFor: item.scheduledFor,
        status: item.status,
      });
    }
  }

  log.success(`[ContentQueue] ${assignments.length} items con schedule asignado`);
  return updated;
};

// ── Función 7: getPublishingWindows ───────────────────────────────────────────

export const getPublishingWindows = (brand: BrandProfile): PublishingWindow[] => {
  const locale = brand.audience.locale ?? 'es-AR';
  const isArgentine = locale === 'es-AR' || locale.includes('AR');

  const windows: PublishingWindow[] = [];

  // Generar las 168 ventanas (7 días × 24 horas)
  for (let day = 0 as 0 | 1 | 2 | 3 | 4 | 5 | 6; day <= 6; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let quality: PublishingWindow['quality'] = 'ok';

      if (isArgentine) {
        // Horario argentino
        quality = getArgentineSlotQuality(day, hour, brand);
      } else {
        // Heurística genérica
        quality = getGenericSlotQuality(day, hour);
      }

      windows.push({
        dayOfWeek: day,
        hour,
        minute: 0,
        quality,
      });
    }
  }

  return windows;
};

const getArgentineSlotQuality = (
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  hour: number,
  brand: BrandProfile,
): PublishingWindow['quality'] => {
  // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab

  // Madrugada → evitar siempre
  if (hour >= 0 && hour < 6) return 'avoid';

  // Horario de siesta argentina
  if (hour >= 13 && hour < 16) return 'avoid';

  // Madrugada tardía
  if (hour >= 23) return 'avoid';

  // Prime time argentino: 19-22hs, días de semana
  if ((day === 2 || day === 3 || day === 4) && hour >= 19 && hour <= 21) return 'prime';
  if (day === 1 && hour >= 20 && hour <= 22) return 'prime'; // Lunes noche
  if (day === 5 && hour >= 19 && hour <= 22) return 'prime'; // Viernes noche

  // Mediodía antes de siesta
  if (hour >= 12 && hour < 13) return 'prime';

  // Mañana productiva
  if (hour >= 8 && hour < 12) return 'good';

  // Tarde post-siesta
  if (hour >= 16 && hour < 19) return 'good';

  // Fin de semana — más relajado
  if (day === 6 && hour >= 10) return 'good'; // Sábado desde las 10
  if (day === 0 && hour >= 11) return 'good'; // Domingo desde las 11

  // Sábado/Domingo temprano
  if ((day === 6 || day === 0) && hour < 10) return 'avoid';

  // Objetivo ventas: reforzar prime time
  if (brand.goals.primary === 'ventas' && hour >= 19 && hour <= 21) return 'prime';

  return 'ok';
};

const getGenericSlotQuality = (day: number, hour: number): PublishingWindow['quality'] => {
  // Madrugada
  if (hour < 6 || hour >= 23) return 'avoid';
  // Fin de semana muy temprano
  if ((day === 0 || day === 6) && hour < 9) return 'avoid';
  // Prime time genérico
  if (hour >= 18 && hour <= 21) return 'prime';
  // Mediodía
  if (hour >= 12 && hour < 14) return 'good';
  // Mañana
  if (hour >= 8 && hour < 12) return 'good';
  return 'ok';
};

// ── Función 8: processNextDue ─────────────────────────────────────────────────

export const processNextDue = (brandId: string): QueueItem | null => {
  const now = new Date();

  const eligible = getQueue(brandId, { status: 'approved' })
    .concat(getQueue(brandId, { status: 'scheduled' }))
    .filter((i) => new Date(i.scheduledFor).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const next = eligible[0];
  if (!next) {
    log.debug(`[ContentQueue] No hay items pendientes de publicación para ${brandId}`);
    return null;
  }

  const updated = updateQueueItem(next.id, brandId, { status: 'publishing' });
  if (updated) {
    log.step(`[ContentQueue] Procesando item ${next.id} (${next.format} — ${next.topic})`);
  }

  return updated;
};

// ── Helpers de conveniencia ───────────────────────────────────────────────────

/**
 * Retorna los slots prime del día especificado, útil para elegir hora al crear
 * un QueueItem sin scheduling automático.
 */
export const getPrimeWindowsForDay = (brand: BrandProfile, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): PublishingWindow[] =>
  getPublishingWindows(brand).filter((w) => w.dayOfWeek === dayOfWeek && w.quality === 'prime');

/**
 * Calcula la próxima ventana prime a partir de ahora.
 */
export const getNextPrimeWindow = (brand: BrandProfile): Date => {
  const now = new Date();
  const windows = getPublishingWindows(brand);

  for (let daysAhead = 0; daysAhead < 8; daysAhead++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + daysAhead);
    const dayOfWeek = candidate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const primeSlots = windows
      .filter((w) => w.dayOfWeek === dayOfWeek && w.quality === 'prime')
      .sort((a, b) => a.hour - b.hour);

    for (const slot of primeSlots) {
      const slotTime = new Date(candidate);
      slotTime.setHours(slot.hour, slot.minute, 0, 0);
      if (slotTime.getTime() > now.getTime()) {
        return slotTime;
      }
    }
  }

  // Fallback: mañana a las 20hs
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(20, 0, 0, 0);
  return fallback;
};
