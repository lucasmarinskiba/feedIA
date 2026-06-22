/**
 * Trigger Connector
 * Conecta el Event Bus con el sistema de triggers automáticos.
 * Escucha eventos del bus y dispara agentes según la configuración de triggers.
 */

import { on } from './bus.js';
import { handleEvent } from './agentTriggers.js';
import { log } from './logger.js';
import type { BrandProfile } from '../config/types.js';

let unsubscribers: Array<() => void> = [];

export const startTriggerConnector = (brand: BrandProfile): void => {
  log.info('[TriggerConnector] Iniciando conector de triggers...');

  const events = [
    'inbound_message_received',
    'anomaly_detected',
    'trend_detected',
    'ab_test_completed',
    'post_published',
    'competitor_viral_detected',
    'scheduler_weekly',
  ];

  for (const eventType of events) {
    const unsub = on(eventType, async (busEvent) => {
      try {
        await handleEvent(eventType, busEvent.payload as Record<string, unknown>, brand);
      } catch (err) {
        log.error(`[TriggerConnector] Error en ${eventType}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    unsubscribers.push(unsub);
  }

  log.info(`[TriggerConnector] ${events.length} eventos suscritos`);
};

export const stopTriggerConnector = (): void => {
  for (const unsub of unsubscribers) {
    unsub();
  }
  unsubscribers = [];
  log.info('[TriggerConnector] Conector detenido');
};
