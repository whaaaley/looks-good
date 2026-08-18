/**
 * A curated set of third-party eslint rules, shipped separately from the plugin.
 * @module
 */

import pluginJs from '@eslint/js'
import { flatConfigs } from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'
import type { Linter } from 'eslint'

const base: Linter.Config[] = [
  { files: ['**/*.ts'] },
  pluginJs.configs.recommended,
]

const imports: Linter.Config[] = [
  flatConfigs.recommended,
  {
    rules: {
      'import-x/no-unresolved': 0, // TypeScript resolves modules, not the plugin.
      'import-x/named': 0, // TypeScript checks named exports, not the plugin.
      'import-x/export': 'error',
      'import-x/first': 'error',
      'import-x/no-absolute-path': ['error', { esmodule: true, commonjs: true, amd: false }],
      'import-x/no-duplicates': 'error',
      'import-x/no-named-default': 'error',
      'import-x/no-named-as-default': 'error',
      'import-x/no-named-as-default-member': 'error',
      'import-x/order': ['error', {
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
          orderImportKind: 'asc',
        },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
      }],
      'sort-imports': ['error', { // Sorts names within a declaration only.
        ignoreDeclarationSort: true,
        allowSeparatedGroups: false,
        ignoreCase: true,
      }],
    },
  },
]

const typescript: Linter.Config[] = [
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
]

/** Every third-party config in this module, flattened into one array a consumer spreads into a flat config. */
export const recommended: Linter.Config[] = [
  ...base,
  ...imports,
  ...typescript,
]

/** The module's configs under one object, for a consumer importing the default. */
const configs = { recommended }

export default configs
