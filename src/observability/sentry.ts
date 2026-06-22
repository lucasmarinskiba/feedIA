import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

export const initSentry = (): void => {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
};

export const captureException = (err: unknown, context?: Record<string, unknown>): void => {
  if (!dsn) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info'): void => {
  if (!dsn) return;
  Sentry.captureMessage(message, level);
};
