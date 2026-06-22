export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOGTAIL_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN;
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => LEVELS[level] >= LEVELS[LOG_LEVEL];

const sendToLogtail = async (entry: LogEntry): Promise<void> => {
  if (!LOGTAIL_TOKEN) return;
  try {
    await fetch('https://in.logtail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOGTAIL_TOKEN}`,
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // Fail silently to avoid recursion
  }
};

export const log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  console[level](`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, context ?? '');

  void sendToLogtail(entry);
};

export const debug = (message: string, context?: Record<string, unknown>): void => log('debug', message, context);
export const info = (message: string, context?: Record<string, unknown>): void => log('info', message, context);
export const warn = (message: string, context?: Record<string, unknown>): void => log('warn', message, context);
export const error = (message: string, context?: Record<string, unknown>): void => log('error', message, context);
