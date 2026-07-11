/**
 * Service Orchestrator
 *
 * Central intelligence that routes requests to optimal service chain.
 * Analyzes: content type, account tier, time budget, cost constraints.
 * Decides: which agents, which models, which quality gates.
 * Executes with automatic fallbacks.
 * Returns: result + metadata (provider used, cost estimate, quality score).
 */

import { log } from '../agent/logger.js';
import { routeImageGen, routeVideoGen } from './provider-router.js';
import { qualityValidator } from './quality-validator.js';
import type { BrandProfile } from '../config/types.js';

export type ContentType = 'image' | 'video' | 'carousel';
export type QualityLevel = 'draft' | 'good' | 'excellent';
export type AccountTier = 'free' | 'pro' | 'enterprise';

export interface OrchestratorRequest {
  basePrompt: string;
  contentType: ContentType;
  platform: 'instagram' | 'tiktok';
  accountTier: AccountTier;
  qualityLevel?: QualityLevel;
  maxCostEstimate?: number;
  maxDurationMs?: number;
  userHandle?: string;
  brandProfile?: BrandProfile;
}

export interface OrchestratorResult {
  ok: boolean;
  url?: string;
  urls?: string[];
  qualityScore: number;
  costEstimate: number;
  providerUsed: string;
  durationMs: number;
  fallbacksApplied: string[];
  error?: string;
}

const analyzeRequest = (req: OrchestratorRequest): {
  targetQuality: QualityLevel;
  priorityChain: string[];
  expectedCost: number;
  expectedDuration: number;
} => {
  const qualityLevel = req.qualityLevel ?? 'good';
  const tier = req.accountTier;

  const qualityTiers: Record<QualityLevel, string[]> = {
    draft: ['replicate:flux-schnell', 'openai:gpt4v'],
    good: ['higgsfield:flux-1-schnell', 'replicate:flux-pro', 'openai:dall-e-3'],
    excellent: ['higgsfield:flux-1-dev', 'replicate:flux-ultimate', 'openai:dall-e-3-hd'],
  };

  const tierBudgets: Record<AccountTier, number> = {
    free: 0.05,
    pro: 0.2,
    enterprise: 1.0,
  };

  const durationEstimates: Record<string, number> = {
    'flux-schnell': 3000,
    'flux-pro': 8000,
    'flux-dev': 20000,
    'gpt4v': 5000,
    'dall-e': 10000,
  };

  const providers = qualityTiers[qualityLevel] || qualityTiers.good;
  const budget = tierBudgets[tier];
  const avgDuration = providers.length > 0 ? durationEstimates[providers[0]!.split(':')[1]!] ?? 5000 : 5000;

  return {
    targetQuality: qualityLevel,
    priorityChain: providers,
    expectedCost: budget,
    expectedDuration: avgDuration,
  };
};

export const orchestrateContentGeneration = async (req: OrchestratorRequest): Promise<OrchestratorResult> => {
  const startTime = Date.now();
  const fallbacksApplied: string[] = [];

  log.info('[Orchestrator] Request received', {
    contentType: req.contentType,
    quality: req.qualityLevel ?? 'good',
    tier: req.accountTier,
  });

  const plan = analyzeRequest(req);

  // Budget check
  if (req.maxCostEstimate && plan.expectedCost > req.maxCostEstimate) {
    log.warn('[Orchestrator] Budget exceeded', { expected: plan.expectedCost, max: req.maxCostEstimate });
    plan.targetQuality = 'draft';
  }

  // Time check
  if (req.maxDurationMs && plan.expectedDuration > req.maxDurationMs) {
    log.warn('[Orchestrator] Duration exceeds budget');
    plan.priorityChain = plan.priorityChain.slice(0, 1);
  }

  // Execute with fallbacks
  let lastError: string | undefined;
  for (const provider of plan.priorityChain) {
    try {
      log.info('[Orchestrator] Trying provider', { provider, quality: plan.targetQuality });

      let result;
      if (req.contentType === 'image' || req.contentType === 'carousel') {
        result = await routeImageGen({
          prompt: req.basePrompt,
          contentType:
            req.contentType === 'carousel'
              ? 'carousel-frame'
              : req.platform === 'tiktok'
                ? 'tiktok-photo'
                : 'post-image',
          userHandle: req.userHandle,
          style: plan.targetQuality === 'draft' ? 'minimal' : plan.targetQuality === 'excellent' ? 'detailed' : 'balanced',
        });
      } else {
        result = await routeVideoGen({
          prompt: req.basePrompt,
          contentType: 'reel-video',
          userHandle: req.userHandle,
        });
      }

      if (result.ok && (result.url || result.urls)) {
        // Quality validation if excellent
        if (plan.targetQuality === 'excellent' && req.contentType === 'image') {
          const validation = await qualityValidator.validatePrompt(req.basePrompt);
          if (!validation.passed) {
            log.warn('[Orchestrator] Quality validation failed', { provider, score: validation.score });
            fallbacksApplied.push(`${provider}-quality-failed`);
            continue;
          }
        }

        const durationMs = Date.now() - startTime;
        log.info('[Orchestrator] Success', { provider, durationMs });

        return {
          ok: true,
          url: result.url,
          urls: result.urls,
          qualityScore: plan.targetQuality === 'draft' ? 60 : plan.targetQuality === 'excellent' ? 90 : 75,
          costEstimate: plan.expectedCost,
          providerUsed: result.provider,
          durationMs,
          fallbacksApplied,
        };
      }

      fallbacksApplied.push(`${provider}-failed`);
      lastError = result.error;
    } catch (err) {
      fallbacksApplied.push(`${provider}-error`);
      lastError = String(err);
      log.warn('[Orchestrator] Provider error', { provider, error: lastError });
    }
  }

  const durationMs = Date.now() - startTime;
  log.error('[Orchestrator] All providers exhausted', { fallbacks: fallbacksApplied });

  return {
    ok: false,
    qualityScore: 0,
    costEstimate: 0,
    providerUsed: 'none',
    durationMs,
    fallbacksApplied,
    error: `All providers failed. Last error: ${lastError}`,
  };
};

export const orchestrateBatch = async (requests: OrchestratorRequest[]): Promise<OrchestratorResult[]> => {
  log.info('[Orchestrator] Batch request', { count: requests.length });

  const results: OrchestratorResult[] = [];
  for (const req of requests) {
    const result = await orchestrateContentGeneration(req);
    results.push(result);
  }

  return results;
};
