import { registerAgent } from '../../agent/registry.js';
import { BRAND_AGENTS } from './brandAgents.js';

/**
 * Register the 10 brand-specialized agents into the orchestration registry.
 * These agents manage brand kit, highlights, logos, avatars, bio, watermarks,
 * voice consistency, feed planning, content auditing, and brand orchestration.
 */
export const registerBrandAgents = (): void => {
  for (const agent of BRAND_AGENTS) {
    registerAgent(agent);
  }
};
