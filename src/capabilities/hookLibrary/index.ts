export {
  HOOK_PATTERNS,
  getPatternsByCategory,
  getPatternsByFormat,
  getPatternsByTrigger,
  getPatternById,
  listCategories,
  listTriggers,
  type HookPattern,
  type HookFormat,
  type HookCategory,
  type PsychTrigger,
} from './patterns.js';

export { scoreHook, rankHooks, type HookScoreBreakdown } from './scorer.js';

export {
  matchAndGenerateHooks,
  findMatchingPatterns,
  type HookMatchResult,
  type HookMatchOptions,
  type MatchedPattern,
  type InstantiatedHook,
} from './matcher.js';
