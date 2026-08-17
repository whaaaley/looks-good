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
      // Reporting rules, which never rewrite.
      'looks-good/comment-content': ['error', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks' },
        ],
        forbidBlockComments: true,
      }],
      'looks-good/no-emoji': 'error',
      'looks-good/no-optional-chain-on-index': 'error',
      'looks-good/no-restricted-characters': ['error', {
        restrict: [
          { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
          { chars: '…', message: 'Write three dots instead.' },
        ],
      }],
      'looks-good/test-arrange-act-assert': 'error',

      // Fixing. This stands in for comment-one-sentence-per-line, which reports the same wrap.
      'looks-good/comment-reflow': 'error',
    },
  },
]

// A rule test wires RuleTester's static hooks to node:test, which its types do not model.
// A lint config array is likewise typed more narrowly than the Linter accepts at runtime.
// A file that declares which characters are restricted has to contain them.
const selfConfig = [
  {
    files: ['eslint.config.js'],
    rules: {
      'looks-good/no-restricted-characters': 0,
    },
  },
]

const testConfig = [
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 0,
      // A rule about characters needs those characters in its own fixtures.
      'looks-good/no-emoji': 0,
      'looks-good/no-restricted-characters': 0,
    },
  },
]

export default [
  ...baseConfig,
  ...importConfig,
  ...typeScriptConfig,
  ...looksGoodConfig,
  ...selfConfig,
  ...testConfig,
  {
    ignores: ['coverage/', 'node_modules/', 'fixtures/'],
  },
]
