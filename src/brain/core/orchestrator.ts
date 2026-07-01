/**
 * Brain Orchestrator — El director de orquesta del Cerebro FeedIA
 * Cada decisión pasa por TODAS las capas del cerebro:
 *   1. Sensores escuchan
 *   2. Memoria recuerda
 *   3. Razonamiento evalúa
 *   4. Actuadores ejecutan
 *   5. Feedback loop cierra el ciclo
 *
 * Este es el "cerebro consciente" que decide qué hacer cada hora.
 */

import { log } from '../../agent/logger.js';
import * as cortex from './cortex.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as viral from '../reasoning/viralScoring.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as community from '../community/communityManager.js';
import * as humanResponse from '../community/humanResponse.js';
import * as stalker from '../community/stalkerTracker.js';
import * as profileOpt from '../aesthetic/profileOptimizer.js';
import * as aesthetic from '../aesthetic/aestheticEngine.js';
import * as niche from '../growth/nicheMastery.js';
import * as trendSync from '../growth/trendSync.js';
import * as partnership from '../growth/partnershipEngine.js';

export interface OrchestratorDecision {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string[];
  context: {
    memory: string;
    viralScore?: number;
    communityHealth?: number;
    trendUrgency?: string;
    partnerOpportunities?: number;
  };
  execute: () => Promise<unknown>;
}

export const think = async (brand: {
  name: string;
  niche: string;
  handle: string;
  tone: string[];
}): Promise<OrchestratorDecision[]> => {
  const decisions: OrchestratorDecision[] = [];
  const reasoning: string[] = [];

  // 1. Check community health
  const cmStats = community.getStats();
  if (cmStats.health < 0.4) {
    decisions.push({
      action: 'community-rescue',
      priority: 'critical',
      reasoning: ['Salud de comunidad baja', `${cmStats.totalMembers} miembros, engagement degradado`],
      context: { memory: '', communityHealth: cmStats.health },
      execute: async () => {
        community.auditCommunity();
        const priority = community.getEngagementPriority(5);
        for (const member of priority) {
          await humanResponse.craftHumanResponse({
            handle: member.handle,
            message: 're-engagement',
            platform: 'instagram',
            type: 'dm',
            brandNiche: brand.niche,
            brandTone: brand.voice?.tone,
          });
        }
      },
    });
  }

  // 2. Check trends
  const trends = trendSync.getTrendsForNiche(brand.niche, 0.5);
  const urgentTrends = trends.filter((t) => t.velocity === 'accelerating' || t.velocity === 'peak');
  if (urgentTrends.length > 0) {
    decisions.push({
      action: 'trend-ride',
      priority: 'high',
      reasoning: urgentTrends.map((t) => `Tendencia urgente: ${t.topic} [${t.velocity}]`),
      context: { memory: '', trendUrgency: urgentTrends[0]?.topic },
      execute: async () => {
        for (const t of urgentTrends.slice(0, 2)) {
          await trendSync.adaptTrend(t.id, brand.niche, brand.voice?.tone);
        }
      },
    });
  }

  // 3. Check profile health
  const lastAudit = profileOpt.getLastAudit(brand.handle);
  const daysSinceAudit = lastAudit ? (Date.now() - new Date(lastAudit.auditedAt).getTime()) / (24 * 3600_000) : 999;
  if (daysSinceAudit > 30) {
    decisions.push({
      action: 'profile-refresh',
      priority: 'medium',
      reasoning: ['Perfil sin auditar hace +30 días', 'La primera impresión cuenta'],
      context: { memory: '' },
      execute: async () => {
        await profileOpt.auditProfile(brand.handle, '', [], [], brand.niche);
      },
    });
  }

  // 4. Check partnership opportunities
  const partners = partnership.getTopCandidates(3, 0.6);
  if (partners.length > 0) {
    decisions.push({
      action: 'partner-outreach',
      priority: 'medium',
      reasoning: [`${partners.length} socios potenciales con score >60%`],
      context: { memory: '', partnerOpportunities: partners.length },
      execute: async () => {
        for (const p of partners.slice(0, 2)) {
          const msg = partnership.generateOutreach(p.handle, brand.name, brand.niche, 'collab');
          log.info(`[Orchestrator] Outreach ready for @${p.handle}: ${msg.slice(0, 60)}...`);
        }
      },
    });
  }

  // 5. Check if content prediction suggests new post
  const nicheProfile = niche.getNiche(brand.niche);
  const opportunities = niche.getOpportunities(brand.niche);
  if (opportunities.seasonal.length > 0) {
    decisions.push({
      action: 'seasonal-content',
      priority: 'high',
      reasoning: [`Oportunidad estacional: ${opportunities.seasonal[0]}`],
      context: { memory: '' },
      execute: async () => {
        await cortex.ingest({
          type: 'insight',
          content: `Oportunidad estacional detectada: ${opportunities.seasonal[0]}`,
          importance: 0.8,
        });
      },
    });
  }

  // 6. Check aesthetic cohesion
  const aestheticIdentity = aesthetic.getIdentity(brand.name);
  if (!aestheticIdentity) {
    decisions.push({
      action: 'define-aesthetic',
      priority: 'low',
      reasoning: ['Sin identidad visual definida', 'La cohesión visual aumenta el reconocimiento de marca'],
      context: { memory: '' },
      execute: async () => {
        aesthetic.defineIdentity({
          brandName: brand.name,
          primaryColors: ['#E1306C', '#F77737'],
          secondaryColors: ['#FCAF45', '#833AB4'],
          fonts: ['Inter', 'Playfair Display'],
          mood: 'vibrant',
          photoStyle: 'natural',
          gridPattern: 'random',
          storyTemplates: ['quote', 'poll', 'behind'],
          highlightCovers: ['Sobre mí', 'Servicios', 'FAQ'],
        });
      },
    });
  }

  // 7. Stalker intelligence - VIP re-engagement
  const superfans = stalker.getAllByType('superfan');
  if (superfans.length > 0) {
    decisions.push({
      action: 'vip-love',
      priority: 'medium',
      reasoning: [
        `${superfans.length} superfans detectados`,
        'Mantener a los fans felices es más barato que conseguir nuevos',
      ],
      context: { memory: '' },
      execute: async () => {
        for (const fan of superfans.slice(0, 3)) {
          await cortex.ingest({
            type: 'feedback',
            content: `Superfan @${fan.handle} merece atención especial`,
            importance: 0.9,
            entity: fan.handle,
          });
        }
      },
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  decisions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  log.info(
    `[Orchestrator] ${decisions.length} decisions for ${brand.name}: ${decisions.map((d) => `${d.action}(${d.priority})`).join(', ')}`,
  );
  return decisions;
};

// ── Execute top decisions ──────────────────────────────────────────────────

export const executeTop = async (
  brand: { name: string; niche: string; handle: string; tone: string[] },
  limit = 3,
): Promise<unknown[]> => {
  const decisions = await think(brand);
  const top = decisions.slice(0, limit);
  const results: unknown[] = [];

  for (const d of top) {
    try {
      const result = await d.execute();
      results.push({ action: d.action, ok: true, result });
      episodic.recordEpisode('orchestrator-executed', d.action, {
        tags: ['orchestrator', d.priority],
        emotion: 'positive',
      });
    } catch (err) {
      results.push({ action: d.action, ok: false, error: (err as Error).message });
      episodic.recordEpisode('orchestrator-failed', d.action, {
        tags: ['orchestrator', d.priority],
        emotion: 'negative',
      });
    }
  }

  return results;
};
