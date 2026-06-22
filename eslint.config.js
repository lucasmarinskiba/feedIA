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
      'src/auth/**',
      'src/brain/**',
      'src/capabilities/quickCarousel/**',
      'src/capabilities/quickReel/**',
      'src/capabilities/quickStory/**',
      'src/server/extendedRoutes.ts',
      'src/studio/**',
    ],
  },
];
