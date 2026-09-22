import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // vitest's own defaults already exclude dist/**, but `npm run verify` runs the build
    // BEFORE the tests (compiling src/__tests__/*.test.ts into dist/__tests__/*.test.js),
    // and this repo's test scripts are commonly invoked with ad-hoc --exclude flags that
    // silently REPLACE (not merge with) the defaults — which used to let dist/ back in and
    // run every test twice against the same real SQLite file, colliding on UNIQUE
    // constraints. Spelling the exclude list out here, merged with vitest's own defaults,
    // means a correct exclude list applies no matter how the test command is invoked.
    // .claude/worktrees and feedIA/ are a local git worktree tree and a submodule that
    // carry their own copies of this same test suite; they must never run in parallel
    // against shared local state (data/, ports) with the real one.
    exclude: [...configDefaults.exclude, '.claude/**', 'feedIA/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: undefined,
    },
  },
});
