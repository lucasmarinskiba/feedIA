export {
  CONCEPT_TEMPLATES,
  getTemplateById,
  getTemplatesByFormat,
  getTemplatesByFunnel,
  getTemplatesByGoal,
  recommendTemplate,
  type ConceptTemplate,
  type TemplateSlot,
  type FunnelPosition,
  type TemplateGoal,
} from './templates.js';

export { fillTemplate, flattenToContentDraft, type FilledTemplate } from './filler.js';
