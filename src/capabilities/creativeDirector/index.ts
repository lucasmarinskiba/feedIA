/**
 * Creative Director — capa de gusto, originalidad y perfeccionismo creativo.
 */

export { evaluateTaste, type TasteScore, type TasteInput } from './tasteEngine.js';
export { generateFeedback, type CreativeFeedback } from './feedbackGenerator.js';
export {
  CAROUSEL_PRINCIPLES,
  formatPrinciplesForPrompt,
  getPrinciplesByCategory,
  type CarouselPrinciple,
} from './instagramCarouselPrinciples.js';
export { PINTEREST_AESTHETICS, formatAestheticForPrompt, getAestheticByKeywords, type PinterestAesthetic } from './pinterestAesthetics.js';
export { CREATIVE_DIRECTOR, GRAPHIC_DESIGNER, COPYWRITER_GROWTH, SOCIAL_MEDIA_ANALYST } from './creativePersonas.js';
