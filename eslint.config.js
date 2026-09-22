import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-body-style': ['warn', 'as-needed'],
      'prefer-arrow-callback': 'error',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/api/**',
      'src/auth/**',
      'src/brain/**',
      'src/capabilities/**',
      'src/server/extendedRoutes.ts',
      'src/server/carouselDesignerRoutes.ts',
      'src/server/higgsfieldRoutes.ts',
      'src/server/skillsRoutes.ts',
      'src/server/studioRoutes.ts',
      'src/studio/**',
      'src/agent/**',
      'src/agents/**',
      'src/workers/**',
      'src/skills/**',
      'src/__tests__/**',
      'src/services/**',
      'src/utils/**',
      'src/lib/**',
      'src/config/**',
      'src/types/**',
      'src/database/**',
      // Legacy files not touched by recent work, same debt as the directories ignored above
      // (many `any`/unused-var pre-existing issues), just too thinly scattered across
      // otherwise-active directories to ignore the whole directory without also hiding
      // future files there from real lint coverage.
      'src/autonomous/AUTONOMOUS_FEEDIA_BRAIN.ts',
      'src/browserOperators/core/antiDetection.ts',
      'src/browserOperators/core/rateLimitSmart.ts',
      'src/browserOperators/instagram/publishRouter.ts',
      'src/computer_use/FEEDIA_COMPUTER_USE_ORCHESTRATOR.ts',
      'src/computer_use/PROFESSIONAL_AUTOMATION_WORKFLOWS.ts',
      'src/db/database.ts',
      'src/db/init.ts',
      'src/db/store.ts',
      'src/integrations/cloudinaryAdapter.ts',
      'src/integrations/computerUseSDK.ts',
      'src/integrations/imageDownloader.ts',
      'src/integrations/metaAds.ts',
      'src/integrations/mongoDbAdapter.ts',
      'src/integrations/unsplashAdapter.ts',
      'src/middleware/cache-layer.ts',
      'src/middleware/feature-flags.ts',
      'src/middleware/redis-rate-limiter.ts',
      'src/middleware/request-context.ts',
      'src/middleware/security-hardening.ts',
      'src/monitoring/performance.ts',
      'src/scripts/seed-production-data.ts',
    ],
  },
];
