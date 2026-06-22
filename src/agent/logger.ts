import chalk from 'chalk';
import { env } from '../config/index.js';

const levels = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof levels;

const enabled = (level: Level): boolean => levels[level] <= levels[(env.logLevel as Level) ?? 'info'];

export const log = {
  info: (msg: string, _extra?: unknown): void => {
    if (enabled('info')) console.log(chalk.cyan('ℹ'), msg);
  },
  warn: (msg: string, _extra?: unknown): void => {
    if (enabled('warn')) console.warn(chalk.yellow('⚠'), msg);
  },
  error: (msg: string, _extra?: unknown): void => {
    if (enabled('error')) console.error(chalk.red('✖'), msg);
  },
  debug: (msg: string, _extra?: unknown): void => {
    if (enabled('debug')) console.log(chalk.gray('·'), msg);
  },
  step: (msg: string): void => {
    console.log(chalk.bold.magenta('▸'), chalk.bold(msg));
  },
  success: (msg: string): void => {
    console.log(chalk.green('✓'), msg);
  },
};
