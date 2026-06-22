/**
 * Scheduler Loop — proceso background que ejecuta publicaciones programadas.
 *
 * Cada N segundos:
 *   - llama processScheduled() para publicar carruseles cuyo scheduledFor venció
 *   - logea resultado
 *
 * Se arranca al boot del servidor desde index.ts.
 * No bloquea: si una iteración falla, sigue al siguiente tick.
 */

import { log } from '../agent/logger.js';

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000; // cada 2 min

let intervalHandle: NodeJS.Timeout | null = null;
let running = false;

export const startSchedulerLoop = (intervalMs: number = DEFAULT_INTERVAL_MS): void => {
  if (intervalHandle) {
    log.warn('[schedulerLoop] already running');
    return;
  }

  log.info(`[schedulerLoop] starting · intervalMs=${intervalMs}`);

  const tick = async (): Promise<void> => {
    if (running) {
      log.info('[schedulerLoop] previous tick still running, skipping');
      return;
    }
    running = true;
    try {
      const { processScheduled } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const result = await processScheduled();
      if (result.published > 0 || result.failed > 0) {
        log.info(`[schedulerLoop] tick result · published=${result.published} failed=${result.failed}`);
      }
    } catch (err) {
      log.warn(`[schedulerLoop] tick error · ${String(err)}`);
    } finally {
      running = false;
    }
  };

  // Primer tick rápido tras 10s, luego cada intervalMs
  setTimeout(() => {
    void tick();
  }, 10_000);
  intervalHandle = setInterval(() => {
    void tick();
  }, intervalMs);
};

export const stopSchedulerLoop = (): void => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    log.info('[schedulerLoop] stopped');
  }
};

export const isSchedulerRunning = (): boolean => intervalHandle !== null;
