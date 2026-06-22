import { registerAgent } from '../../agent/registry.js';
import { STRATEGIC_BRAND_AGENTS } from './strategicBrandAgents.js';

/**
 * Register the 15 strategic brand agents into the orchestration registry.
 */
export const registerStrategicBrandAgents = (): void => {
  for (const agent of STRATEGIC_BRAND_AGENTS) {
    registerAgent(agent);
  }
};
