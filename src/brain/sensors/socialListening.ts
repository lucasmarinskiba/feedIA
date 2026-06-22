/**
 * Social Listening Brain — Escucha conversaciones sobre el nicho entero
 * No solo escucha menciones de la marca, sino del ECOSISTEMA:
 * - Qué preguntan las personas en el nicho
 * - Qué les duele
 * - Qué desean
 * - Qué contenido falta
 * - Qué competidores mencionan
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as niche from '../growth/nicheMastery.js';

const SL_PATH = resolve('data/runtime/brain/social-listening.json');

export interface ListeningSignal {
  id: string;
  text: string;
  source: string; // hashtag, comment, post, story
  platform: string;
  sentiment: 'positive' | 'negative' | 'question' | 'complaint' | 'desire';
  topic: string;
  niche: string;
  volume: number;
  firstHeard: string;
  lastHeard: string;
  relatedHandles: string[];
}

interface SLStore {
  signals: ListeningSignal[];
  topicIndex: Record<string, number>;
  lastScan: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): SLStore => {
  try {
    ensureDir();
    if (!existsSync(SL_PATH)) return { signals: [], topicIndex: {}, lastScan: new Date().toISOString() };
    return JSON.parse(readFileSync(SL_PATH, 'utf-8')) as SLStore;
  } catch {
    return { signals: [], topicIndex: {}, lastScan: new Date().toISOString() };
  }
};

const saveStore = (store: SLStore): void => {
  ensureDir();
  writeFileSync(SL_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Record a listening signal ──────────────────────────────────────────────

export const recordSignal = (
  text: string,
  source: string,
  platform: string,
  nicheName: string,
  relatedHandles: string[] = [],
): ListeningSignal => {
  const store = loadStore();

  // Detect sentiment
  const sentiment = detectSentiment(text);

  // Extract topic
  const topic = extractTopic(text, nicheName);

  const existing = store.signals.find(
    (s) =>
      s.text.toLowerCase().includes(text.toLowerCase().slice(0, 30)) ||
      text.toLowerCase().includes(s.text.toLowerCase().slice(0, 30)),
  );

  if (existing) {
    existing.volume += 1;
    existing.lastHeard = new Date().toISOString();
    for (const h of relatedHandles) {
      if (!existing.relatedHandles.includes(h)) existing.relatedHandles.push(h);
    }
    saveStore(store);
    return existing;
  }

  const signal: ListeningSignal = {
    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    text: text.slice(0, 500),
    source,
    platform,
    sentiment,
    topic,
    niche: nicheName,
    volume: 1,
    firstHeard: new Date().toISOString(),
    lastHeard: new Date().toISOString(),
    relatedHandles,
  };

  store.signals.push(signal);
  store.topicIndex[topic] = (store.topicIndex[topic] ?? 0) + 1;

  // Prune old
  const cutoff = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
  store.signals = store.signals.filter((s) => s.lastHeard > cutoff);

  saveStore(store);

  semantic.storeMemory(
    `Social listening: "${text.slice(0, 80)}..." [${sentiment}] en ${nicheName}`,
    'trend',
    { source, platform, topic, sentiment },
    sentiment === 'complaint' ? 0.8 : sentiment === 'desire' ? 0.7 : 0.4,
  );

  graph.addTriple(nicheName, `tiene señal ${sentiment}`, topic, 0.6, 'social-listening');

  log.info(`[SocialListening] ${sentiment}: "${text.slice(0, 60)}..." (${nicheName})`);
  return signal;
};

// ── Get content opportunities from listening ───────────────────────────────

export const getContentOpportunities = (
  nicheName: string,
): { topic: string; sentiment: string; volume: number; suggestion: string }[] => {
  const store = loadStore();
  const byTopic = new Map<string, { sentiment: string; volume: number; examples: string[] }>();

  for (const s of store.signals.filter((s) => s.niche === nicheName)) {
    const existing = byTopic.get(s.topic);
    if (existing) {
      existing.volume += s.volume;
      existing.examples.push(s.text);
    } else {
      byTopic.set(s.topic, { sentiment: s.sentiment, volume: s.volume, examples: [s.text] });
    }
  }

  return Array.from(byTopic.entries())
    .map(([topic, data]) => ({
      topic,
      sentiment: data.sentiment,
      volume: data.volume,
      suggestion: generateSuggestion(topic, data.sentiment, data.examples[0] ?? ''),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
};

// ── Get pain points ────────────────────────────────────────────────────────

export const getPainPoints = (nicheName: string): { pain: string; intensity: number; solution: string }[] => {
  const store = loadStore();
  const pains = store.signals.filter(
    (s) => s.niche === nicheName && (s.sentiment === 'negative' || s.sentiment === 'complaint'),
  );

  const byTopic = new Map<string, number>();
  for (const p of pains) byTopic.set(p.topic, (byTopic.get(p.topic) ?? 0) + p.volume);

  return Array.from(byTopic.entries())
    .map(([topic, intensity]) => ({
      pain: topic,
      intensity,
      solution: `Crear contenido que resuelva: "${topic}"`,
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);
};

// ── Helpers ────────────────────────────────────────────────────────────────

const detectSentiment = (text: string): ListeningSignal['sentiment'] => {
  const t = text.toLowerCase();
  if (t.match(/\b(odio|malo|peor|horrible|frustrado|decepcionado|timo|estafa)\b/)) return 'complaint';
  if (t.match(/\b(cómo|qué|dónde|por qué|cuál|alguno sabe|ayuda)\b/)) return 'question';
  if (t.match(/\b(amo|me encanta|genial|perfecto|increíble)\b/)) return 'positive';
  if (t.match(/\b(quisiera|deseo|me gustaría|necesito|quiero)\b/)) return 'desire';
  return 'negative';
};

const extractTopic = (text: string, nicheName: string): string => {
  // Simple extraction: find the most relevant keyword
  const nicheKeywords: Record<string, string[]> = {
    fitness: ['rutina', 'dieta', 'proteína', 'gym', 'peso', 'grasa', 'músculo'],
    beauty: ['piel', 'acné', 'maquillaje', 'cabello', 'arrugas', 'producto'],
    business: ['cliente', 'venta', 'marketing', 'precio', 'negocio', 'dinero'],
    tech: ['app', 'herramienta', 'automatización', 'software', 'IA', 'tutorial'],
  };

  const keywords = nicheKeywords[nicheName] ?? [];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return 'general';
};

const generateSuggestion = (topic: string, sentiment: string, example: string): string => {
  if (sentiment === 'question') return `Crear FAQ o tutorial sobre "${topic}"`;
  if (sentiment === 'complaint') return `Address pain point: "${topic}" con contenido empático + solución`;
  if (sentiment === 'desire') return `Crear contenido aspiracional sobre "${topic}"`;
  return `Explorar ángulo sobre "${topic}"`;
};

export const getStats = (): { totalSignals: number; topTopics: string[]; lastScan: string } => {
  const store = loadStore();
  const topTopics = Object.entries(store.topicIndex)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
  return { totalSignals: store.signals.length, topTopics, lastScan: store.lastScan };
};
