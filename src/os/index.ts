export {
  startAutonomousOS,
  osTick,
  scheduleOSTask,
  runOSEvolution,
  getOSState,
  getOSStatus,
  setAutonomyLevel,
  type OSState,
} from './autonomousCore.js';

export {
  triggerSelfHealing,
  recordSuccess,
  recordFailure,
  isAgentHealthy,
  getSystemHealth,
  resetAgentHealth,
  type HealthRecord,
  type SystemHealth,
} from './selfHealing.js';

export {
  runEvolutionCycle,
  addLesson,
  recordPerformance,
  getEvolutionState,
  getTopLessons,
  type Lesson,
  type EvolutionState,
} from './agentEvolution.js';
