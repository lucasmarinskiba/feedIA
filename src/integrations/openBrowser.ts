import { exec } from 'node:child_process';
import { log } from '../agent/logger.js';

export const openBrowser = (url: string): void => {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      log.warn(`No se pudo abrir el navegador automáticamente. Abrí manualmente: ${url}`);
    } else {
      log.info(`Navegador abierto: ${url}`);
    }
  });
};
