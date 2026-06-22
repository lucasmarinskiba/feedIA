/**
 * Memorabilia Archive de FeedIA — el museo del journey.
 *
 * Guarda los momentos importantes del camino: el primer post, los primeros 1000,
 * el post que cambió todo, la primera venta. Como un álbum de fotos digital
 * que el usuario revisa de vez en cuando y se emociona.
 *
 * Filosofía: la nostalgia es lo que ata al usuario al sistema. Tu hogar tiene
 * memorias. El sistema también.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getTopPerformers, getRecentPosts } from '../analytics/performanceDB.js';
import { getMilestones, getRecentDailyMetrics } from '../growth/growthEngine.js';
import { getUnlockedAchievements } from './achievementSystem.js';
import { getRecentCelebrations } from './celebrationEngine.js';
import { listGoals } from '../goals/goalManager.js';
import type { BrandProfile } from '../../config/types.js';

const MEMORABILIA_PATH = join(process.cwd(), 'data', 'experience', 'memorabilia.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MemoryType =
  | 'first-post'
  | 'first-milestone'
  | 'viral-post'
  | 'first-sale'
  | 'best-week'
  | 'comeback'
  | 'meaningful-comment'
  | 'collab-moment'
  | 'launch-day'
  | 'anniversary'
  | 'breakthrough'
  | 'community-love'; // un mensaje de fan que emocionó

export interface Memory {
  id: string;
  type: MemoryType;
  capturedAt: string; // cuando se guardó
  happenedAt: string; // cuando ocurrió en realidad
  title: string;
  description: string;
  storyText: string; // narrativa
  associatedData: {
    postId?: string;
    metric?: { name: string; value: number };
    quote?: string; // texto memorable (comentario, DM, etc.)
    photoUrl?: string; // imagen asociada
    relatedEntityIds?: string[];
  };
  emotionalWeight: 1 | 2 | 3 | 4 | 5; // 5 = momento definitorio
  tags: string[];
  pinned: boolean;
  shareCount: number;
  revisitCount: number;
  lastRevisitedAt?: string;
}

interface MemorabiliaStore {
  version: number;
  memories: Memory[];
  yearbooks: Array<{ year: number; generatedAt: string; markdown: string; coverEmoji: string }>;
  lastUpdated: string;
}

const DEFAULT_STORE: MemorabiliaStore = {
  version: 1,
  memories: [],
  yearbooks: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): MemorabiliaStore => {
  try {
    ensureDir();
    if (!existsSync(MEMORABILIA_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(MEMORABILIA_PATH, 'utf8')) as MemorabiliaStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: MemorabiliaStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(MEMORABILIA_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Captura de memorias ──────────────────────────────────────────────────────

export interface CaptureMemoryInput {
  type: MemoryType;
  title?: string; // si se omite, se infiere
  description?: string;
  happenedAt?: string;
  associatedData: Memory['associatedData'];
  emotionalWeight?: 1 | 2 | 3 | 4 | 5;
  generateStory?: boolean; // usar AI para narrar
  brand?: BrandProfile;
  tags?: string[];
}

export const captureMemory = async (input: CaptureMemoryInput): Promise<Memory> => {
  const store = loadStore();

  let storyText = '';
  let finalTitle = input.title ?? '';
  if (input.generateStory && input.brand) {
    const generated = await generateMemoryStory(input.type, input.associatedData, input.brand);
    storyText = generated.story;
    if (!finalTitle) finalTitle = generated.title;
  } else {
    storyText = input.description ?? '';
    if (!finalTitle) finalTitle = DEFAULT_TITLES[input.type];
  }

  const memory: Memory = {
    id: `memory-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: input.type,
    capturedAt: new Date().toISOString(),
    happenedAt: input.happenedAt ?? new Date().toISOString(),
    title: finalTitle,
    description: input.description ?? '',
    storyText,
    associatedData: input.associatedData,
    emotionalWeight: input.emotionalWeight ?? 3,
    tags: input.tags ?? [input.type],
    pinned: false,
    shareCount: 0,
    revisitCount: 0,
  };

  store.memories.push(memory);
  saveStore(store);
  log.info(`[Memorabilia] Memoria capturada: "${memory.title}" (${memory.type})`);
  return memory;
};

const DEFAULT_TITLES: Record<MemoryType, string> = {
  'first-post': 'El primer paso',
  'first-milestone': 'El primer hito',
  'viral-post': 'Cuando explotó',
  'first-sale': 'El primer cliente',
  'best-week': 'La mejor semana',
  comeback: 'El regreso',
  'meaningful-comment': 'Un mensaje que cambió todo',
  'collab-moment': 'La colab que importó',
  'launch-day': 'El día del lanzamiento',
  anniversary: 'Aniversario',
  breakthrough: 'El click',
  'community-love': 'Cuando la gente respondió',
};

// ── Generación de narrativa con AI ───────────────────────────────────────────

const generateMemoryStory = async (
  type: MemoryType,
  data: Memory['associatedData'],
  brand: BrandProfile,
): Promise<{ title: string; story: string }> => {
  const prompt = `Escribí una memoria emotiva pero breve sobre un momento del journey de @${brand.name}.

Tipo de memoria: ${type}
Datos asociados: ${JSON.stringify(data)}

La narrativa debe sentirse como una página de diario — íntima, simple, real. No épica ni corporativa.

JSON:
{
  "title": "1 línea memorable (max 60 chars)",
  "story": "3-5 líneas que cuentan el momento con calidez"
}`;

  return routerAskJson<{ title: string; story: string }>(prompt, {
    taskType: 'response',
    maxTokens: 600,
    systemPrompt: 'Sos un escritor de memorias. Tono íntimo, cálido, simple.',
  }).catch(() => ({
    title: DEFAULT_TITLES[type],
    story: `Un momento que se guarda. ${data.quote ?? data.metric?.value ?? ''}`,
  }));
};

// ── Auto-detección de memorias para capturar ─────────────────────────────────

export const autoDetectAndCapture = async (brand: BrandProfile): Promise<Memory[]> => {
  const captured: Memory[] = [];
  const store = loadStore();
  const existingTypes = new Set(
    store.memories.map((m) => `${m.type}:${m.associatedData.postId ?? m.associatedData.metric?.name ?? ''}`),
  );

  // First post
  const allPosts = getRecentPosts(365);
  if (allPosts.length > 0 && !existingTypes.has('first-post:')) {
    const firstPost = allPosts[allPosts.length - 1]!;
    captured.push(
      await captureMemory({
        type: 'first-post',
        brand,
        generateStory: true,
        happenedAt: firstPost.publishedAt,
        emotionalWeight: 4,
        associatedData: {
          postId: firstPost.id,
          quote: firstPost.hookText,
        },
      }),
    );
  }

  // Viral posts (top 3)
  const tops = getTopPerformers(undefined, 3);
  for (const post of tops) {
    const key = `viral-post:${post.id}`;
    if (existingTypes.has(key)) continue;
    if (post.metrics.reach < 5000) continue;
    captured.push(
      await captureMemory({
        type: 'viral-post',
        brand,
        generateStory: true,
        happenedAt: post.publishedAt,
        emotionalWeight: 5,
        associatedData: {
          postId: post.id,
          quote: post.hookText,
          metric: { name: 'reach', value: post.metrics.reach },
        },
      }),
    );
  }

  // First milestone
  const milestones = getMilestones(20);
  for (const m of milestones) {
    const key = `first-milestone:${m.id}`;
    if (existingTypes.has(key)) continue;
    if (m.type !== 'followers') continue;
    captured.push(
      await captureMemory({
        type: 'first-milestone',
        brand,
        generateStory: true,
        happenedAt: m.achievedAt,
        emotionalWeight: 4,
        associatedData: {
          metric: { name: m.type, value: Number(m.value) },
        },
        title: m.description,
      }),
    );
  }

  // Best week
  const last90Days = getRecentDailyMetrics(90);
  if (last90Days.length >= 7 && !existingTypes.has('best-week:')) {
    // Encontrar la mejor semana
    let bestWeekStart = 0;
    let bestWeekTotal = -Infinity;
    for (let i = 0; i <= last90Days.length - 7; i++) {
      const week = last90Days.slice(i, i + 7);
      const total = week.reduce((s, d) => s + d.followersDelta, 0);
      if (total > bestWeekTotal) {
        bestWeekTotal = total;
        bestWeekStart = i;
      }
    }
    if (bestWeekTotal > 50) {
      const weekData = last90Days.slice(bestWeekStart, bestWeekStart + 7);
      captured.push(
        await captureMemory({
          type: 'best-week',
          brand,
          generateStory: true,
          happenedAt: weekData[0]!.date,
          emotionalWeight: 4,
          associatedData: {
            metric: { name: 'best-week-delta', value: bestWeekTotal },
          },
        }),
      );
    }
  }

  log.info(`[Memorabilia] Auto-capturadas ${captured.length} memorias nuevas`);
  return captured;
};

// ── Pinear ────────────────────────────────────────────────────────────────────

export const pinMemory = (memoryId: string): Memory | null => {
  const store = loadStore();
  const m = store.memories.find((mem) => mem.id === memoryId);
  if (!m) return null;
  m.pinned = true;
  saveStore(store);
  return m;
};

export const unpinMemory = (memoryId: string): Memory | null => {
  const store = loadStore();
  const m = store.memories.find((mem) => mem.id === memoryId);
  if (!m) return null;
  m.pinned = false;
  saveStore(store);
  return m;
};

export const markRevisited = (memoryId: string): Memory | null => {
  const store = loadStore();
  const m = store.memories.find((mem) => mem.id === memoryId);
  if (!m) return null;
  m.revisitCount++;
  m.lastRevisitedAt = new Date().toISOString();
  saveStore(store);
  return m;
};

// ── Listado y búsqueda ────────────────────────────────────────────────────────

export const listMemories = (
  filters: {
    type?: MemoryType;
    minWeight?: 1 | 2 | 3 | 4 | 5;
    pinned?: boolean;
    fromDate?: string;
    toDate?: string;
  } = {},
): Memory[] => {
  let memories = loadStore().memories;
  if (filters.type) memories = memories.filter((m) => m.type === filters.type);
  if (filters.minWeight) memories = memories.filter((m) => m.emotionalWeight >= filters.minWeight!);
  if (filters.pinned === true) memories = memories.filter((m) => m.pinned);
  if (filters.pinned === false) memories = memories.filter((m) => !m.pinned);
  if (filters.fromDate) memories = memories.filter((m) => m.happenedAt >= filters.fromDate!);
  if (filters.toDate) memories = memories.filter((m) => m.happenedAt <= filters.toDate!);
  return memories.sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
};

export const getMemory = (memoryId: string): Memory | null =>
  loadStore().memories.find((m) => m.id === memoryId) ?? null;

// ── Random throwback (sorpresa nostálgica) ───────────────────────────────────

export const getThrowbackMemory = (): Memory | null => {
  const memories = loadStore().memories.filter((m) => m.emotionalWeight >= 3);
  if (memories.length === 0) return null;
  // Preferir las más antiguas y no revisitadas recientemente
  const cutoffRecent = new Date(Date.now() - 30 * 86400000).toISOString();
  const candidates = memories.filter((m) => !m.lastRevisitedAt || m.lastRevisitedAt < cutoffRecent);
  const pool = candidates.length > 0 ? candidates : memories;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
};

// ── Yearbook (resumen anual) ──────────────────────────────────────────────────

export const generateYearbook = async (
  year: number,
  brand: BrandProfile,
): Promise<{ markdown: string; coverEmoji: string }> => {
  const memories = listMemories({
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`,
  });
  const achievements = getUnlockedAchievements().filter((a) => a.unlockedAt.startsWith(String(year)));
  const celebrations = getRecentCelebrations(100).filter((c) => c.triggeredAt.startsWith(String(year)));
  const milestones = getMilestones(50).filter((m) => m.achievedAt.startsWith(String(year)));
  const goals = listGoals({ status: 'completed' }).filter((g) => g.completedAt?.startsWith(String(year)));

  const prompt = `Escribí el "yearbook" del año ${year} para @${brand.name}.

DATOS DEL AÑO:
- Memorias capturadas: ${memories.length}
- Logros desbloqueados: ${achievements.length} (${achievements.filter((a) => a.rarity === 'legendaria' || a.rarity === 'mítica').length} de gran rareza)
- Hitos: ${milestones.length}
- Metas completadas: ${goals.length}
- Celebraciones: ${celebrations.length}

TOP MEMORIAS DEL AÑO:
${memories
  .slice(0, 8)
  .map((m) => `- ${m.title}: ${m.description.slice(0, 80)}`)
  .join('\n')}

TOP LOGROS DEL AÑO:
${achievements
  .slice(0, 5)
  .map((a) => `- ${a.name} (${a.rarity}): ${a.description}`)
  .join('\n')}

Tono: emotivo, retrospectivo, mirando hacia adelante. Como abrir un álbum de fotos al final del año.

JSON:
{
  "coverEmoji": "1 emoji que defina el año",
  "markdown": "Yearbook completo en markdown con secciones: # Título del año / ## El año en números / ## Momentos que importaron / ## Lo que aprendí / ## Hacia el próximo año"
}`;

  const yearbook = await routerAskJson<{ coverEmoji: string; markdown: string }>(prompt, {
    taskType: 'analysis',
    maxTokens: 3000,
    systemPrompt: 'Sos un escritor de memorias. Generás un álbum del año que el usuario va a guardar para siempre.',
  }).catch(() => ({
    coverEmoji: '📖',
    markdown: `# ${year} — un año en FeedIA\n\nMemorias: ${memories.length}\nLogros: ${achievements.length}\nHitos: ${milestones.length}`,
  }));

  const store = loadStore();
  store.yearbooks.push({
    year,
    generatedAt: new Date().toISOString(),
    markdown: yearbook.markdown,
    coverEmoji: yearbook.coverEmoji,
  });
  saveStore(store);

  log.info(`[Memorabilia] Yearbook ${year} generado para @${brand.name}`);
  return yearbook;
};

export const getYearbook = (year: number): { markdown: string; coverEmoji: string; generatedAt: string } | null => {
  const store = loadStore();
  const yb = store.yearbooks.find((y) => y.year === year);
  if (!yb) return null;
  return { markdown: yb.markdown, coverEmoji: yb.coverEmoji, generatedAt: yb.generatedAt };
};

export const listYearbooks = (): Array<{ year: number; coverEmoji: string; generatedAt: string }> =>
  loadStore()
    .yearbooks.map((y) => ({ year: y.year, coverEmoji: y.coverEmoji, generatedAt: y.generatedAt }))
    .sort((a, b) => b.year - a.year);

// ── Highlight reel (top N de toda la vida) ───────────────────────────────────

export interface HighlightReel {
  generatedAt: string;
  brandName: string;
  totalMemories: number;
  spanFromTo: { from: string; to: string };
  highlights: Memory[];
  summary: string;
}

export const buildHighlightReel = async (brand: BrandProfile, count = 10): Promise<HighlightReel> => {
  const memories = loadStore().memories;
  if (memories.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      brandName: brand.name,
      totalMemories: 0,
      spanFromTo: { from: '', to: '' },
      highlights: [],
      summary: 'Aún no hay memorias capturadas.',
    };
  }

  // Top por emotional weight + pinned
  const highlights = [...memories]
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.emotionalWeight - a.emotionalWeight;
    })
    .slice(0, count);

  const sorted = [...memories].sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
  const from = sorted[0]?.happenedAt ?? '';
  const to = sorted[sorted.length - 1]?.happenedAt ?? '';

  const summaryPrompt = `Hacé un resumen poético del journey de @${brand.name} desde ${from.split('T')[0]} hasta hoy, basándote en estos momentos:

${highlights.map((m, i) => `${i + 1}. ${m.title}: ${m.description.slice(0, 100)}`).join('\n')}

Devolvé SOLO el párrafo (4-6 líneas), sin prefijos.`;

  const { ask } = await import('../../agent/tokenRouter.js');
  const summary = await ask(summaryPrompt, { taskType: 'analysis', maxTokens: 600 })
    .then((r) => r.text.trim())
    .catch(() => `Un journey con ${memories.length} momentos memorables. Sigue.`);

  return {
    generatedAt: new Date().toISOString(),
    brandName: brand.name,
    totalMemories: memories.length,
    spanFromTo: { from, to },
    highlights,
    summary,
  };
};

// ── Snapshot ─────────────────────────────────────────────────────────────────

export const getMemorabiliaSnapshot = (): {
  totalMemories: number;
  byType: Record<string, number>;
  byWeight: Record<string, number>;
  pinnedCount: number;
  yearbooks: number;
  totalRevisits: number;
  lastCapturedAt?: string;
  oldestMemoryAt?: string;
} => {
  const store = loadStore();
  const byType: Record<string, number> = {};
  const byWeight: Record<string, number> = {};
  let pinned = 0;
  let revisits = 0;
  let lastCaptured: string | undefined;
  let oldest: string | undefined;

  for (const m of store.memories) {
    byType[m.type] = (byType[m.type] ?? 0) + 1;
    byWeight[`weight-${m.emotionalWeight}`] = (byWeight[`weight-${m.emotionalWeight}`] ?? 0) + 1;
    if (m.pinned) pinned++;
    revisits += m.revisitCount;
    if (!lastCaptured || m.capturedAt > lastCaptured) lastCaptured = m.capturedAt;
    if (!oldest || m.happenedAt < oldest) oldest = m.happenedAt;
  }

  return {
    totalMemories: store.memories.length,
    byType,
    byWeight,
    pinnedCount: pinned,
    yearbooks: store.yearbooks.length,
    totalRevisits: revisits,
    lastCapturedAt: lastCaptured,
    oldestMemoryAt: oldest,
  };
};

// ── On-this-day (recordatorios temporales) ───────────────────────────────────

export const getOnThisDayMemories = (): Memory[] => {
  const memories = loadStore().memories;
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  return memories.filter((m) => {
    const memDate = new Date(m.happenedAt);
    return memDate.getMonth() === todayMonth && memDate.getDate() === todayDate;
  });
};

export const exportMemorabiliaState = (): MemorabiliaStore => loadStore();
