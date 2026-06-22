/**
 * setup-hooks — arma el pre-commit gate sin dependencias.
 *
 * Corre en `npm install`/`npm run prepare`. Si el proyecto es un repo git,
 * apunta core.hooksPath a .githooks (versionado, compartible). Si todavía no
 * hay repo (caso actual), no rompe nada: deja todo listo para cuando se haga
 * `git init`. Idempotente y silencioso.
 */
import { execSync } from 'node:child_process';
import { existsSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const log = (m) => process.stdout.write(`[setup-hooks] ${m}\n`);

try {
  // ¿Estamos dentro de un repo git?
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
} catch {
  log('No hay repo git todavía — el hook se activará solo cuando hagas `git init`. (npm run verify funciona igual)');
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  const hook = resolve('.githooks/pre-commit');
  if (existsSync(hook)) {
    try {
      chmodSync(hook, 0o755);
    } catch {
      /* Windows: no aplica */
    }
  }
  log('Pre-commit gate activo → corre `npm run verify` antes de cada commit.');
} catch (e) {
  log(`No se pudo configurar el hook (no bloqueante): ${e.message}`);
}
