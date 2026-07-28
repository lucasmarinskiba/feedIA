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

// Post-process: add .js extension to relative imports (required for Node ESM)
function fixImports(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (entry.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      // Add .js to relative imports/exports that have no extension
      const fixed = content.replace(
        /(from\s+['"])(\.\.?\/[^'"]*?)(['"])/g,
        (match, prefix, path, suffix) => {
          if (path.match(/\.[a-zA-Z]+$/)) return match;
          return `${prefix}${path}.js${suffix}`;
        }
      );
      if (fixed !== content) writeFileSync(fullPath, fixed);
    }
  }
}

fixImports('dist');
console.log('Build complete with .js extensions added.');
