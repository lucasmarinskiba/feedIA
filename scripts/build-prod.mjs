#!/usr/bin/env node
/**
 * Production build script using esbuild.
 * Transpiles all TypeScript files without type checking.
 * Post-processes output to add .js extensions to relative imports.
 */
import { build } from 'esbuild';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectFiles(fullPath, results);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const entryPoints = collectFiles('src');
console.log(`Building ${entryPoints.length} TypeScript files with esbuild...`);

await build({
  entryPoints,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  outbase: 'src',
  bundle: false,
  target: 'node20',
});

// Output is ESM (format: 'esm'), where `require` does not exist. The source
// tree still calls require() in ~18 places — mostly lazy loads of node builtins
// and optional packages. esbuild leaves those calls untouched because
// bundle:false, so each one throws "require is not defined" the moment its code
// path runs. Rather than rewrite every call site, give any module that needs it
// a real CommonJS resolver.
const REQUIRE_SHIM =
  "import { createRequire as __createRequire } from 'node:module';\n" +
  'const require = __createRequire(import.meta.url);\n';

// Matches a require( call, ignoring property accesses like `foo.require(`.
const USES_REQUIRE = /(^|[^.\w$])require\s*\(/;
// Skip files that already build their own require (e.g. src/db/postgres-real.ts),
// otherwise the injected const would be a duplicate declaration.
const HAS_OWN_REQUIRE = /createRequire\s*\(/;

function addRequireShim(content) {
  if (!USES_REQUIRE.test(content) || HAS_OWN_REQUIRE.test(content)) return content;
  return REQUIRE_SHIM + content;
}

// Post-process: add .js extension to relative imports (required for Node ESM)
function fixImports(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (entry.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      // Add .js to relative imports/exports that have no extension
      const fixed = addRequireShim(
        content.replace(
          /(from\s+['"])(\.\.?\/[^'"]*?)(['"])/g,
          (match, prefix, path, suffix) => {
            if (path.match(/\.[a-zA-Z]+$/)) return match;
            return `${prefix}${path}.js${suffix}`;
          }
        )
      );
      if (fixed !== content) writeFileSync(fullPath, fixed);
    }
  }
}

fixImports('dist');
console.log('Build complete with .js extensions added.');
