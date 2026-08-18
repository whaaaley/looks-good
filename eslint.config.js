import eslintRules from './src/eslint-rules.ts'
import { parsing, recommended, typescript } from './src/index.ts'

// This repository lints itself with the configs it ships.
// eslintRules holds the eslint recommended set, and the three configs hold every rule written here.
// This project is TypeScript and already takes the parsing dependencies, so it spreads all three.

// The rules that take patterns report nothing until this project supplies its own.
const looksGoodRules = [
  recommended,
  parsing,
  typescript,
  // Join mode rewrites the wrap that report mode only reports.
  {
    rules: {
      'looks-good/comment-wrap': ['error', { onWrap: 'join' }],
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
const self = [{
  files: ['eslint.config.js'],
  rules: {
    'looks-good/no-restricted-characters': 0,
  },
}]

// no-try-catch-handler ships in no config, since only this project knows where its result helper lives.
const results = [
  {
    rules: {
      'looks-good/no-try-catch-handler': ['error', { module: 'src/utils/safe.utils.ts', sync: 'safe', async: 'safeAsync' }],
    },
  },
  // The result helper is the one boundary that turns a throw into a returned error.
  {
    files: ['src/utils/safe.utils.ts'],
    rules: {
      'looks-good/no-try-catch-handler': 0,
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
      'looks-good/array-bracket-hug': 0, // A chain leaves a fresh case annotation no line to land on.
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
