/**
 * Experience — la capa de experiencialización (estatus + ego + memorabilidad)
 */
export {
  buildExecutiveBrief,
  computeLeverage,
  type ExecutiveBrief,
  type Leverage,
  type Tier,
  type Trophy,
} from './executiveBrief.js';

export { buildRecapData, recapSvg, recapPng, type RecapData } from './recap.js';

export { buildOnePagerData, investorOnePagerHtml, type OnePagerData } from './investorOnePager.js';

export { getWelcome, humanizeActivity, type Welcome, type ActivityItem } from './concierge.js';
