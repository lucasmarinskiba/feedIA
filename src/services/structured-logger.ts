/**
 * Structured Logger — Pino-based logging for all services
 *
 * Flow: log.info/warn/error → pino → stdout (dev) or file (prod)
 *
 * All logs include: timestamp, level, module, context, error stack
 * No console.log. Structured JSON output for aggregation.
 */

import pino from 'pino';

// ─── Logger Configuration ────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production';

const pinoConfig = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
};

const logger = pino(pinoConfig);

// ─── Structured Logger API ──────────────────────────────────────────────

export interface LogContext {
  module?: string;
  requestId?: string;
  accountId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Create module-scoped logger
 *
 * All logs from this logger include module name
 */
export const createLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

/**
 * Log info + context
 */
export const info = (message: string, context?: LogContext): void => {
  logger.info(context || {}, message);
};

/**
 * Log warning + context
 */
export const warn = (message: string, context?: LogContext): void => {
  logger.warn(context || {}, message);
};

/**
 * Log error + context + stack
 */
export const error = (message: string, err?: Error, context?: LogContext): void => {
  if (err) {
    logger.error({ ...context, error: err.message, stack: err.stack }, message);
  } else {
    logger.error(context || {}, message);
  }
};

/**
 * Log debug (dev only)
 */
export const debug = (message: string, context?: LogContext): void => {
  logger.debug(context || {}, message);
};

/**
 * Performance timing logger
 *
 * Usage: const timer = time('operation'); ... timer.end();
 */
export const time = (operation: string) => {
  const start = Date.now();
  return {
    end: (context?: LogContext) => {
      const duration = Date.now() - start;
      debug(`${operation} completed`, {
        ...context,
        durationMs: duration,
        operation,
      });
      return duration;
    },
  };
};

// ─── Child Loggers for Key Modules ──────────────────────────────────────

export const realDataSyncLogger = createLogger('[real-data-sync]');
export const anomalyDetectorLogger = createLogger('[anomaly-detector]');
export const autonomousExecutorLogger = createLogger('[autonomous-executor]');
export const agentOrchestrationLogger = createLogger('[agent-orchestration]');
export const metricsLogger = createLogger('[metrics]');
export const healthCheckLogger = createLogger('[health-check]');

export default {
  info,
  warn,
  error,
  debug,
  time,
  createLogger,
  realDataSyncLogger,
  anomalyDetectorLogger,
  autonomousExecutorLogger,
  agentOrchestrationLogger,
  metricsLogger,
  healthCheckLogger,
};
