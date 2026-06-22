/**
 * Autopilot — cerebro autónomo del Computer Use ("Activado").
 */
export {
  getActivatedState,
  setActivated,
  setModuleEnabled,
  markModuleRun,
  isAutopilotModuleActive,
  type AutopilotState,
  type AutopilotModule,
  type AutopilotModuleId,
} from './activatedState.js';

import { getActivatedState as _getState } from './activatedState.js';
/** ¿El master switch del Cerebro Activado está prendido? */
export const isAutopilotMasterActivated = (): boolean => _getState().activated;
