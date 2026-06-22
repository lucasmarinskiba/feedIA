export {
  validateVisualQA,
  generateVisualQAFeedback,
  type VisualQAResult,
  type VisualIssue,
  type VisualIssueSeverity,
  type TextElement,
  type SlideOrFrame,
  type VisualQAInput,
} from './visualQA.js';

export { buildVisualQAInput } from './contentToVisualQA.js';

export { reviewCanvaDesign, type DesignReviewResult, type ReviewableContent } from './canvaDesignReviewer.js';

export {
  FORMAT_SPECS,
  getFormatSpec,
  getFormatSpecForContent,
  isTextInSafeZone,
  hasMinimumMargins,
  type FormatSpec,
} from './gridSystem.js';
