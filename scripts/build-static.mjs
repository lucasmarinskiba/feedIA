/**
 * Build pipeline para frontend blindado:
 *  - Copia todo `src/server/static/**` a `dist-static/**`
 *  - Minifica cada `.js` con esbuild (sin bundling — preserva imports lazy)
 *  - Minifica `.css` también
 *  - HTML pasa tal cual (las rutas son las mismas; imports siguen siendo `./views/x.js`)
 *
 * Seguridad del build:
 *  - Sin source maps en producción (sourcemap: false).
 *  - Identificadores minificados (minifyIdentifiers: true).
 *  - Se eliminan console.* y debugger en producción.
 *  - Se inyecta meta CSP y headers de seguridad en index.html.
 */
import { mkdir, readdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src', 'server', 'static');
const OUT = join(ROOT, 'dist-static');
const ENABLED = (process.env.MINIFY ?? 'true') !== 'false';

let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  console.warn('[build-static] esbuild no instalado — copiando archivos sin minificar.');
}

let copied = 0,
  minifiedJs = 0,
  minifiedCss = 0,
  totalSavedBytes = 0;

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
};

const minifyJs = async (src, dest) => {
  if (!esbuild || !ENABLED) {
    await copyFile(src, dest);
    return;
  }
  try {
    const raw = await readFile(src, 'utf-8');
    const r = await esbuild.transform(raw, {
      minify: true,
      target: 'es2022',
      loader: 'js',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      legalComments: 'none',
      sourcemap: false,
      drop: ['debugger'],
      pure: ['console.log', 'console.info', 'console.warn', 'console.debug'],
      supported: { 'top-level-await': true },
    });
    await writeFile(dest, r.code, 'utf-8');
    totalSavedBytes += raw.length - r.code.length;
    minifiedJs++;
  } catch (err) {
    console.warn(`[build-static] falló minify ${src}: ${err.message} — copy raw`);
    await copyFile(src, dest);
  }
};

const minifyCss = async (src, dest) => {
  if (!esbuild || !ENABLED) {
    await copyFile(src, dest);
    return;
  }
  try {
    const raw = await readFile(src, 'utf-8');
    const r = await esbuild.transform(raw, { minify: true, loader: 'css', legalComments: 'none' });
    await writeFile(dest, r.code, 'utf-8');
    totalSavedBytes += raw.length - r.code.length;
    minifiedCss++;
  } catch (err) {
    console.warn(`[build-static] falló minify ${src}: ${err.message} — copy raw`);
    await copyFile(src, dest);
  }
};

const main = async () => {
  if (!existsSync(SRC)) {
    console.error(`[build-static] No existe ${SRC}`);
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const files = await walk(SRC);
  console.log(`[build-static] ${files.length} archivos. minify=${ENABLED && !!esbuild}`);
  for (const src of files) {
    const rel = relative(SRC, src);
    const dest = join(OUT, rel);
    await mkdir(dirname(dest), { recursive: true });
    if (src.endsWith('.js')) await minifyJs(src, dest);
    else if (src.endsWith('.css')) await minifyCss(src, dest);
    else {
      await copyFile(src, dest);
      copied++;
    }
  }
  // Inyectar seguridad y versión en index.html
  const indexPath = join(OUT, 'index.html');
  if (existsSync(indexPath)) {
    const sha = (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7);
    const version = `1.0.0-${sha}-${Date.now()}`;
    const csp =
      process.env.FRONTEND_CSP ||
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' /api; img-src 'self' blob: data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";
    let html = await readFile(indexPath, 'utf-8');
    html = html.replace(
      /(<head[^>]*>)/i,
      `$1\n  <meta name="x-feedia-version" content="${version}">\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`,
    );
    await writeFile(indexPath, html, 'utf-8');
  }
  console.log(
    `[build-static] OK. js=${minifiedJs} css=${minifiedCss} copy=${copied} savedKB=${(totalSavedBytes / 1024).toFixed(1)}`,
  );
};

main().catch((err) => {
  console.error('[build-static] FATAL', err);
  process.exit(1);
});
