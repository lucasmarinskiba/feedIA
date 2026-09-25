/**
 * executeGrowthTactic() used to pass whatever a tactic's `steps` said
 * straight to executeWithRecovery() (real Computer Use) — some tactics
 * include real ad spend ("Boost with $20/day TikTok Spark Ads") or off-API
 * publishing/DM funnels, with no way to separate safe steps from risky ones.
 * Now it never auto-executes — plans are for manual execution only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/studio/computerUse/reliableSession.js', () => ({
  executeWithRecovery: vi.fn(),
}));

import { executeWithRecovery } from '../../../src/studio/computerUse/reliableSession.js';
import { growthHackingAgent, type GrowthExperiment } from '../../../src/studio/intelligence/growthHackingAgent.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();
const mockedExecuteWithRecovery = vi.mocked(executeWithRecovery);

beforeEach(() => {
  mockedExecuteWithRecovery.mockClear();
});

const adSpendTactic: GrowthExperiment = {
  id: 'ec-product-demo-tiktok',
  name: 'TikTok Shop Product Demo Series',
  tactic: 'One 30s product demo per product',
  platform: 'tiktok',
  expectedLift: '+direct sales',
  effort: 'low',
  timeToResults: '1-2 weeks',
  automatable: true,
  steps: ['Boost top performers with $20/day TikTok Spark Ads'],
};

describe('executeGrowthTactic: nunca auto-ejecuta, incluso si automatable=true', () => {
  it('una táctica marcada automatable (con gasto de ads en sus steps) nunca toca Computer Use', async () => {
    const result = await growthHackingAgent.executeGrowthTactic(adSpendTactic, {} as never, brand);
    expect(result.status).toBe('partial');
    expect(result.actionsCompleted[0]).toMatch(/manual execution required/i);
    expect(mockedExecuteWithRecovery).not.toHaveBeenCalled();
  });
});
