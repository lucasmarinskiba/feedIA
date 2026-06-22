import { registerAgent } from '../../agent/registry.js';
import { ALL_NICHE_AGENTS } from './nicheMatrix.js';

/**
 * Register all 100 niche-specialized agents into the orchestration registry.
 * These agents combine 10 business verticals × 10 functional roles,
 * each with deep domain knowledge of their specific niche.
 */
export const registerNicheAgents = (): void => {
  for (const agent of ALL_NICHE_AGENTS) {
    registerAgent(agent);
  }
};
