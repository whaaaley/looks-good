import pluginJs from '@eslint/js'
import importPlugin from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'
import { plugin as looksGood } from './src/index.ts'

const baseConfig = [
  { files: ['**/*.ts'] },
  pluginJs.configs.recommended,
]

const importConfig = [
  importPlugin.flatConfigs.recommended,
  {
    rules: {
      // TypeScript resolves modules more accurately than the import plugin can.
      'import-x/no-unresolved': 0,
      'import-x/named': 0,

      'import-x/export': 'error',
      'import-x/first': 'error',
      'import-x/no-absolute-path': ['error', { esmodule: true, commonjs: true, amd: false }],
      'import-x/no-duplicates': 'error',
      'import-x/no-named-default': 'error',
      'import-x/no-named-as-default': 'error',
      'import-x/no-named-as-default-member': 'error',

      // Order is built-ins, external packages, internal modules, relative imports, then types.
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

      // Sort the names inside a single import declaration.
      'sort-imports': ['error', {
        ignoreDeclarationSort: true,
        allowSeparatedGroups: false,
        ignoreCase: true,
      }],
    },
  },
]

const typeScriptConfig = [
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

// The plugin lints its own source, which is the first thing that would catch a broken rule.
const looksGoodConfig = [
  {
    plugins: {
      'looks-good': looksGood,
    },
    rules: {
      'looks-good/comment-one-sentence-per-line': 'error',
    },
  },
]

// A rule test wires RuleTester's static hooks to node:test, which its types do not model.
// A lint config array is likewise typed more narrowly than the Linter accepts at runtime.
const testConfig = [
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 0,
    },
  },
]

export default [
  ...baseConfig,
  ...importConfig,
  ...typeScriptConfig,
  ...looksGoodConfig,
  ...testConfig,
  {
    ignores: ['coverage/', 'node_modules/', 'fixtures/'],
  },
]
