import {
  appendFileSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface CommandEvent {
  transcript: string;
  intent: string;
  category: string;
  success: boolean;
  durationMs: number;
  speakerId?: string;
  engine?: string;
}

export interface WakeWordEvent {
  phrase: string;
  engine: string;
  confidence: number;
}

export interface STTEvent {
  provider: string;
  durationMs: number;
  success: boolean;
}

export interface TTSEvent {
  provider: string;
  durationMs: number;
  charCount: number;
}

export interface ConfirmationEvent {
  intent: string;
  accepted: boolean;
}

export interface IntentEvent {
  intent: string;
  category: string;
  confidence: number;
}

export interface AnalyticsSummary {
  totalCommands: number;
  totalWakeDetections: number;
  avgCommandDurationMs: number;
  successRate: number;
  mostActiveHour: number;
  topCategory: string;
  uniqueSpeakers: number;
  periodDays: number;
}

export interface IntentHeatmap {
  categories: Record<string, number>;
  actions: Record<string, number>;
  hourly: number[];
  daily: Record<string, number>;
}

export interface SuccessRate {
  overall: number;
  byCategory: Record<string, number>;
  byIntent: Record<string, number>;
  byEngine: Record<string, number>;
  trend: Array<{ date: string; rate: number }>;
}

export interface HourlyActivity {
  hours: number[];
  labels: string[];
}

export interface TopCommand {
  intent: string;
  count: number;
  successRate: number;
}

export interface SpeakerStats {
  speakerId: string;
  commandCount: number;
  lastSeen: string;
}

export interface EngineReliability {
  stt: Record<string, number>;
  tts: Record<string, number>;
  wake: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Internal types & state                                              */
/* ------------------------------------------------------------------ */

interface SummaryData {
  totalCommands: number;
  totalWakeDetections: number;
  totalSTT: number;
  totalTTS: number;
  totalConfirmations: number;
  totalIntents: number;
  lastUpdated: string;
}

interface AnalyticsEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

const ANALYTICS_DIR = resolve('data/runtime/voice-analytics');
const SUMMARY_FILE = resolve(ANALYTICS_DIR, 'summary.json');
const DEFAULT_MAX_DAYS = 90;
const FLUSH_DELAY_MS = 500;

let cachedSummary: SummaryData | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function ensureDir(): void {
  if (!existsSync(ANALYTICS_DIR)) {
    mkdirSync(ANALYTICS_DIR, { recursive: true });
  }
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getEventsPath(date: string): string {
  return resolve(ANALYTICS_DIR, `events-${date}.jsonl`);
}

function loadSummary(): SummaryData {
  if (cachedSummary) return cachedSummary;
  if (existsSync(SUMMARY_FILE)) {
    try {
      const raw = readFileSync(SUMMARY_FILE, 'utf-8');
      cachedSummary = JSON.parse(raw) as SummaryData;
      return cachedSummary;
    } catch {
      // fall through to default
    }
  }
  return {
    totalCommands: 0,
    totalWakeDetections: 0,
    totalSTT: 0,
    totalTTS: 0,
    totalConfirmations: 0,
    totalIntents: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function flushSummary(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!cachedSummary) return;
  try {
    ensureDir();
    writeFileSync(SUMMARY_FILE, JSON.stringify(cachedSummary, null, 2));
  } catch (err) {
    log.error(`Failed to write voice analytics summary: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushSummary(), FLUSH_DELAY_MS);
}

function updateSummary(updates: Partial<SummaryData>): void {
  const summary = loadSummary();
  cachedSummary = {
    ...summary,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  scheduleFlush();
}

function appendEvent(type: string, payload: object): void {
  ensureDir();
  const date = getToday();
  const file = getEventsPath(date);
  const line = JSON.stringify({ type, timestamp: new Date().toISOString(), ...payload }) + '\n';
  try {
    appendFileSync(file, line);
  } catch (err) {
    log.error(`Failed to append voice analytics event: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function loadEventsForDate(date: string): AnalyticsEvent[] {
  const file = getEventsPath(date);
  if (!existsSync(file)) return [];
  try {
    const raw = readFileSync(file, 'utf-8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as AnalyticsEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is AnalyticsEvent => e !== null);
  } catch {
    return [];
  }
}

function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function loadEvents(days: number): AnalyticsEvent[] {
  const dates = getDateRange(days);
  const events: AnalyticsEvent[] = [];
  for (const date of dates) {
    events.push(...loadEventsForDate(date));
  }
  return events;
}

function getHour(event: AnalyticsEvent): number {
  const ts = typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString();
  return new Date(ts).getUTCHours();
}

function getDateKey(event: AnalyticsEvent): string {
  const ts = typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString();
  return ts.slice(0, 10);
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/* ------------------------------------------------------------------ */
/*  Recording API                                                       */
/* ------------------------------------------------------------------ */

export function recordCommand(event: CommandEvent): void {
  appendEvent('command', event);
  const s = loadSummary();
  updateSummary({ totalCommands: s.totalCommands + 1 });
}

export function recordWakeWordDetection(event: WakeWordEvent): void {
  appendEvent('wake', event);
  const s = loadSummary();
  updateSummary({ totalWakeDetections: s.totalWakeDetections + 1 });
}

export function recordSTT(event: STTEvent): void {
  appendEvent('stt', event);
  const s = loadSummary();
  updateSummary({ totalSTT: s.totalSTT + 1 });
}

export function recordTTS(event: TTSEvent): void {
  appendEvent('tts', event);
  const s = loadSummary();
  updateSummary({ totalTTS: s.totalTTS + 1 });
}

export function recordConfirmation(event: ConfirmationEvent): void {
  appendEvent('confirmation', event);
  const s = loadSummary();
  updateSummary({ totalConfirmations: s.totalConfirmations + 1 });
}

export function recordIntent(event: IntentEvent): void {
  appendEvent('intent', event);
  const s = loadSummary();
  updateSummary({ totalIntents: s.totalIntents + 1 });
}

/* ------------------------------------------------------------------ */
/*  Aggregation API                                                     */
/* ------------------------------------------------------------------ */

export function getAnalyticsSummary(days = 7): AnalyticsSummary {
  const events = loadEvents(days);
  const commands = events.filter((e) => e.type === 'command');
  const wakes = events.filter((e) => e.type === 'wake');

  const durations = commands.map((e) => (typeof e.durationMs === 'number' ? e.durationMs : 0)).filter((d) => d > 0);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const successCount = commands.filter((e) => e.success === true).length;
  const successRate = safeDivide(successCount, commands.length);

  const hourCounts = new Array(24).fill(0);
  for (const e of events) {
    hourCounts[getHour(e)]++;
  }
  const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));

  const categoryCounts: Record<string, number> = {};
  for (const e of commands) {
    const cat = typeof e.category === 'string' ? e.category : 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const speakers = new Set<string>();
  for (const e of commands) {
    if (typeof e.speakerId === 'string') speakers.add(e.speakerId);
  }

  return {
    totalCommands: commands.length,
    totalWakeDetections: wakes.length,
    avgCommandDurationMs: Math.round(avgDuration),
    successRate: Math.round(successRate * 1000) / 1000,
    mostActiveHour,
    topCategory,
    uniqueSpeakers: speakers.size,
    periodDays: days,
  };
}

export function getIntentHeatmap(days = 7): IntentHeatmap {
  const events = loadEvents(days);
  const intentEvents = events.filter((e) => e.type === 'intent' || e.type === 'command');

  const categories: Record<string, number> = {};
  const actions: Record<string, number> = {};
  const hourly = new Array(24).fill(0);
  const daily: Record<string, number> = {};

  for (const e of intentEvents) {
    const cat = typeof e.category === 'string' ? e.category : 'unknown';
    const intent = typeof e.intent === 'string' ? e.intent : 'unknown';
    categories[cat] = (categories[cat] ?? 0) + 1;
    actions[intent] = (actions[intent] ?? 0) + 1;
    hourly[getHour(e)]++;
    const dk = getDateKey(e);
    daily[dk] = (daily[dk] ?? 0) + 1;
  }

  return { categories, actions, hourly, daily };
}

export function getSuccessRate(days = 7): SuccessRate {
  const events = loadEvents(days);
  const commands = events.filter((e) => e.type === 'command');

  const successCount = commands.filter((e) => e.success === true).length;
  const overall = safeDivide(successCount, commands.length);

  const byCategory: Record<string, { ok: number; total: number }> = {};
  const byIntent: Record<string, { ok: number; total: number }> = {};
  const byEngine: Record<string, { ok: number; total: number }> = {};

  for (const e of commands) {
    const cat = typeof e.category === 'string' ? e.category : 'unknown';
    const intent = typeof e.intent === 'string' ? e.intent : 'unknown';
    const engine = typeof e.engine === 'string' ? e.engine : 'unknown';

    if (!byCategory[cat]) byCategory[cat] = { ok: 0, total: 0 };
    if (!byIntent[intent]) byIntent[intent] = { ok: 0, total: 0 };
    if (!byEngine[engine]) byEngine[engine] = { ok: 0, total: 0 };

    byCategory[cat].total++;
    byIntent[intent].total++;
    byEngine[engine].total++;

    if (e.success === true) {
      byCategory[cat].ok++;
      byIntent[intent].ok++;
      byEngine[engine].ok++;
    }
  }

  const trendMap: Record<string, { ok: number; total: number }> = {};
  for (const e of commands) {
    const dk = getDateKey(e);
    if (!trendMap[dk]) trendMap[dk] = { ok: 0, total: 0 };
    trendMap[dk].total++;
    if (e.success === true) trendMap[dk].ok++;
  }

  const trend = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      rate: Math.round(safeDivide(v.ok, v.total) * 1000) / 1000,
    }));

  return {
    overall: Math.round(overall * 1000) / 1000,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, Math.round(safeDivide(v.ok, v.total) * 1000) / 1000]),
    ),
    byIntent: Object.fromEntries(
      Object.entries(byIntent).map(([k, v]) => [k, Math.round(safeDivide(v.ok, v.total) * 1000) / 1000]),
    ),
    byEngine: Object.fromEntries(
      Object.entries(byEngine).map(([k, v]) => [k, Math.round(safeDivide(v.ok, v.total) * 1000) / 1000]),
    ),
    trend,
  };
}

export function getHourlyActivity(days = 7): HourlyActivity {
  const events = loadEvents(days);
  const hours = new Array(24).fill(0);
  for (const e of events) {
    hours[getHour(e)]++;
  }
  const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  return { hours, labels };
}

export function getTopCommands(limit = 10, days = 7): TopCommand[] {
  const events = loadEvents(days);
  const commands = events.filter((e) => e.type === 'command');

  const map: Record<string, { count: number; ok: number }> = {};
  for (const e of commands) {
    const intent = typeof e.intent === 'string' ? e.intent : 'unknown';
    if (!map[intent]) map[intent] = { count: 0, ok: 0 };
    map[intent].count++;
    if (e.success === true) map[intent].ok++;
  }

  return Object.entries(map)
    .map(([intent, v]) => ({
      intent,
      count: v.count,
      successRate: Math.round(safeDivide(v.ok, v.count) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getSpeakerStats(days = 7): SpeakerStats[] {
  const events = loadEvents(days);
  const commands = events.filter((e) => e.type === 'command');

  const map: Record<string, { count: number; lastSeen: string }> = {};
  for (const e of commands) {
    const id = typeof e.speakerId === 'string' ? e.speakerId : undefined;
    if (!id) continue;
    const ts = typeof e.timestamp === 'string' ? e.timestamp : new Date().toISOString();
    if (!map[id]) {
      map[id] = { count: 0, lastSeen: ts };
    }
    map[id].count++;
    if (ts > map[id].lastSeen) map[id].lastSeen = ts;
  }

  return Object.entries(map)
    .map(([speakerId, v]) => ({
      speakerId,
      commandCount: v.count,
      lastSeen: v.lastSeen,
    }))
    .sort((a, b) => b.commandCount - a.commandCount);
}

export function getEngineReliability(days = 7): EngineReliability {
  const events = loadEvents(days);
  const sttEvents = events.filter((e) => e.type === 'stt');
  const ttsEvents = events.filter((e) => e.type === 'tts');
  const wakeEvents = events.filter((e) => e.type === 'wake');

  const stt: Record<string, { ok: number; total: number }> = {};
  for (const e of sttEvents) {
    const p = typeof e.provider === 'string' ? e.provider : 'unknown';
    if (!stt[p]) stt[p] = { ok: 0, total: 0 };
    stt[p].total++;
    if (e.success === true) stt[p].ok++;
  }

  const tts: Record<string, number> = {};
  for (const e of ttsEvents) {
    const p = typeof e.provider === 'string' ? e.provider : 'unknown';
    tts[p] = (tts[p] ?? 0) + 1;
  }

  const wake: Record<string, number> = {};
  for (const e of wakeEvents) {
    const eng = typeof e.engine === 'string' ? e.engine : 'unknown';
    wake[eng] = (wake[eng] ?? 0) + 1;
  }

  return {
    stt: Object.fromEntries(
      Object.entries(stt).map(([k, v]) => [k, Math.round(safeDivide(v.ok, v.total) * 1000) / 1000]),
    ),
    tts: Object.fromEntries(Object.entries(tts).map(([k]) => [k, 1.0])),
    wake: Object.fromEntries(Object.entries(wake).map(([k]) => [k, 1.0])),
  };
}

/* ------------------------------------------------------------------ */
/*  Rotation                                                            */
/* ------------------------------------------------------------------ */

export function rotateOldAnalytics(maxDays = DEFAULT_MAX_DAYS): void {
  ensureDir();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - maxDays);
  cutoff.setUTCHours(0, 0, 0, 0);

  const files = readdirSync(ANALYTICS_DIR);
  for (const file of files) {
    if (!file.startsWith('events-') || !file.endsWith('.jsonl')) continue;
    const datePart = file.slice('events-'.length, 'events-'.length + 10);
    const fileDate = new Date(datePart + 'T00:00:00.000Z');
    if (isNaN(fileDate.getTime())) continue;

    if (fileDate < cutoff) {
      try {
        const filePath = resolve(ANALYTICS_DIR, file);
        const st = statSync(filePath);
        if (st.isFile()) {
          unlinkSync(filePath);
          log.info(`Rotated old voice analytics file: ${file}`);
        }
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
