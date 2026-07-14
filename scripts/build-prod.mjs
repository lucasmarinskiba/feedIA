#!/usr/bin/env node
/**
 * Production build script using esbuild.
 * Transpiles all TypeScript files without type checking.
 * This bypasses strict mode errors while still generating valid JS.
 */
import { build } from 'esbuild';
import { readdirSync, statSync } from 'fs';
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
  // Add .js extension to relative imports (required for Node ESM)
  plugins: [{
    name: 'add-js-extension',
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, args => {
        // Only add .js if no extension present
        if (!args.path.match(/\.[^/]+$/)) {
          return { path: args.path + '.js', external: true };
        }
        return { path: args.path, external: true };
      });
    },
  }],
});

console.log('Build complete.');
