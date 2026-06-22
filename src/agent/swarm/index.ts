/**
 * Swarm — Framework Orquestador de Agentes Autónomos de FeedIA
 * ─────────────────────────────────────────────────────────────────────────
 * Punto de entrada único. `runMission(brand, objetivo)` toma un objetivo en
 * lenguaje natural y lo lleva a cabo de punta a punta usando planner +
 * pizarra compartida + crew de agentes + crítico de reflexión, sin
 * intervención humana salvo en los checkpoints definidos.
 */

export { runMission, listMissions, getMission } from './conductor.js';
export type { MissionRecord, MissionStepLog, RunMissionOptions } from './conductor.js';

export { planMission } from './planner.js';
export type { MissionPlan } from './planner.js';

export { runOperationsCycle, getOperationsStatus } from './operations.js';
export type { OperationsReport, OperationsOptions } from './operations.js';

export { recallSimilarMissions, formatRecallForPrompt, type RecalledMission } from './recall.js';

export { critique } from './critic.js';
export type { CritiqueResult, CriticVerdict } from './critic.js';

export { initBlackboard, post as postToBlackboard, getBlackboard, summarizeBlackboard } from './blackboard.js';
export type { Blackboard, BlackboardEntry, BlackboardKind } from './blackboard.js';
