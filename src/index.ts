import commentContent from './rules/comment-content.ts'
import commentOneSentencePerLine from './rules/comment-one-sentence-per-line.ts'
import commentReflow from './rules/comment-reflow.ts'
import describeGroupOrder from './rules/describe-group-order.ts'
import describeTitlePattern from './rules/describe-title-pattern.ts'
import maxTimeoutValue from './rules/max-timeout-value.ts'
import noEmoji from './rules/no-emoji.ts'
import noIgnoredTests from './rules/no-ignored-tests.ts'
import noOptionalChainOnIndex from './rules/no-optional-chain-on-index.ts'
import noRestrictedCharacters from './rules/no-restricted-characters.ts'
import noRestrictedMethodCalls from './rules/no-restricted-method-calls.ts'
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
  'max-timeout-value': maxTimeoutValue,
  'no-emoji': noEmoji,
  'no-ignored-tests': noIgnoredTests,
  'no-optional-chain-on-index': noOptionalChainOnIndex,
  'no-restricted-characters': noRestrictedCharacters,
  'no-restricted-method-calls': noRestrictedMethodCalls,
  'require-file-calls': requireFileCalls,
  'test-arrange-act-assert': testArrangeActAssert,
}

// Rules that rewrite under --fix.
// A violation here moves text without changing what it says.
const fixable = {
  'comment-reflow': commentReflow,
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
  'looks-good/describe-group-order': 'error',
  'looks-good/describe-title-pattern': 'error',
  'looks-good/max-timeout-value': 'error',
  'looks-good/no-emoji': 'error',
  'looks-good/no-optional-chain-on-index': 'error',
  'looks-good/no-restricted-characters': 'error',
  'looks-good/no-restricted-method-calls': 'error',
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

plugin.configs = {
  recommended,
  fixing,
}

export default plugin
