import blankLineAfterBlock from './rules/blank-line-after-block.ts'
import commentContent from './rules/comment-content.ts'
import commentOneSentencePerLine from './rules/comment-one-sentence-per-line.ts'
import commentReflow from './rules/comment-reflow.ts'
import describeGroupOrder from './rules/describe-group-order.ts'
import describeTitlePattern from './rules/describe-title-pattern.ts'
import maxDestructuredParameters from './rules/max-destructured-parameters.ts'
import maxSingleLineStatementLength from './rules/max-single-line-statement-length.ts'
import noEmoji from './rules/no-emoji.ts'
import noIgnoredTests from './rules/no-ignored-tests.ts'
import noRestrictedCharacters from './rules/no-restricted-characters.ts'
import noUnionInParameterType from './rules/no-union-in-parameter-type.ts'
import objectCommentsTrailing from './rules/object-comments-trailing.ts'
import requireFileCalls from './rules/require-file-calls.ts'
import testArrangeActAssert from './rules/test-arrange-act-assert.ts'
import type { ESLint, Linter } from 'eslint'

// Rules that report and never rewrite.
// A violation here needs a person or an agent to decide what the text should say.
const reporting = {
  'comment-content': commentContent,
  'comment-one-sentence-per-line': commentOneSentencePerLine,
  'describe-group-order': describeGroupOrder,
  'describe-title-pattern': describeTitlePattern,
  'max-destructured-parameters': maxDestructuredParameters,
  'no-emoji': noEmoji,
  'no-ignored-tests': noIgnoredTests,
  'no-restricted-characters': noRestrictedCharacters,
  'no-union-in-parameter-type': noUnionInParameterType,
  'object-comments-trailing': objectCommentsTrailing,
  'require-file-calls': requireFileCalls,
  'test-arrange-act-assert': testArrangeActAssert,
}

// Rules that rewrite under --fix.
// A violation here moves text without changing what it says.
const fixable = {
  'blank-line-after-block': blankLineAfterBlock,
  'comment-reflow': commentReflow,
  'max-single-line-statement-length': maxSingleLineStatementLength,
}

const rules = {
  ...reporting,
  ...fixable,
}

export const plugin: ESLint.Plugin = {
  meta: {
    name: 'looks-good',
    version: '0.1.0',
  },
  rules,
}

// Rules that record deferred work rather than a defect, so they do not break a build.
const warnings = {
  'looks-good/comment-content': 'warn',
  'looks-good/no-ignored-tests': 'warn',
} as const

// Rules that report a defect, where the fix is to change the code.
const errors = {
  'looks-good/blank-line-after-block': 'error',
  'looks-good/describe-group-order': 'error',
  'looks-good/describe-title-pattern': 'error',
  'looks-good/max-destructured-parameters': 'error',
  'looks-good/max-single-line-statement-length': 'error',
  'looks-good/no-emoji': 'error',
  'looks-good/no-restricted-characters': 'error',
  'looks-good/object-comments-trailing': 'error',
  'looks-good/require-file-calls': 'error',
  'looks-good/test-arrange-act-assert': 'error',
} as const

const sharedRules = {
  ...warnings,
  ...errors,
} as const

// A consumer spreads this into a flat config, and every rule reads as looks-good/<name>.
// comment-one-sentence-per-line reports the wrapped sentence rather than rewriting it.
export const recommended: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    ...sharedRules,
    'looks-good/comment-one-sentence-per-line': 'error',
  },
}

// The same set, with comment-reflow standing in for comment-one-sentence-per-line.
// Enabling both would report one wrapped sentence twice.
export const fixing: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    ...sharedRules,
    'looks-good/comment-reflow': 'error',
  },
}

// Rules that read TypeScript syntax nodes, which the default espree parser never produces.
// This config sets no parser of its own, so it never overrides the one the consumer chose.
// Spread it inside a config block that already sets @typescript-eslint/parser.
export const typescript: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    'looks-good/no-union-in-parameter-type': 'error',
  },
}

plugin.configs = {
  recommended,
  fixing,
  typescript,
}

export default plugin
