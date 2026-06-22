/**
 * Creative Suite — design system, templates, motion graphics y visual QA real.
 */

export * from './types.js';
export {
  buildCampaignTheme,
  buildDesignSystem,
  applyDesignSystemToTemplate,
  validateDesignSystem,
  detectCampaignMood,
} from './campaignDesignSystem.js';
export { listTemplates, getTemplate, fillTemplate, recommendTemplate, registerTemplate } from './templateEngine.js';
export {
  generateMotionGraphic,
  generateTextRevealLottie,
  generateZoomPulseLottie,
  listMotionGraphics,
  type LottieAnimation,
} from './motionGraphics.js';
export { analyzeVisualQuality } from './visualQAReal.js';
