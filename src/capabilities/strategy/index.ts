/**
 * Content Strategy Engine — API pública.
 */

export { planNextContent } from './contentStrategyEngine.js';
export type {
  StrategyEngineOptions,
} from './contentStrategyEngine.js';

export { scoreOpportunity } from './opportunityScorer.js';
export type { OpportunityInput, OpportunityScore } from './opportunityScorer.js';

export { analyzeNicho, reposicionar } from './legacyStubs.js';
export type { NichoAnalysis, ReposicionResult } from './legacyStubs.js';

export { gatherPerformanceSignals } from './inputs/performanceSignals.js';
export type { PerformanceSignals } from './inputs/performanceSignals.js';

export { gatherTrendSignals } from './inputs/trendSignals.js';
export type { TrendSignals } from './inputs/trendSignals.js';

export { gatherCompetitorSignals } from './inputs/competitorSignals.js';
export type { CompetitorSignals } from './inputs/competitorSignals.js';

export { gatherGoalSignals } from './inputs/goalSignals.js';
export type { GoalSignals, BrandGoal } from './inputs/goalSignals.js';

export type { StrategicBrief, ContentPlan, ContentPillar } from './output/strategicBrief.js';
