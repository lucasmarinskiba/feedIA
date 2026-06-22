// @ts-nocheck
/**
 * FeedIA Brain — Cerebro completo de 4 capas
 *
 * Arquitectura:
 *   Sensores → Memoria → Razonamiento → Actuadores
 *              ↑_________________________↓
 *                        (feedback loops)
 *
 * Capas:
 *   - Sensores: trend, content, conversation, socialListening, vision, video
 *   - Memoria: semantic, graph, episodic, language
 *   - Razonamiento: causal, viral, personality, crisis, lifecycle, dream, emotional, forecaster
 *   - Actuadores: response, content, decision, sequencing
 *   - Cortex: orquestador central
 *   - Community: communityManager, stalkerTracker, humanResponse, audienceLifecycle
 *   - Aesthetic: profileOptimizer, aestheticEngine
 *   - Growth: partnership, niche, trendSync, competitor, revenue, crossBrand, recycler, engagementLoop, brandEvolution, hashtags
 *   - Bridge: autoReply, dm, enrichment
 */

export * as sensors from './sensors/index.js';
export * as memory from './memory/index.js';
export * as reasoning from './reasoning/index.js';
export * as actuators from './actuators/index.js';
export * as core from './core/index.js';
export * as community from './community/index.js';
export * as aesthetic from './aesthetic/index.js';
export * as growth from './growth/index.js';
export * as bridge from './bridge/index.js';
