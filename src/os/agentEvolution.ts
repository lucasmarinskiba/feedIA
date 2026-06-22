/**
 * Motor de auto-evolución del sistema FeedIA.
 * Analiza el rendimiento de los agentes y sugiere/aplica mejoras:
 * - Ajusta parámetros (maxIterations, modelo, temperatura)
 * - Descubre nuevas APIs útiles vía publicapis.io
 * - Prioriza agentes según su tasa de éxito
 * - Registra "lecciones aprendidas" para mejorar prompts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../agent/logger.js';
import { ask } from '../agent/claude.js';
import { loadBrandProfile } from '../config/index.js';
import { getSystemHealth } from './selfHealing.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = join(__dirname, '../../data/runtime');
const EVOLUTION_FILE = join(RUNTIME_DIR, 'evolution.json');

export interface Lesson {
  id: string;
  agentId: string;
  context: string;
  lesson: string;
  appliedAt: string | null;
  impact: 'high' | 'medium' | 'low';
  category: 'prompt_improvement' | 'parameter_tuning' | 'new_capability' | 'api_discovery' | 'workflow_optimization';
}

export interface EvolutionState {
  version: number;
  lastEvolvedAt: string | null;
  lessons: Lesson[];
  discoveredApis: Array<{ name: string; url: string; category: string; addedAt: string }>;
  performanceHistory: Array<{
    timestamp: string;
    agentId: string;
    taskType: string;
    successRate: number;
    avgDurationMs: number;
  }>;
  improvements: Array<{
    timestamp: string;
    description: string;
    applied: boolean;
    impactMeasured?: string;
  }>;
}

const ensureDir = (): void => {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
};

const loadEvolution = (): EvolutionState => {
  ensureDir();
  if (!existsSync(EVOLUTION_FILE)) {
    return {
      version: 1,
      lastEvolvedAt: null,
      lessons: [],
      discoveredApis: [],
      performanceHistory: [],
      improvements: [],
    };
  }
  try {
    return JSON.parse(readFileSync(EVOLUTION_FILE, 'utf8')) as EvolutionState;
  } catch {
    return {
      version: 1,
      lastEvolvedAt: null,
      lessons: [],
      discoveredApis: [],
      performanceHistory: [],
      improvements: [],
    };
  }
};

const saveEvolution = (state: EvolutionState): void => {
  ensureDir();
  // Keep history bounded
  state.performanceHistory = state.performanceHistory.slice(-500);
  state.improvements = state.improvements.slice(-200);
  writeFileSync(EVOLUTION_FILE, JSON.stringify(state, null, 2), 'utf8');
};

export const recordPerformance = (
  agentId: string,
  taskType: string,
  successRate: number,
  avgDurationMs: number,
): void => {
  const state = loadEvolution();
  state.performanceHistory.push({
    timestamp: new Date().toISOString(),
    agentId,
    taskType,
    successRate,
    avgDurationMs,
  });
  saveEvolution(state);
};

export const addLesson = (lesson: Omit<Lesson, 'id' | 'appliedAt'>): void => {
  const state = loadEvolution();
  const id = `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  state.lessons.push({ ...lesson, id, appliedAt: null });
  saveEvolution(state);
  log.info(`[Evolution] Nueva lección registrada: ${lesson.lesson.slice(0, 80)}`);
};

/**
 * Ciclo de auto-evolución: analiza el estado del sistema y genera mejoras.
 * Se ejecuta automáticamente una vez por semana.
 */
export const runEvolutionCycle = async (): Promise<{
  newLessons: number;
  improvements: string[];
  discoveredApis: number;
}> => {
  log.info('[Evolution] Iniciando ciclo de auto-evolución...');
  const state = loadEvolution();
  const health = getSystemHealth();
  const brand = loadBrandProfile();
  const improvements: string[] = [];

  // ── Análisis de performance ────────────────────────────────────────────────
  const recentPerf = state.performanceHistory.slice(-100);
  const agentPerf: Record<string, { success: number; total: number; avgMs: number }> = {};

  for (const record of recentPerf) {
    if (!agentPerf[record.agentId]) {
      agentPerf[record.agentId] = { success: 0, total: 0, avgMs: 0 };
    }
    const p = agentPerf[record.agentId]!;
    p.total += 1;
    p.success += record.successRate;
    p.avgMs = (p.avgMs * (p.total - 1) + record.avgDurationMs) / p.total;
  }

  // ── Identificar agentes con bajo rendimiento ───────────────────────────────
  const lowPerformers = Object.entries(agentPerf)
    .filter(([, perf]) => perf.total >= 5 && perf.success / perf.total < 0.7)
    .map(([id]) => id);

  if (lowPerformers.length > 0) {
    log.warn(`[Evolution] Agentes con bajo rendimiento: ${lowPerformers.join(', ')}`);
    improvements.push(
      `Agentes con bajo rendimiento detectados: ${lowPerformers.join(', ')} — Revisar prompts y herramientas`,
    );
  }

  // ── Usar Claude para generar sugerencias de mejora ─────────────────────────
  const criticalAgents = Object.entries(health.agents)
    .filter(([, r]) => r.status === 'critical' || r.consecutiveFailures > 2)
    .map(
      ([id, r]) =>
        `${id}: ${r.consecutiveFailures} fallos consecutivos, error: ${r.lastError?.slice(0, 100) ?? 'desconocido'}`,
    );

  if (criticalAgents.length > 0 || lowPerformers.length > 0) {
    try {
      const analysisPrompt = `Analizá este reporte de salud del sistema FeedIA para la marca ${brand.name}.

Agentes con problemas:
${criticalAgents.join('\n') || 'Ninguno'}

Agentes con bajo rendimiento (< 70% éxito):
${lowPerformers.join(', ') || 'Ninguno'}

Generá 3 sugerencias concretas de mejora para el sistema. Respondé en JSON array:
[{"mejora": "...", "agente": "...", "impacto": "high|medium|low"}]`;

      const response = await ask(analysisPrompt, { maxTokens: 1000, fast: true });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]) as Array<{ mejora: string; agente: string; impacto: string }>;
        for (const s of suggestions) {
          state.improvements.push({ timestamp: new Date().toISOString(), description: s.mejora, applied: false });
          addLesson({
            agentId: s.agente,
            context: `Auto-análisis de performance`,
            lesson: s.mejora,
            impact: s.impacto as Lesson['impact'],
            category: 'prompt_improvement',
          });
          improvements.push(s.mejora);
        }
      }
    } catch (err) {
      log.warn(`[Evolution] No se pudo generar sugerencias IA: ${(err as Error).message}`);
    }
  }

  // ── Descubrir nuevas APIs ──────────────────────────────────────────────────
  let discoveredApis = 0;
  try {
    const { searchPublicApis } = await import('../integrations/apiDirectory.js');
    const result = await searchPublicApis('instagram social media');
    const newApis = result.entries.filter((api) => !state.discoveredApis.some((d) => d.url === api.url)).slice(0, 3);

    for (const api of newApis) {
      state.discoveredApis.push({
        name: api.name,
        url: api.url,
        category: api.category,
        addedAt: new Date().toISOString(),
      });
      discoveredApis++;
      log.info(`[Evolution] Nueva API descubierta: ${api.name}`);
    }
  } catch {
    /* API directory puede no estar disponible */
  }

  state.lastEvolvedAt = new Date().toISOString();
  state.version += 1;
  saveEvolution(state);

  log.success(
    `[Evolution] Ciclo completado v${state.version}: ${improvements.length} mejoras, ${discoveredApis} APIs nuevas`,
  );
  return {
    newLessons: improvements.length,
    improvements,
    discoveredApis,
  };
};

export const getEvolutionState = (): EvolutionState => loadEvolution();

export const getTopLessons = (limit = 10): Lesson[] =>
  loadEvolution()
    .lessons.filter((l) => l.appliedAt === null)
    .sort((a, b) => (a.impact === 'high' ? -1 : b.impact === 'high' ? 1 : 0))
    .slice(0, limit);

/**
 * Recupera lecciones aprendidas para un agente específico.
 * Se usa para inyectar contexto de auto-mejora en los prompts.
 */
export const getLessonsForAgent = (agentId: string, limit = 5): Lesson[] =>
  loadEvolution()
    .lessons.filter((l) => l.agentId === agentId || l.agentId === 'system')
    .sort((a, b) => new Date(b.appliedAt ?? b.lesson).getTime() - new Date(a.appliedAt ?? a.lesson).getTime())
    .slice(0, limit);

/**
 * Marca una lección como aplicada.
 */
export const markLessonApplied = (lessonId: string): void => {
  const state = loadEvolution();
  const lesson = state.lessons.find((l) => l.id === lessonId);
  if (lesson) {
    lesson.appliedAt = new Date().toISOString();
    saveEvolution(state);
    log.info(`[Evolution] Lección aplicada: ${lessonId}`);
  }
};
