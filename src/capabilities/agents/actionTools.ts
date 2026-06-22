/**
 * actionTools.ts
 *
 * Capa de enriquecimiento de datos reales para acciones de agentes.
 * Cada (agentId, actionId) tiene un fetcher que consulta el estado
 * real del sistema ANTES de llamar al LLM, inyectando datos concretos
 * como contexto para que las respuestas sean 100% grounded.
 *
 * Regla: solo funciones puras / de lectura de estado. Nunca chainar LLMs.
 */

import type { BrandProfile } from '../../config/types.js';
import { getCrisisState, isPausado } from '../crisis/index.js';
import { listarBacklog, loadSources } from '../curator/index.js';
import { listarPorEstado as listarUgc } from '../ugc/index.js';
import { listarExperimentos } from '../experiments/index.js';
import { listByStatus as listProspects } from '../collab/index.js';
import { listarSecuencias, listarEnrollments } from '../nurture/index.js';
import { listAssets } from '../brandkit/index.js';
import { ensureBrandStrategy, formatBrandStrategyContext } from '../branding/index.js';
import { listCheckpoints } from '../../agent/checkpoints.js';
import { scoreAesthetic, type DesignProposal } from '../aesthetic/index.js';
import { topPerformers } from '../../agent/memory.js';
import { recentRuns } from '../../scheduler/index.js';

export type ActionContext = Record<string, unknown>;

type DataFetcher = (brand: BrandProfile, params: Record<string, string>) => Promise<ActionContext>;

// ── helpers ─────────────────────────────────────────────────────────────────

const liveSystemState = (brand: BrandProfile): ActionContext => {
  const crisis = getCrisisState();
  return {
    crisis: {
      pausado: isPausado(),
      postsEnObservacion: crisis.postsEnObservacion?.length ?? 0,
      alertasEnviadas: crisis.alertasEnviadas ?? 0,
    },
    pendingCheckpoints: listCheckpoints('pending').length,
    topPerformers: topPerformers(3).map((p) => ({
      format: p.format,
      hook: p.hookFirstLine,
      saves: p.metrics.saves,
      shares: p.metrics.shares,
    })),
    brandNicho: brand.niche,
  };
};

const buildAestheticSnapshot = (brand: BrandProfile, caption = ''): ActionContext => {
  const proposal: DesignProposal = {
    title: 'Evaluación contextual',
    format: 'post-imagen',
    colorsUsed: brand.visual.palette.slice(0, 3),
    fontsUsed: brand.visual.typography,
    textBlocks: 2,
    imageBlocks: 1,
    densityEstimate: brand.visual.density ?? 'medium',
    description: caption || `${brand.visual.style}, ${brand.visual.mood ?? 'profesional'}`,
  };
  return { aestheticScore: scoreAesthetic(brand, proposal) };
};

// ── registry ─────────────────────────────────────────────────────────────────

const FETCHERS: Record<string, Record<string, DataFetcher>> = {
  // ── algorithm ─────────────────────────────────────────────────────────────
  algorithm: {
    timing: async (brand, params) => ({
      ...liveSystemState(brand),
      formato: params['format'],
      objetivo: params['goal'],
      audiencia: brand.audience,
      recentRuns: recentRuns(5).map((r) => ({ name: r.name, ok: r.ok, durationMs: r.durationMs })),
    }),
    shadowban: async (brand) => {
      const crisis = getCrisisState();
      return {
        publicacionesPausadas: crisis.publicacionesPausadas,
        postsEnObservacion: crisis.postsEnObservacion ?? [],
        alertasEnviadas: crisis.alertasEnviadas,
        checkpointsPendientes: listCheckpoints('pending').length,
        nicho: brand.niche,
        fuentesCurador: loadSources()
          .slice(0, 5)
          .map((s) => ({ nombre: s.nombre, tipo: s.tipo, activo: s.activo })),
      };
    },
    'explore-strategy': async (brand) => ({
      ...liveSystemState(brand),
      audiencia: brand.audience,
      visual: { style: brand.visual.style, palette: brand.visual.palette },
      topPerformers: topPerformers(5),
    }),
    'content-score': async (brand, params) => ({
      ...buildAestheticSnapshot(brand, params['caption']),
      nicho: brand.niche,
      formato: params['format'],
      caption: params['caption'],
      prohibiciones: brand.voice.forbidden,
    }),
    'reach-boost': async (brand) => ({
      ...liveSystemState(brand),
      backlog: listarBacklog(undefined)
        .slice(0, 6)
        .map((i) => ({
          resumen: i.resumen,
          status: i.status,
          formatosSugeridos: i.formatosSugeridos,
        })),
      audiencia: brand.audience,
    }),
  },

  // ── meta-ads ──────────────────────────────────────────────────────────────
  'meta-ads': {
    'campaign-structure': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      goals: brand.goals,
      topPerformers: topPerformers(3),
    }),
    'audience-research': async (brand) => ({
      audiencia: brand.audience,
      nicho: brand.niche,
      prospectos: listProspects()
        .slice(0, 5)
        .map((p) => ({
          handle: p.handle,
          nicho: p.nicho,
          followersAprox: p.followersAprox,
          alineacion: p.alineacion,
        })),
    }),
    'creative-testing': async (brand) => ({
      experimentos: listarExperimentos().map((e) => ({
        id: e.id,
        hipotesis: e.hipotesis,
        estado: e.status,
        metrica: e.metricaPrimaria,
      })),
      topPerformers: topPerformers(3),
      nicho: brand.niche,
    }),
    'roas-optimization': async (brand) => ({
      nicho: brand.niche,
      goals: brand.goals,
      topPerformers: topPerformers(5),
      pausado: isPausado(),
    }),
    'retargeting-funnel': async () => ({
      enrollments: listarEnrollments()
        .slice(0, 8)
        .map((e) => ({
          sequenceId: e.sequenceId,
          pasoActual: e.pasoActual,
          status: e.status,
        })),
      secuencias: listarSecuencias().map((s) => ({
        nombre: s.nombre,
        trigger: s.trigger,
        pasos: s.pasos.length,
      })),
    }),
  },

  // ── humor ────────────────────────────────────────────────────────────────
  humor: {
    'meme-formula': async (brand) => ({
      nicho: brand.niche,
      tono: brand.voice.tone,
      prohibiciones: brand.voice.forbidden,
      audiencia: brand.audience,
      topPerformers: topPerformers(3),
    }),
    'trending-audio': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      visual: { style: brand.visual.style, mood: brand.visual.mood },
    }),
    'humor-hooks': async (brand, params) => ({
      nicho: brand.niche,
      idea: params['idea'],
      tono: brand.voice.tone,
    }),
    'comment-comedy': async (brand) => ({
      nicho: brand.niche,
      tono: brand.voice.tone,
      audiencia: brand.audience,
    }),
  },

  // ── sales ────────────────────────────────────────────────────────────────
  sales: {
    'story-selling': async (brand) => ({
      checkpointsPendientes: listCheckpoints('pending').length,
      nicho: brand.niche,
      goals: brand.goals,
      audiencia: brand.audience,
    }),
    'dm-funnel': async (brand) => ({
      enrollments: listarEnrollments()
        .slice(0, 8)
        .map((e) => ({
          sequenceId: e.sequenceId,
          pasoActual: e.pasoActual,
          status: e.status,
        })),
      secuencias: listarSecuencias().map((s) => ({ nombre: s.nombre, pasos: s.pasos.length })),
      nicho: brand.niche,
    }),
    'social-proof': async (brand) => ({
      topPerformers: topPerformers(5),
      nicho: brand.niche,
      audiencia: brand.audience,
    }),
    'launch-plan': async (brand) => ({
      experimentos: listarExperimentos()
        .slice(0, 5)
        .map((e) => ({
          hipotesis: e.hipotesis,
          estado: e.status,
        })),
      nicho: brand.niche,
      goals: brand.goals,
      checkpointsPendientes: listCheckpoints('pending').length,
    }),
    'objection-handler': async (brand) => ({
      nicho: brand.niche,
      audiencia: { dolores: brand.audience.pains, deseos: brand.audience.desires },
      tono: brand.voice.tone,
    }),
  },

  // ── community ────────────────────────────────────────────────────────────
  community: {
    'engagement-loop': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      topPerformers: topPerformers(3),
    }),
    'comment-templates': async (brand) => ({
      nicho: brand.niche,
      tono: brand.voice.tone,
      prohibiciones: brand.voice.forbidden,
    }),
    'live-strategy': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      goals: brand.goals,
    }),
    'ugc-campaign': async () => ({
      ugcPendientes: listarUgc('no-solicitado').length,
      ugcAprobados: listarUgc('aprobado').length,
      ugcRecientes: listarUgc('no-solicitado')
        .slice(0, 5)
        .map((u) => ({
          autor: u.autor,
          decisionVale: u.decision.vale,
          prioridad: u.decision.prioridad,
          riesgoLegal: u.decision.riesgoLegal,
        })),
    }),
    'community-sprint': async (brand) => ({
      prospectos: listProspects()
        .slice(0, 5)
        .map((p) => ({
          handle: p.handle,
          followersAprox: p.followersAprox,
          nicho: p.nicho,
        })),
      nicho: brand.niche,
      ugcPendientes: listarUgc('no-solicitado').length,
    }),
  },

  // ── trends ───────────────────────────────────────────────────────────────
  trends: {
    'trend-scout': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      backlog: listarBacklog(undefined)
        .slice(0, 5)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
        })),
    }),
    'audio-strategy': async (brand) => ({
      nicho: brand.niche,
      visual: { style: brand.visual.style, mood: brand.visual.mood },
      audiencia: brand.audience,
    }),
    'challenge-plan': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      ugcAprobados: listarUgc('aprobado').length,
    }),
    'trend-calendar': async (brand) => ({
      nicho: brand.niche,
      backlog: listarBacklog(undefined)
        .slice(0, 10)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
          status: i.status,
        })),
    }),
  },

  // ── storyteller ──────────────────────────────────────────────────────────
  storyteller: {
    'origin-story': async (brand) => ({
      brand: {
        name: brand.name,
        niche: brand.niche,
        voice: brand.voice,
      },
    }),
    'narrative-arc': async (brand) => ({
      nicho: brand.niche,
      backlog: listarBacklog(undefined)
        .slice(0, 6)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
        })),
      topPerformers: topPerformers(3),
    }),
    'behind-scenes': async (brand) => ({
      nicho: brand.niche,
      visual: brand.visual,
      voice: brand.voice,
      assets: listAssets(brand.name).slice(0, 5),
    }),
    'bts-structure': async (brand) => ({
      brand: { name: brand.name, niche: brand.niche, visual: brand.visual },
    }),
    'founder-arc': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      voice: brand.voice,
    }),
  },

  // ── viral ────────────────────────────────────────────────────────────────
  viral: {
    'viral-formula': async (brand, params) => ({
      nicho: brand.niche,
      idea: params['idea'],
      formato: params['format'],
      audiencia: brand.audience,
      topPerformers: topPerformers(5),
    }),
    'emotion-map': async (brand) => ({
      nicho: brand.niche,
      audiencia: { dolores: brand.audience.pains, deseos: brand.audience.desires },
      voice: brand.voice,
    }),
    'power-hooks': async (brand, params) => ({
      nicho: brand.niche,
      style: params['style'],
      topPerformers: topPerformers(5),
    }),
    'share-audit': async (brand, params) => ({
      ...buildAestheticSnapshot(brand, params['content']),
      nicho: brand.niche,
      content: params['content'],
      audiencia: brand.audience,
    }),
    'contrarian-take': async (brand, params) => ({
      nicho: brand.niche,
      topic: params['topic'],
      audiencia: brand.audience,
      tono: brand.voice.tone,
    }),
  },

  // ── growth ───────────────────────────────────────────────────────────────
  growth: {
    'growth-sprint': async (brand, params) => ({
      ...liveSystemState(brand),
      currentFollowers: params['currentFollowers'],
      targetFollowers: params['targetFollowers'],
      timeframe: params['timeframe'],
      audiencia: brand.audience,
      backlog: listarBacklog(undefined)
        .slice(0, 5)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
        })),
      prospectos: listProspects()
        .slice(0, 3)
        .map((p) => ({
          handle: p.handle,
          followersAprox: p.followersAprox,
          nicho: p.nicho,
        })),
    }),
    'hashtag-domination': async (brand) => ({
      nicho: brand.niche,
      audiencia: brand.audience,
      hashtagPools: brand.hashtagPools,
      topPerformers: topPerformers(3),
    }),
    'account-audit': async (brand) => ({
      ...liveSystemState(brand),
      assets: listAssets(brand.name).slice(0, 10),
      checkpointsPendientes: listCheckpoints('pending').map((c) => ({
        type: c.type,
        description: c.description,
        createdAt: c.createdAt,
      })),
      checkpointsRechazados: listCheckpoints('rejected').length,
      recentRuns: recentRuns(10).map((r) => ({ name: r.name, ok: r.ok })),
      ugcPendientes: listarUgc('no-solicitado').length,
      backlogTotal: listarBacklog(undefined).length,
    }),
    'collab-plan': async (brand) => ({
      prospectos: listProspects().map((p) => ({
        handle: p.handle,
        followersAprox: p.followersAprox,
        nicho: p.nicho,
        alineacion: p.alineacion,
        status: p.status,
        formatoColabSugerido: p.formatoColabSugerido,
      })),
      nicho: brand.niche,
    }),
    'bio-optimizer': async (brand) => ({
      brand: {
        name: brand.name,
        niche: brand.niche,
        audiencia: brand.audience,
        goals: brand.goals,
        voice: brand.voice,
      },
      topPerformers: topPerformers(3),
    }),
  },

  // ── strategist ───────────────────────────────────────────────────────────
  strategist: {
    'content-calendar': async (brand) => ({
      nicho: brand.niche,
      backlog: listarBacklog(undefined)
        .slice(0, 10)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
          status: i.status,
          scoreRelevancia: i.scoreRelevancia,
        })),
      experimentos: listarExperimentos()
        .slice(0, 3)
        .map((e) => ({
          hipotesis: e.hipotesis,
          estado: e.status,
        })),
      audiencia: brand.audience,
    }),
    'pillar-analysis': async (brand) => {
      const strategy = ensureBrandStrategy(brand.name);
      return {
        strategyContext: formatBrandStrategyContext(strategy),
        nicho: brand.niche,
        audiencia: brand.audience,
        goals: brand.goals,
        topPerformers: topPerformers(5),
      };
    },
    'format-mix': async (brand) => ({
      backlog: listarBacklog(undefined).map((i) => ({
        formatos: i.formatosSugeridos,
        status: i.status,
      })),
      nicho: brand.niche,
      topPerformers: topPerformers(5),
    }),
    'evergreen-plan': async (brand) => ({
      backlogUsado: listarBacklog('usado')
        .slice(0, 10)
        .map((i) => ({
          resumen: i.resumen,
          formatosSugeridos: i.formatosSugeridos,
          ideasDerivadas: i.ideasDerivadas,
        })),
      nicho: brand.niche,
      audiencia: brand.audience,
    }),
    'brand-voice-guide': async (brand) => {
      const strategy = ensureBrandStrategy(brand.name);
      return {
        strategyContext: formatBrandStrategyContext(strategy),
        voice: brand.voice,
        nicho: brand.niche,
        prohibiciones: brand.voice.forbidden,
        frases: brand.voice.referenceQuotes,
      };
    },
  },
};

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Obtiene datos reales del sistema para una acción de agente.
 * Devuelve objeto vacío si no hay fetcher registrado.
 */
export const fetchActionContext = async (
  agentId: string,
  actionId: string,
  brand: BrandProfile,
  params: Record<string, string>,
): Promise<ActionContext> => {
  const fetcher = FETCHERS[agentId]?.[actionId];
  if (!fetcher) return {};
  try {
    return await fetcher(brand, params);
  } catch {
    // No bloquear la acción si el fetcher falla
    return {};
  }
};

/**
 * Serializa el contexto de acción en un bloque de texto para el LLM.
 */
export const formatActionContext = (ctx: ActionContext): string => {
  if (!Object.keys(ctx).length) return '';
  return `\n\nDATOS REALES DEL SISTEMA (usá estos datos concretos en tu respuesta):\n${JSON.stringify(ctx, null, 2)}`;
};
