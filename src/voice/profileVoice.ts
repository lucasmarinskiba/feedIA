/**
 * Voice Profile & Grid — Fase 22
 * Profile audit, highlights, bio, grid planning
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const response = (esMsg: string, enMsg: string): string => {
  const brand = loadBrandProfile();
  const locale = brand.audience.locale ?? 'es-AR';
  return locale.startsWith('es') ? esMsg : enMsg;
};

/* ── Profile Audit ───────────────────────────────────────────────────────── */

export const auditProfile = async (): Promise<VoiceActionResult> => {
  const actionType = 'profile.audit';
  log.info('[profileVoice] auditProfile');
  try {
    const brand = loadBrandProfile();
    const { auditProfile: audit } = await import('../capabilities/growth/profileAudit.js');
    const result = await audit(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Audit completado. Score general: ${result.overallScore}/100. Prioridad: ${result.topPriority}. Quick wins: ${result.quickWins.slice(0, 2).join(', ')}.`,
        `Audit complete. Overall score: ${result.overallScore}/100. Priority: ${result.topPriority}. Quick wins: ${result.quickWins.slice(0, 2).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: result,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error auditando perfil.', 'Error auditing profile.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Highlight Strategy ──────────────────────────────────────────────────── */

export const generateHighlightStrategy = async (): Promise<VoiceActionResult> => {
  const actionType = 'profile.highlights';
  log.info('[profileVoice] generateHighlightStrategy');
  try {
    const brand = loadBrandProfile();
    const { generateHighlightStrategy: gen } = await import('../capabilities/growth/highlightStrategy.js');
    const highlights = await gen(brand);
    const mustHaves = highlights
      .filter((h) => h.priority === 'must_have')
      .map((h) => `${h.emoji} ${h.name}`)
      .join(', ');
    return {
      ok: true,
      spokenResponse: response(
        `Estrategia de highlights lista. Must-haves: ${mustHaves}. Total: ${highlights.length} highlights recomendados.`,
        `Highlight strategy ready. Must-haves: ${mustHaves}. Total: ${highlights.length} recommended highlights.`,
      ),
      actionType,
      executed: true,
      detail: highlights,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando highlights.', 'Error generating highlights.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Bio Optimizer ───────────────────────────────────────────────────────── */

export const optimizeBio = async (goal?: 'followers' | 'leads' | 'sales' | 'authority'): Promise<VoiceActionResult> => {
  const actionType = 'profile.bio';
  log.info(`[profileVoice] optimizeBio for ${goal ?? 'general'}`);
  try {
    const brand = loadBrandProfile();
    if (goal) {
      const { optimizeBioForConversion: opt } = await import('../capabilities/growth/bioOptimizer.js');
      const result = await opt(brand, goal);
      return {
        ok: true,
        spokenResponse: response(
          `Bio optimizada para ${goal}: "${result.text}". Estilo: ${result.style}.`,
          `Bio optimized for ${goal}: "${result.text}". Style: ${result.style}.`,
        ),
        actionType,
        executed: true,
        detail: result,
      };
    }
    const { generateBioVariants: gen } = await import('../capabilities/growth/bioOptimizer.js');
    const variants = await gen(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Generé ${variants.length} variantes de bio. La primera: "${variants[0]?.text ?? ''}".`,
        `Generated ${variants.length} bio variants. First one: "${variants[0]?.text ?? ''}".`,
      ),
      actionType,
      executed: true,
      detail: variants,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error optimizando bio.', 'Error optimizing bio.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Grid Planner ────────────────────────────────────────────────────────── */

export const planGrid = async (postCount?: number): Promise<VoiceActionResult> => {
  const actionType = 'profile.grid';
  log.info('[profileVoice] planGrid');
  try {
    const brand = loadBrandProfile();
    const { planGrid: plan } = await import('../capabilities/growth/gridPlanner.js');
    const grid = await plan(brand, postCount ?? 9);
    const purposes = grid.posts.reduce(
      (acc, p) => {
        acc[p.purpose] = (acc[p.purpose] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      ok: true,
      spokenResponse: response(
        `Grid planificado: ${grid.posts.length} posts. Distribución: ${Object.entries(purposes)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}.`,
        `Grid planned: ${grid.posts.length} posts. Distribution: ${Object.entries(purposes)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: grid,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error planificando grid.', 'Error planning grid.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const getScrollStopHooks = async (): Promise<VoiceActionResult> => {
  const actionType = 'profile.hooks';
  log.info('[profileVoice] getScrollStopHooks');
  try {
    const brand = loadBrandProfile();
    const { suggestScrollStopHooks: suggest } = await import('../capabilities/growth/gridPlanner.js');
    const hooks = await suggest(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${hooks.length} hooks generados para parar el scroll. Ejemplo: "${hooks[0] ?? ''}"`,
        `${hooks.length} scroll-stop hooks generated. Example: "${hooks[0] ?? ''}"`,
      ),
      actionType,
      executed: true,
      detail: hooks,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando hooks.', 'Error generating hooks.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
