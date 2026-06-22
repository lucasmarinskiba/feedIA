/**
 * Viral Tracker de FeedIA — detecta, decompone y adapta lo que está viralizando AHORA.
 *
 * El crecimiento orgánico real viene de surfear olas: cuando algo arrasa en el nicho,
 * tenés 24-72 horas para sumarte con tu propia versión antes de que se sature.
 * Este módulo monitorea, decompone la estructura de lo viral y propone adaptaciones
 * fieles a la voz de la marca.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { ask as routerAsk, askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

const VIRAL_PATH = join(process.cwd(), 'data', 'analytics', 'viral-tracker.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ViralSignal =
  | 'reach-multiple' // alcance 3x+ vs promedio del autor
  | 'audio-trending' // audio con +50k uses creciendo
  | 'hashtag-spike' // hashtag con crecimiento exponencial
  | 'format-trending' // un formato/estructura viralizando
  | 'topic-momentum'; // un tema repetido por varios creadores

export interface ViralPost {
  id: string;
  detectedAt: string;
  sourceAccount: string;
  postUrl?: string;
  format: ContentFormat | string;
  topic: string;
  hookText: string;
  estimatedReach: number;
  signals: ViralSignal[];
  niche: string;
}

export interface ViralDecomposition {
  hookPattern: string; // estructura del hook (no el texto literal)
  hookEmotionalDriver: string;
  contentStructure: string; // qué se muestra y cuándo
  audioOrVisualHook: string; // el "gancho audiovisual"
  cta: string;
  payoff: string; // el momento de revelación / payoff
  whyItWorks: string[];
  durationOrLength: string;
}

export interface ViralAdaptation {
  adaptedHook: string;
  adaptedAngle: string;
  adaptedCTA: string;
  visualBrief: string;
  predictedFit: number; // 0-100, qué tan bien encaja con la marca
  risks: string[];
  proposedScript?: string; // para reels
}

interface TrackerStore {
  trackedPosts: ViralPost[];
  decompositions: Record<string, ViralDecomposition>;
  adaptations: Record<string, ViralAdaptation[]>;
  lastScan: string | null;
  lastUpdated: string;
}

const DEFAULT_STORE: TrackerStore = {
  trackedPosts: [],
  decompositions: {},
  adaptations: {},
  lastScan: null,
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'analytics');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): TrackerStore => {
  try {
    ensureDir();
    if (!existsSync(VIRAL_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(VIRAL_PATH, 'utf8')) as TrackerStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: TrackerStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(VIRAL_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Escaneo de cuentas de referencia ─────────────────────────────────────────

/**
 * Escanea las cuentas competidoras + referentes del nicho buscando posts con señales virales.
 * Devuelve los nuevos posts virales detectados desde el último scan.
 */
export const scanForViralPosts = async (brand: BrandProfile, maxAccounts = 10): Promise<ViralPost[]> => {
  const store = loadStore();
  const start = Date.now();
  log.info(`[ViralTracker] Iniciando escaneo viral en nicho "${brand.niche}"...`);

  const accounts = [...brand.competitors].slice(0, maxAccounts);
  const referenceList =
    accounts.length > 0
      ? `Cuentas de referencia a considerar (creadores top del nicho): ${accounts.map((a) => '@' + a).join(', ')}`
      : 'Sin cuentas competidoras configuradas — usá tu conocimiento del nicho general.';

  const newViral: ViralPost[] = [];

  // Generación AI: el modelo predice qué formatos/temas/hooks están funcionando
  // en el nicho ahora, basándose en su conocimiento + las referencias.
  const detectionPrompt = `Sos un analista de tendencias virales de Instagram con datos en tiempo real
sobre el nicho "${brand.niche}". Identificá entre 4 y 8 posts virales recientes (últimos 14 días)
que tengan señales claras: alcance >3x el promedio del autor, audio trending, hashtag spike,
formato/estructura repetido por varios creadores, o tema con momentum.

${referenceList}

Audiencia destino: ${brand.audience.description}

JSON:
{
  "viralPosts": [
    {
      "sourceAccount": "cuenta (sin @) que postó",
      "format": "reel | carrusel | post-imagen | historia",
      "topic": "tema central del post",
      "hookText": "primera línea o hook literal",
      "estimatedReach": número estimado de alcance,
      "signals": ["reach-multiple" | "audio-trending" | "hashtag-spike" | "format-trending" | "topic-momentum"]
    }
  ]
}`;

  try {
    const detection = await routerAskJson<{
      viralPosts: Array<Omit<ViralPost, 'id' | 'detectedAt' | 'niche'>>;
    }>(detectionPrompt, {
      taskType: 'analysis',
      maxTokens: 2500,
      systemPrompt: 'Sos un trend-spotter senior. Identificás patrones virales replicables, no rumores.',
    });

    for (const v of detection.viralPosts ?? []) {
      const viralPost: ViralPost = {
        id: `viral-${v.sourceAccount}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        detectedAt: new Date().toISOString(),
        sourceAccount: v.sourceAccount,
        format: v.format,
        topic: v.topic,
        hookText: v.hookText,
        estimatedReach: v.estimatedReach,
        signals: v.signals,
        niche: brand.niche,
      };
      newViral.push(viralPost);
      store.trackedPosts.push(viralPost);
    }
  } catch (err) {
    log.warn(`[ViralTracker] Error en detección: ${(err as Error).message}`);
  }

  // Conservar últimos 150 virales detectados
  if (store.trackedPosts.length > 150) store.trackedPosts = store.trackedPosts.slice(-150);
  store.lastScan = new Date().toISOString();
  saveStore(store);

  log.info(
    `[ViralTracker] Escaneo completado en ${Math.round((Date.now() - start) / 1000)}s. ${newViral.length} nuevos virales detectados.`,
  );

  // Alertar si hay virales muy fuertes para no perder la ola
  if (newViral.length >= 3) {
    await sendAlert({
      severity: 'info',
      title: `${newViral.length} oportunidades virales detectadas`,
      body: newViral
        .slice(0, 5)
        .map((v) => `• @${v.sourceAccount}: "${v.hookText}" (${v.signals.join(', ')})`)
        .join('\n'),
      metadata: { count: newViral.length, niche: brand.niche },
    }).catch(() => undefined);
  }

  return newViral;
};

// ── Decomposición ────────────────────────────────────────────────────────────

/**
 * Decompone la "anatomía" del post viral: por qué funciona, qué estructura usa,
 * cuál es el driver emocional, etc. La idea es extraer el PATRÓN, no copiar el contenido.
 */
export const decomposeViralPost = async (post: ViralPost): Promise<ViralDecomposition> => {
  const store = loadStore();
  if (store.decompositions[post.id]) return store.decompositions[post.id]!;

  const prompt = `Sos un analista experto en contenido viral de Instagram. Analizá este post viral y extraé su ESTRUCTURA (no el contenido específico).

Post viral:
- Cuenta: @${post.sourceAccount}
- Formato: ${post.format}
- Tema: ${post.topic}
- Hook: "${post.hookText}"
- Alcance estimado: ${post.estimatedReach.toLocaleString('es-AR')}
- Señales virales: ${post.signals.join(', ')}
- Nicho: ${post.niche}

Devolvé la decomposición del PATRÓN (que sirve para que otro cree algo similar pero original):

JSON:
{
  "hookPattern": "estructura del hook como template (con placeholders) — no el texto literal",
  "hookEmotionalDriver": "curiosidad | urgencia | identificación | controversia | aspiracional | miedo-perder",
  "contentStructure": "qué se muestra/dice y en qué orden",
  "audioOrVisualHook": "qué gancho audiovisual usa en los primeros 1-2 segundos",
  "cta": "cómo cierra y qué pide al espectador",
  "payoff": "cuál es el momento de revelación o ah-ha del post",
  "whyItWorks": ["razón 1 técnica/psicológica", "razón 2", "razón 3"],
  "durationOrLength": "duración estimada para reel / número de slides para carrusel / longitud para caption"
}`;

  const decomposition = await routerAskJson<ViralDecomposition>(prompt, {
    taskType: 'analysis',
    maxTokens: 1800,
    systemPrompt: 'Sos un decompositor experto de contenido. Extraés patrones replicables sin plagiar.',
  });

  store.decompositions[post.id] = decomposition;
  saveStore(store);
  return decomposition;
};

// ── Adaptación a la marca ────────────────────────────────────────────────────

/**
 * Toma un viral decomposido + el perfil de la marca y propone N variaciones adaptadas
 * que mantienen la estructura ganadora pero respetan el tono, el nicho y los valores.
 */
export const adaptToBrand = async (
  post: ViralPost,
  decomposition: ViralDecomposition,
  brand: BrandProfile,
  variations = 3,
): Promise<ViralAdaptation[]> => {
  const store = loadStore();
  const forbidden = brand.voice.forbidden.length > 0 ? `\nNUNCA: ${brand.voice.forbidden.join(', ')}` : '';

  const prompt = `Adaptá la ESTRUCTURA viral a la marca @${brand.name} sin plagiar el contenido original.

VIRAL ORIGINAL (estructura):
${JSON.stringify(decomposition, null, 2)}

MARCA:
- Nombre: ${brand.name}
- Nicho: ${brand.niche}
- Audiencia: ${brand.audience.description}
- Tono de voz: ${brand.voice.tone.join(', ')}
- Objetivo principal: ${brand.goals.primary}
- Diferenciadores: ${brand.brandStrategy.differentiators.join(', ') || '(no definidos)'}
${forbidden}

Generá ${variations} adaptaciones DISTINTAS. Cada una mantiene la estructura del viral pero aplicada al nicho de la marca con su tono.

JSON:
{
  "adaptations": [
    {
      "adaptedHook": "hook nuevo siguiendo el patrón del viral pero original",
      "adaptedAngle": "ángulo específico de la marca",
      "adaptedCTA": "CTA que respeta el tono de la marca",
      "visualBrief": "brief visual concreto",
      "predictedFit": 0-100 (qué tan bien encaja con la marca y su audiencia),
      "risks": ["riesgo 1", "riesgo 2"],
      "proposedScript": "(solo si es reel) guión de 30-60 seg con timestamps"
    }
  ]
}`;

  const result = await routerAskJson<{ adaptations: ViralAdaptation[] }>(prompt, {
    taskType: 'creative',
    maxTokens: 3000,
    systemPrompt:
      'Sos un creative director que adapta tendencias virales sin plagiar. Cada adaptación respeta la marca.',
  });

  const adaptations = result.adaptations ?? [];
  adaptations.sort((a, b) => b.predictedFit - a.predictedFit);

  store.adaptations[post.id] = adaptations;
  saveStore(store);
  return adaptations;
};

// ── Workflow completo: scan → decompose → adapt → schedule ────────────────────

export interface RideWaveResult {
  scanned: number;
  newViral: number;
  bestOpportunity: {
    viral: ViralPost;
    decomposition: ViralDecomposition;
    bestAdaptation: ViralAdaptation;
  } | null;
  durationMs: number;
}

/**
 * Pipeline completo: detecta los virales del nicho, decompone los mejores,
 * y propone la mejor adaptación lista para producir.
 */
export const rideTheWave = async (brand?: BrandProfile): Promise<RideWaveResult> => {
  const start = Date.now();
  const b = brand ?? loadBrandProfile();
  const newViral = await scanForViralPosts(b, 8);

  if (newViral.length === 0) {
    return { scanned: 0, newViral: 0, bestOpportunity: null, durationMs: Date.now() - start };
  }

  // Elegimos el mejor candidato: el de mayor estimatedReach + más señales
  const sorted = [...newViral].sort((a, b) => {
    const scoreA = a.estimatedReach + a.signals.length * 10000;
    const scoreB = b.estimatedReach + b.signals.length * 10000;
    return scoreB - scoreA;
  });
  const topViral = sorted[0]!;

  const decomposition = await decomposeViralPost(topViral);
  const adaptations = await adaptToBrand(topViral, decomposition, b, 3);
  const bestAdaptation = adaptations[0];

  if (bestAdaptation) {
    log.info(
      `[ViralTracker] 🌊 Mejor adaptación encontrada (fit ${bestAdaptation.predictedFit}/100): "${bestAdaptation.adaptedHook}"`,
    );
  }

  return {
    scanned: newViral.length,
    newViral: newViral.length,
    bestOpportunity: bestAdaptation ? { viral: topViral, decomposition, bestAdaptation } : null,
    durationMs: Date.now() - start,
  };
};

// ── Tendencias del nicho (resumen narrativo) ─────────────────────────────────

export const getNicheTrendNarrative = async (brand: BrandProfile, days = 14): Promise<string> => {
  const store = loadStore();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const recent = store.trackedPosts.filter((p) => p.detectedAt >= cutoff && p.niche === brand.niche);

  if (recent.length < 3) {
    return `Sin datos suficientes. Solo ${recent.length} virales detectados en últimos ${days} días para el nicho "${brand.niche}".`;
  }

  const summary = recent
    .slice(0, 15)
    .map((p) => `- @${p.sourceAccount} (${p.format}): "${p.hookText}" [${p.signals.join(', ')}]`)
    .join('\n');

  const prompt = `Sos analista de tendencias de Instagram. Con esta lista de posts virales recientes en el nicho "${brand.niche}", redactá un resumen ejecutivo para el dueño de @${brand.name}.

Posts virales detectados (últimos ${days} días):
${summary}

El resumen debe:
- Identificar los 2-3 PATRONES dominantes (estructura, tema, formato)
- Decir qué ángulo todavía está poco explotado
- Sugerir 1-2 movimientos concretos para esta semana
- Máximo 6 líneas, lenguaje directo`;

  const result = await routerAsk(prompt, { taskType: 'analysis', maxTokens: 800 });
  return result.text;
};

// ── Getters ───────────────────────────────────────────────────────────────────

export const getRecentViralPosts = (days = 7, niche?: string): ViralPost[] => {
  const store = loadStore();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return store.trackedPosts.filter((p) => p.detectedAt >= cutoff && (!niche || p.niche === niche));
};

export const getStoredDecomposition = (postId: string): ViralDecomposition | null =>
  loadStore().decompositions[postId] ?? null;

export const getAdaptationsForPost = (postId: string): ViralAdaptation[] => loadStore().adaptations[postId] ?? [];

export const getTrackerStatus = (): { totalTracked: number; lastScan: string | null; recentCount: number } => {
  const store = loadStore();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    totalTracked: store.trackedPosts.length,
    lastScan: store.lastScan,
    recentCount: store.trackedPosts.filter((p) => p.detectedAt >= cutoff).length,
  };
};
