// @ts-nocheck
/**
 * Editorial Calendar Builder — Calendario de contenido mensual automatizado.
 *
 * Diseña grillas de contenido equilibradas: ventas / educación /
 * entretenimiento / interacción. Asigna formatos, horarios óptimos
 * y temáticas. Exporta a JSON/CSV.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const CALENDAR_DIR = path.resolve('data/editorial-calendar');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ContentPillar =
  | 'educacion'
  | 'entretenimiento'
  | 'venta'
  | 'interaccion'
  | 'inspiracion'
  | 'detras-escena'
  | 'ugc'
  | 'newsjacking';

export type ContentFormat = 'carousel' | 'reel' | 'story' | 'post-estatico' | 'live' | 'collab';

export interface CalendarEntry {
  date: string; // ISO date YYYY-MM-DD
  dayOfWeek: string;
  pillar: ContentPillar;
  format: ContentFormat;
  topic: string;
  angle: string; // enfoque específico del tema
  hook: string; // primera línea / gancho visual
  caption: string; // caption completo
  hashtags: string[];
  postingTime: string; // HH:MM hora local
  status: 'planned' | 'in-production' | 'ready' | 'published';
  priority: 'high' | 'medium' | 'low';
  notes: string;
}

export interface MonthlyCalendar {
  brandId: string;
  month: string; // YYYY-MM
  year: number;
  generatedAt: string;
  entries: CalendarEntry[];
  stats: {
    totalPosts: number;
    byPillar: Record<ContentPillar, number>;
    byFormat: Record<ContentFormat, number>;
    postsPerWeek: number;
  };
}

export interface CalendarConfig {
  postsPerWeek: number; // default 5
  pillarDistribution: Record<ContentPillar, number>; // % por pilar (debe sumar 100)
  preferredFormats: ContentFormat[];
  avoidDays: number[]; // 0=domingo, 6=sábado
  peakHours: number[]; // horas pico de la audiencia
  campaignThemes: string[]; // temas mensuales de campaña
}

// ── Distribución por defecto ──────────────────────────────────────────────────

const DEFAULT_DISTRIBUTION: Record<ContentPillar, number> = {
  educacion: 30,
  entretenimiento: 20,
  venta: 20,
  interaccion: 15,
  inspiracion: 5,
  'detras-escena': 5,
  ugc: 3,
  newsjacking: 2,
};

const DEFAULT_CONFIG: CalendarConfig = {
  postsPerWeek: 5,
  pillarDistribution: DEFAULT_DISTRIBUTION,
  preferredFormats: ['carousel', 'reel', 'story', 'post-estatico'],
  avoidDays: [0], // evitar domingos por defecto
  peakHours: [9, 12, 18, 20],
  campaignThemes: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureCalendarDir = async (): Promise<void> => {
  await fs.mkdir(CALENDAR_DIR, { recursive: true });
};

const calendarPath = (brandId: string, month: string): string => path.join(CALENDAR_DIR, `${brandId}-${month}.json`);

const getDatesInMonth = (year: number, month: number): string[] => {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(d.toISOString().split('T')[0] as string);
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

const getDayName = (dateStr: string): string => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date(dateStr).getDay()] ?? '';
};

// ── Motor de calendario ───────────────────────────────────────────────────────

/** Genera el calendario editorial mensual completo. */
export const buildMonthlyCalendar = async (
  brand: BrandProfile,
  year: number,
  month: number,
  config: Partial<CalendarConfig> = {},
): Promise<MonthlyCalendar> => {
  const cfg: CalendarConfig = { ...DEFAULT_CONFIG, ...config };
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  log.info('[editorialCalendar] building calendar', { brandId, month: monthStr });

  // Calcular días de publicación (excluir avoidDays)
  const allDates = getDatesInMonth(year, month).filter((d) => !cfg.avoidDays.includes(new Date(d).getDay()));

  // Seleccionar ~postsPerWeek días por semana
  const publishDates: string[] = [];
  let currentWeek = -1;
  let weekPosts = 0;

  for (const date of allDates) {
    const week = Math.floor((new Date(date).getDate() - 1) / 7);
    if (week !== currentWeek) {
      currentWeek = week;
      weekPosts = 0;
    }
    if (weekPosts < cfg.postsPerWeek) {
      publishDates.push(date);
      weekPosts++;
    }
  }

  const totalPosts = publishDates.length;

  // Distribuir pilares según porcentajes
  const pillarPlan: ContentPillar[] = [];
  for (const [pillar, pct] of Object.entries(cfg.pillarDistribution) as [ContentPillar, number][]) {
    const count = Math.round((pct / 100) * totalPosts);
    for (let i = 0; i < count; i++) pillarPlan.push(pillar);
  }
  // Ajustar al total exacto
  while (pillarPlan.length > totalPosts) pillarPlan.pop();
  while (pillarPlan.length < totalPosts) pillarPlan.push('educacion');

  // Shuffle pillarPlan para distribuir bien
  for (let i = pillarPlan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pillarPlan[i], pillarPlan[j]] = [pillarPlan[j]!, pillarPlan[i]!];
  }

  // Generar contenido con Claude (en lotes de 5 para no saturar)
  const BATCH_SIZE = 5;
  const entries: CalendarEntry[] = [];

  for (let i = 0; i < publishDates.length; i += BATCH_SIZE) {
    const batch = publishDates.slice(i, i + BATCH_SIZE);
    const batchPillars = pillarPlan.slice(i, i + BATCH_SIZE);

    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 2500,
      thinking: { type: 'adaptive' },
      system: `Estratega de contenido Instagram. Creas calendarios que convierten y generan comunidad.
Sin frases genéricas. Cada publicación debe tener un ángulo específico y único.
Devuelves JSON puro, sin texto extra.`,
      messages: [
        {
          role: 'user',
          content: `Genera ${batch.length} publicaciones para el calendario de ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Tono: ${brand.toneOfVoice ?? 'profesional cercano'}
${cfg.campaignThemes.length ? `Temas de campaña del mes: ${cfg.campaignThemes.join(', ')}` : ''}

Publicaciones requeridas:
${batch.map((date, idx) => `- Fecha: ${date} (${getDayName(date)}) | Pilar: ${batchPillars[idx]}`).join('\n')}

Formatos disponibles: ${cfg.preferredFormats.join(', ')}
Horas pico: ${cfg.peakHours.map((h) => `${h}:00`).join(', ')}

Para cada publicación devuelve:
{
  "date": "YYYY-MM-DD",
  "format": "carousel|reel|story|post-estatico",
  "topic": "tema concreto (no genérico)",
  "angle": "enfoque específico y diferenciador",
  "hook": "primera oración/gancho visual (máx 10 palabras, sin 'Hoy te traigo')",
  "caption": "caption completo listo para publicar (150-300 palabras)",
  "hashtags": ["#hashtag1", "#hashtag2", ...] (8-12 hashtags relevantes),
  "postingTime": "HH:MM",
  "priority": "high|medium|low",
  "notes": "nota breve para el diseñador/editor"
}

Devuelve: { "posts": [...] }`,
        },
      ],
    });

    const msg = await stream.finalMessage();
    const textBlock = msg.content.find((b) => b.type === 'text');
    const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) continue;

    const result = JSON.parse(jsonMatch[0]) as { posts: Partial<CalendarEntry>[] };
    for (let j = 0; j < result.posts.length; j++) {
      const post = result.posts[j];
      if (!post) continue;
      entries.push({
        date: batch[j] ?? '',
        dayOfWeek: getDayName(batch[j] ?? ''),
        pillar: batchPillars[j] ?? 'educacion',
        format: post.format ?? 'carousel',
        topic: post.topic ?? '',
        angle: post.angle ?? '',
        hook: post.hook ?? '',
        caption: post.caption ?? '',
        hashtags: post.hashtags ?? [],
        postingTime: post.postingTime ?? '18:00',
        status: 'planned',
        priority: post.priority ?? 'medium',
        notes: post.notes ?? '',
      });
    }
  }

  // Estadísticas
  const byPillar = {} as Record<ContentPillar, number>;
  const byFormat = {} as Record<ContentFormat, number>;
  for (const e of entries) {
    byPillar[e.pillar] = (byPillar[e.pillar] ?? 0) + 1;
    byFormat[e.format] = (byFormat[e.format] ?? 0) + 1;
  }

  const calendar: MonthlyCalendar = {
    brandId,
    month: monthStr,
    year,
    generatedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => a.date.localeCompare(b.date)),
    stats: {
      totalPosts,
      byPillar,
      byFormat,
      postsPerWeek: cfg.postsPerWeek,
    },
  };

  await ensureCalendarDir();
  await fs.writeFile(calendarPath(brandId, monthStr), JSON.stringify(calendar, null, 2), 'utf-8');

  log.info('[editorialCalendar] calendar built', { brandId, month: monthStr, totalPosts });
  return calendar;
};

/** Carga calendario de un mes específico. */
export const getCalendar = async (brandId: string, month: string): Promise<MonthlyCalendar | null> => {
  try {
    return JSON.parse(await fs.readFile(calendarPath(brandId, month), 'utf-8')) as MonthlyCalendar;
  } catch {
    return null;
  }
};

/** Actualiza el estado de una entrada del calendario. */
export const updateEntryStatus = async (
  brandId: string,
  month: string,
  date: string,
  status: CalendarEntry['status'],
): Promise<void> => {
  const calendar = await getCalendar(brandId, month);
  if (!calendar) return;
  const entry = calendar.entries.find((e) => e.date === date);
  if (entry) entry.status = status;
  await fs.writeFile(calendarPath(brandId, month), JSON.stringify(calendar, null, 2), 'utf-8');
};

/** Exporta calendario a CSV. */
export const exportToCSV = (calendar: MonthlyCalendar): string => {
  const header = 'Fecha,Día,Pilar,Formato,Tema,Ángulo,Hook,Hora,Prioridad,Estado';
  const rows = calendar.entries.map((e) =>
    [
      e.date,
      e.dayOfWeek,
      e.pillar,
      e.format,
      `"${e.topic}"`,
      `"${e.angle}"`,
      `"${e.hook}"`,
      e.postingTime,
      e.priority,
      e.status,
    ].join(','),
  );
  return [header, ...rows].join('\n');
};

/** Entradas listas para publicar hoy. */
export const getTodayEntries = async (brandId: string): Promise<CalendarEntry[]> => {
  const today = new Date().toISOString().split('T')[0];
  const month = today?.slice(0, 7) ?? '';
  const calendar = await getCalendar(brandId, month);
  return calendar?.entries.filter((e) => e.date === today && (e.status === 'planned' || e.status === 'ready')) ?? [];
};
