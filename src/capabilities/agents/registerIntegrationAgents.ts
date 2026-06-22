import { registerAgent } from '../../agent/registry.js';
import { INTEGRATION_AGENTS } from './integrationAgents.js';

/**
 * Register the 6 integration-specialized agents into the orchestration registry.
 * These agents manage video production, A/B testing, market intelligence,
 * email campaigns, analytics, and multi-account management.
 */
export const registerIntegrationAgents = (): void => {
  for (const agent of INTEGRATION_AGENTS) {
    registerAgent(agent);
  }
};
