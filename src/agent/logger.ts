import chalk from 'chalk';
import { env } from '../config/index.js';

const levels = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof levels;

const enabled = (level: Level): boolean => levels[level] <= levels[(env.logLevel as Level) ?? 'info'];

// Every level silently dropped its second (metadata/error) argument — every
// log.error(msg, { error: err.message }) call across the app only ever
// printed msg, discarding the actual error detail. Found while trying to
// diagnose a production 500 that showed up in Railway's logs as four bare
// "[Server] error" lines with no message, no stack, nothing to act on.
const args = (extra?: unknown): unknown[] => (extra === undefined ? [] : [extra]);

export const log = {
  info: (msg: string, extra?: unknown): void => {
    if (enabled('info')) console.log(chalk.cyan('ℹ'), msg, ...args(extra));
  },
  warn: (msg: string, extra?: unknown): void => {
    if (enabled('warn')) console.warn(chalk.yellow('⚠'), msg, ...args(extra));
  },
  error: (msg: string, extra?: unknown): void => {
    if (enabled('error')) console.error(chalk.red('✖'), msg, ...args(extra));
  },
  debug: (msg: string, extra?: unknown): void => {
    if (enabled('debug')) console.log(chalk.gray('·'), msg, ...args(extra));
  },
  step: (msg: string): void => {
    console.log(chalk.bold.magenta('▸'), chalk.bold(msg));
  },
  success: (msg: string): void => {
    console.log(chalk.green('✓'), msg);
  },
};
