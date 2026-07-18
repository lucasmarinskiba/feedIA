#!/usr/bin/env node
/**
 * Verifies public/ frontend is intact before deploy.
 * Run: node scripts/check-frontend.mjs
 */
import { existsSync, statSync } from 'fs';

const REQUIRED = [
  'public/index.html',
  'public/app.js',
  'public/style.css',
];

let ok = true;
for (const f of REQUIRED) {
  if (!existsSync(f)) {
    console.error(`MISSING: ${f}`);
    ok = false;
  } else {
    const size = statSync(f).size;
    if (size < 100) {
      console.error(`EMPTY: ${f} (${size} bytes)`);
      ok = false;
    }
  }
}

if (!ok) {
  console.error('\nFrontend check FAILED — public/ is damaged or incomplete.');
  process.exit(1);
}

console.log('Frontend OK — public/ intact.');
