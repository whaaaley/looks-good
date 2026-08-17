import eslintRules from './src/eslint-rules.ts'
import { recommended } from './src/index.ts'

// This repository lints itself with the configs it ships.
// eslintRules holds the eslint recommended set, and recommended holds every rule written here.

// The rules that take patterns report nothing until this project supplies its own.
const looksGoodRules = [
  recommended,
  // comment-reflow rewrites the wrap that comment-one-sentence-per-line only reports.
  {
    rules: {
      'looks-good/comment-one-sentence-per-line': 0,
      'looks-good/comment-reflow': 'error',
      'looks-good/comment-content': ['error', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks', ignoreCase: true },
        ],
        forbidBlockComments: true,
      }],
      'looks-good/describe-title-pattern': ['error', {
        patterns: [
          { files: 'src/utils/*.test.ts', title: 'All * Tests' },
          { files: 'tools/**/*.test.ts', title: 'All * Tests' },
        ],
      }],
      'looks-good/no-restricted-characters': ['error', {
        restrict: [
          { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
          { chars: '…', message: 'Write three dots instead.' },
        ],
      }],
    },
  },
]

// A file that declares which characters are restricted has to contain them.
const self = [
  {
    files: ['eslint.config.js'],
    rules: {
      'looks-good/no-restricted-characters': 0,
    },
  },
]

// This convention names safe and safeAsync, so it is documented in the README rather than shipped in a config.
// A shipped block would replace rather than merge with whatever no-restricted-syntax a consumer already set.
// The child combinator scopes each selector to the nearest enclosing function, which is what picks the right helper name.
// It therefore misses a try nested inside an if or a loop, since only a direct function body matches.
// A descendant combinator would catch those, but it matches every async ancestor and so double reports a sync function inside an async one.
const results = [
  {
    rules: {
      'no-restricted-syntax': ['error', {
        selector: '[async=true] > BlockStatement > TryStatement[handler]',
        message: 'Wrap the call in safeAsync and guard on the returned error. A try with only a finally clause is still allowed.',
      }, {
        selector: '[async=false] > BlockStatement > TryStatement[handler]',
        message: 'Wrap the call in safe and guard on the returned error. A try with only a finally clause is still allowed.',
      }],
    },
  },
  // The result helper is the one boundary that turns a throw into a returned error.
  {
    files: ['src/utils/safe.utils.ts'],
    rules: {
      'no-restricted-syntax': 0,
    },
  },
]

// A rule test wires RuleTester's static hooks to node:test, which its types do not model.
// A rule about characters needs those characters in its own fixtures.
const tests = [
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 0,
      'looks-good/no-emoji': 0,
      'looks-good/no-restricted-characters': 0,
    },
  },
  // RuleTester names the suite it drives, so the file declares no describe of its own.
  {
    files: ['src/utils/textScan.utils.test.ts'],
    rules: {
      'looks-good/describe-title-pattern': 0,
    },
  },
]

export default [
  ...eslintRules.recommended,
  ...looksGoodRules,
  ...self,
  ...results,
  ...tests,
  {
    ignores: ['coverage/', 'node_modules/'],
  },
]
