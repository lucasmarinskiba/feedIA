/**
 * Worker orchestrator — arranca todos los workers de FeedIA.
 *
 * Uso:
 *   import { startWorkers } from './workers/index.js';
 *   startWorkers();
 *
 * Este archivo se ejecuta en el proceso largo (Render/Railway/Fly/VPS),
 * NO en Vercel Functions.
 */

import { startVideoWorker } from './videoWorker.js';
import { startVideoPostProductionWorker } from './videoPostProductionWorker.js';
import { startPublishWorker } from './publishWorker.js';
import { startAuditWorker } from './auditWorker.js';
import { startContentForgeWorker } from './contentForgeWorker.js';
import { log } from '../agent/logger.js';
import { initSentry, captureException } from '../observability/sentry.js';
import { info as obsInfo } from '../observability/logger.js';

initSentry();

const startHeartbeat = (): void => {
  const interval = 5 * 60 * 1000; // 5 minutes
  setInterval(() => {
    obsInfo('[Workers] Heartbeat', { source: 'workers/index.ts', timestamp: new Date().toISOString() });
  }, interval);
};

export const startWorkers = (): void => {
  log.info('[Workers] Starting background workers...');
  startVideoWorker();
  startVideoPostProductionWorker();
  startPublishWorker();
  startAuditWorker();
  startContentForgeWorker();
  startHeartbeat();
};

// Auto-start si se ejecuta directamente (node dist/workers/index.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    startWorkers();
  } catch (err) {
    captureException(err, { source: 'workers/index.ts' });
    log.error('[Workers] Fatal error starting workers', { err });
    process.exit(1);
  }
}
