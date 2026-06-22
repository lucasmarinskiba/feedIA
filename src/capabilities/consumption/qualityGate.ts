/**
 * Quality Gate for AI Support de FeedIA — auditoría de calidad de respuestas IA.
 *
 * Cada respuesta del sistema (DM, comment, support reply, caption) puede ser
 * auditada contra criterios objetivos: precisión, tono, accionabilidad,
 * ausencia de alucinación. Si una respuesta no pasa el gate, se bloquea o
 * se escala. Acumula métricas globales para detectar degradación.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import type { BrandProfile } from '../../config/types.js';

const QUALITY_PATH = join(process.cwd(), 'data', 'consumption', 'quality-gate.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ResponseSurface =
  | 'dm-reply'
  | 'comment-reply'
  | 'caption'
  | 'support-message'
  | 'story-text'
  | 'cta'
  | 'public-announcement';

export type QualityDimension = 'precision' | 'tone' | 'actionability' | 'hallucination' | 'safety' | 'brand-alignment';

export interface QualityScore {
  overall: number; // 0-100
  dimensions: Record<QualityDimension, number>;
  passes: boolean;
  band: 'excelente' | 'aceptable' | 'borderline' | 'rechazada';
  issues: Array<{ dimension: QualityDimension; severity: 'low' | 'medium' | 'high'; description: string }>;
  recommendation: 'send' | 'edit' | 'escalate' | 'block';
  reasoning: string;
}

export interface QualityCheckRecord {
  id: string;
  at: string;
  surface: ResponseSurface;
  inputContext: string;
  responseText: string;
  score: QualityScore;
  wasUsed: boolean;
  userOverride?: 'forced-send' | 'rewrote' | 'cancelled';
  metadata?: Record<string, unknown>;
}

interface QualityStore {
  version: number;
  checks: QualityCheckRecord[];
  rollingMetrics: {
    last24h: { total: number; passed: number; blocked: number; avgScore: number };
    last7d: { total: number; passed: number; blocked: number; avgScore: number };
    last30d: { total: number; passed: number; blocked: number; avgScore: number };
  };
  thresholds: Record<ResponseSurface, number>;
  lastUpdated: string;
}

const DEFAULT_THRESHOLDS: Record<ResponseSurface, number> = {
  'dm-reply': 70,
  'comment-reply': 70,
  caption: 65,
  'support-message': 80,
  'story-text': 60,
  cta: 75,
  'public-announcement': 80,
};

const DEFAULT_STORE: QualityStore = {
  version: 1,
  checks: [],
  rollingMetrics: {
    last24h: { total: 0, passed: 0, blocked: 0, avgScore: 0 },
    last7d: { total: 0, passed: 0, blocked: 0, avgScore: 0 },
    last30d: { total: 0, passed: 0, blocked: 0, avgScore: 0 },
  },
  thresholds: DEFAULT_THRESHOLDS,
  lastUpdated: new Date().toISOString(),
};

const MAX_CHECKS = 2000;

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'consumption');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): QualityStore => {
  try {
    ensureDir();
    if (!existsSync(QUALITY_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(QUALITY_PATH, 'utf8')) as QualityStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: QualityStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(QUALITY_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Evaluación de calidad ─────────────────────────────────────────────────────

export const evaluateResponseQuality = async (
  responseText: string,
  surface: ResponseSurface,
  inputContext: string,
  brand: BrandProfile,
): Promise<QualityScore> => {
  const threshold = loadStore().thresholds[surface];

  const prompt = `Sos auditor de calidad de IA. Evaluá esta respuesta en 6 dimensiones.

CONTEXTO DEL INPUT: ${inputContext.slice(0, 500)}
SUPERFICIE: ${surface}
RESPUESTA A AUDITAR: "${responseText}"

MARCA: ${brand.name} | NICHO: ${brand.niche}
TONO: ${brand.voice.tone.join(', ')}
PALABRAS PROHIBIDAS: ${brand.voice.forbidden.join(', ') || '(ninguna)'}

Calificá 0-100 cada dimensión:
- precision: ¿la respuesta es exacta a lo que se preguntó/pidió?
- tone: ¿respeta el tono de marca?
- actionability: ¿el usuario sabe qué hacer después de leerla?
- hallucination: ¿inventa datos? (100 = NO inventa, 0 = lleno de alucinaciones)
- safety: ¿es segura? (no expone datos, no promete imposibles, no es discriminatoria)
- brand-alignment: ¿se siente "de la marca"?

JSON:
{
  "overall": número (promedio ponderado),
  "dimensions": {
    "precision": número,
    "tone": número,
    "actionability": número,
    "hallucination": número,
    "safety": número,
    "brand-alignment": número
  },
  "issues": [{ "dimension": "...", "severity": "low|medium|high", "description": "..." }],
  "recommendation": "send | edit | escalate | block",
  "reasoning": "1 línea explicando la nota"
}`;

  try {
    const result = await routerAskJson<Omit<QualityScore, 'passes' | 'band'>>(prompt, {
      taskType: 'analysis',
      maxTokens: 1500,
      systemPrompt:
        'Sos un auditor estricto. Si hay alucinaciones o problemas de safety, marcar severity=high y recommendation=block.',
    });

    const passes = result.overall >= threshold && !result.issues.some((i) => i.severity === 'high');
    const band: QualityScore['band'] =
      result.overall >= 85
        ? 'excelente'
        : result.overall >= 70
          ? 'aceptable'
          : result.overall >= 50
            ? 'borderline'
            : 'rechazada';

    return { ...result, passes, band };
  } catch (err) {
    log.warn(`[QualityGate] Evaluación falló: ${(err as Error).message}`);
    return {
      overall: 60,
      dimensions: {
        precision: 60,
        tone: 60,
        actionability: 60,
        hallucination: 100,
        safety: 100,
        'brand-alignment': 60,
      },
      passes: false,
      band: 'borderline',
      issues: [
        { dimension: 'precision', severity: 'medium', description: 'Evaluación AI falló — usar default conservador' },
      ],
      recommendation: 'edit',
      reasoning: 'Fallback porque el evaluador no pudo correr',
    };
  }
};

export const checkAndRecord = async (input: {
  responseText: string;
  surface: ResponseSurface;
  inputContext: string;
  brand: BrandProfile;
  metadata?: Record<string, unknown>;
}): Promise<QualityCheckRecord> => {
  const score = await evaluateResponseQuality(input.responseText, input.surface, input.inputContext, input.brand);
  const record: QualityCheckRecord = {
    id: `qc-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    at: new Date().toISOString(),
    surface: input.surface,
    inputContext: input.inputContext.slice(0, 500),
    responseText: input.responseText,
    score,
    wasUsed: score.recommendation === 'send',
    metadata: input.metadata,
  };

  const store = loadStore();
  store.checks.push(record);
  if (store.checks.length > MAX_CHECKS) store.checks = store.checks.slice(-MAX_CHECKS);
  recomputeRollingMetrics(store);
  saveStore(store);
  return record;
};

const recomputeRollingMetrics = (store: QualityStore): void => {
  const now = Date.now();
  const summarize = (since: number): { total: number; passed: number; blocked: number; avgScore: number } => {
    const checks = store.checks.filter((c) => new Date(c.at).getTime() >= since);
    const total = checks.length;
    const passed = checks.filter((c) => c.score.passes).length;
    const blocked = checks.filter((c) => c.score.recommendation === 'block').length;
    const avgScore = total > 0 ? checks.reduce((s, c) => s + c.score.overall, 0) / total : 0;
    return { total, passed, blocked, avgScore: Number(avgScore.toFixed(2)) };
  };
  store.rollingMetrics = {
    last24h: summarize(now - 86400000),
    last7d: summarize(now - 7 * 86400000),
    last30d: summarize(now - 30 * 86400000),
  };
};

// ── Threshold management ─────────────────────────────────────────────────────

export const setSurfaceThreshold = (surface: ResponseSurface, threshold: number): void => {
  const store = loadStore();
  store.thresholds[surface] = Math.max(0, Math.min(100, threshold));
  saveStore(store);
};

export const getThresholds = (): Record<ResponseSurface, number> => loadStore().thresholds;

// ── Override del usuario ─────────────────────────────────────────────────────

export const recordUserOverride = (
  checkId: string,
  override: NonNullable<QualityCheckRecord['userOverride']>,
): QualityCheckRecord | null => {
  const store = loadStore();
  const check = store.checks.find((c) => c.id === checkId);
  if (!check) return null;
  check.userOverride = override;
  if (override === 'forced-send') check.wasUsed = true;
  saveStore(store);
  return check;
};

// ── Dashboard / snapshot ─────────────────────────────────────────────────────

export interface QualityDashboard {
  rollingMetrics: QualityStore['rollingMetrics'];
  thresholds: Record<ResponseSurface, number>;
  bySurface: Array<{ surface: ResponseSurface; total: number; passRate: number; avgScore: number; blockRate: number }>;
  worstChecks: QualityCheckRecord[];
  bestChecks: QualityCheckRecord[];
  topIssues: Array<{ dimension: QualityDimension; count: number; avgSeverityScore: number }>;
  degradationAlert: string | null;
}

export const buildQualityDashboard = (): QualityDashboard => {
  const store = loadStore();
  const surfaces = Object.keys(store.thresholds) as ResponseSurface[];

  const bySurface = surfaces.map((s) => {
    const sChecks = store.checks.filter((c) => c.surface === s);
    const total = sChecks.length;
    const passed = sChecks.filter((c) => c.score.passes).length;
    const blocked = sChecks.filter((c) => c.score.recommendation === 'block').length;
    const avgScore = total > 0 ? sChecks.reduce((acc, c) => acc + c.score.overall, 0) / total : 0;
    return {
      surface: s,
      total,
      passRate: total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0,
      avgScore: Number(avgScore.toFixed(2)),
      blockRate: total > 0 ? Number(((blocked / total) * 100).toFixed(1)) : 0,
    };
  });

  const recent = store.checks.slice(-200);
  const worstChecks = [...recent].sort((a, b) => a.score.overall - b.score.overall).slice(0, 10);
  const bestChecks = [...recent].sort((a, b) => b.score.overall - a.score.overall).slice(0, 10);

  // Top issues por dimensión
  const issueCounts = new Map<QualityDimension, { count: number; severities: number[] }>();
  for (const c of recent) {
    for (const issue of c.score.issues) {
      const cur = issueCounts.get(issue.dimension) ?? { count: 0, severities: [] };
      cur.count++;
      cur.severities.push(issue.severity === 'high' ? 3 : issue.severity === 'medium' ? 2 : 1);
      issueCounts.set(issue.dimension, cur);
    }
  }
  const topIssues = [...issueCounts.entries()]
    .map(([dimension, data]) => ({
      dimension,
      count: data.count,
      avgSeverityScore: data.severities.reduce((s, x) => s + x, 0) / Math.max(1, data.severities.length),
    }))
    .sort((a, b) => b.count - a.count);

  // Degradación: comparar last7d con last30d
  const m = store.rollingMetrics;
  let degradationAlert: string | null = null;
  if (m.last30d.total > 50 && m.last7d.avgScore < m.last30d.avgScore - 10) {
    degradationAlert = `Calidad bajó de ${m.last30d.avgScore.toFixed(0)} (30d) a ${m.last7d.avgScore.toFixed(0)} (7d). Revisar prompts y modelos.`;
  }

  return {
    rollingMetrics: store.rollingMetrics,
    thresholds: store.thresholds,
    bySurface,
    worstChecks,
    bestChecks,
    topIssues,
    degradationAlert,
  };
};

export const getRecentQualityChecks = (limit = 30): QualityCheckRecord[] => loadStore().checks.slice(-limit).reverse();

export const exportQualityState = (): QualityStore => loadStore();
