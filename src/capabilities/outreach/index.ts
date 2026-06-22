export {
  OUTREACH_TEMPLATES,
  getOutreachByCategory,
  getOutreachByTrigger,
  getOutreachById,
  recommendOutreach,
  renderStep,
  type OutreachTemplate,
  type OutreachStep,
  type OutreachCategory,
  type OutreachTrigger,
} from './templates.js';

export {
  enqueueOutreach,
  markStepSent,
  markReply,
  markDropped,
  listOutreach,
  computeVariantPerformance,
  getDueSteps,
  type OutreachInstance,
  type OutreachStatus,
  type VariantPerformance,
} from './store.js';

export {
  startSequence,
  pickWinningVariant,
  summarizeOutreach,
  type StartSequenceParams,
  type OutreachSummary,
} from './orchestrator.js';
