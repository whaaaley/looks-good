import externalRules from './src/external-rules.ts'
import { plugin } from './src/index.ts'

// This repository lints itself with the two configs it ships.
// externalRules holds rules from other plugins, and looksGoodRules holds the rules written here.

const looksGoodRules = [
  {
    plugins: {
      'looks-good': plugin,
    },
    rules: {
      // Reporting rules, which never rewrite.
      'looks-good/comment-content': ['error', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks' },
        ],
        forbidBlockComments: true,
      }],
      'looks-good/describe-title-pattern': ['error', {
        patterns: [
          { files: 'src/**/*.test.ts', title: 'All * Tests' },
        ],
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

// A file that declares which characters are restricted has to contain them.
const self = [
  {
    files: ['eslint.config.js'],
    rules: {
      'looks-good/no-restricted-characters': 0,
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
]

export default [
  ...externalRules.recommended,
  ...looksGoodRules,
  ...self,
  ...tests,
  {
    ignores: ['coverage/', 'node_modules/'],
  },
]
