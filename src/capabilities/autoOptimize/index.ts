export {
  extractSuccessPatterns,
  runAutoOptimization,
  type SuccessExtraction,
  type FormatPerformance,
  type TimingPattern,
  type HookPatternHit,
  type NextPieceRecommendation,
  type StrategyAdjustment,
  type AutoOptimizationResult,
} from './successPatterns.js';

export {
  recordOptimizationRun,
  listAdjustments,
  listRecommendations,
  updateAdjustmentStatus,
  updateRecommendationStatus,
  recordAdjustmentImpact,
  getLastOptimizationSummary,
  type StoredAdjustment,
  type StoredRecommendation,
} from './strategyStore.js';
