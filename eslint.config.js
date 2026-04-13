import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'release',
    'coverage',
    'node_modules.bak.*',
    // Competitor projects are vendored for reference and should not block lint in our app.
    'competitor/**',
  ]),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // shadcn/ui often exports helpers/constants alongside components (e.g. buttonVariants).
      'react-refresh/only-export-components': 'off',
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: [
      'electron/**/*.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'vite.config.ts',
      'playwright.e2e.config.ts',
      'scripts/**/*.{ts,tsx,js,mjs,cjs}',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    files: ['shared/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      'max-lines': 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    files: [
      'electron/ipc/**/*.{ts,tsx}',
      'electron/state/**/*.{ts,tsx}',
      'electron/services/settings/**/*.{ts,tsx}',
      'electron/services/db/**/*.{ts,tsx}',
      'src/app/hooks/**/*.{ts,tsx}',
      'src/app/store/**/*.{ts,tsx}',
      'src/app/services/**/*.{ts,tsx}',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 12],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
])
