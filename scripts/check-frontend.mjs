#!/usr/bin/env node
/**
 * Verifies dist-static/ (built by build:static from src/server/static/) is
 * intact before deploy. Run after `npm run build:static`.
 */
import { existsSync, statSync } from 'fs';

const REQUIRED = ['dist-static/index.html', 'dist-static/app.js', 'dist-static/style.css'];

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
  console.error('\nFrontend check FAILED — dist-static/ is damaged or incomplete.');
  process.exit(1);
}

console.log('Frontend OK — dist-static/ intact.');
