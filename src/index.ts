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
import noSingleLineNestedObject from './rules/no-single-line-nested-object.ts'
import noTryCatchHandler from './rules/no-try-catch-handler.ts'
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
  'no-single-line-nested-object': noSingleLineNestedObject,
  'no-try-catch-handler': noTryCatchHandler,
  'no-union-in-parameter-type': noUnionInParameterType,
  'object-comments-trailing': objectCommentsTrailing,
  'require-file-calls': requireFileCalls,
  'test-arrange-act-assert': testArrangeActAssert,
}

// Rules that rewrite under --fix.
// A violation here moves text, or swaps one character for the spelling a project asked for.
const fixable = {
  'blank-line-after-block': blankLineAfterBlock,
  'comment-reflow': commentReflow,
  'max-single-line-statement-length': maxSingleLineStatementLength,
  'no-restricted-characters': noRestrictedCharacters,
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
  'looks-good/no-ignored-tests': 'warn',
} as const

// Rules that report a defect, where the fix is to change the code.
const errors = {
  'looks-good/blank-line-after-block': 'error',
  'looks-good/describe-group-order': 'error',
  'looks-good/max-destructured-parameters': 'error',
  'looks-good/max-single-line-statement-length': 'error',
  'looks-good/no-single-line-nested-object': 'error',
  'looks-good/object-comments-trailing': 'error',
} as const

// A consumer spreads this into a flat config, and every rule reads as looks-good/<name>.
// This is a house style rather than a cautious baseline, so turn off what a project disagrees with.
// It holds the rules that read estree nodes alone, so it pulls in no package beyond eslint itself.
export const recommended: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    ...warnings,
    ...errors,
  },
}

// Rules that parse the text inside a file rather than reading estree nodes alone.
// Sentences come from parse-english, code spans from mdast-util-from-markdown, and path patterns from minimatch.
// Every rule here works the moment it is enabled, so this config is about what the plugin costs rather than what it can do.
// comment-reflow is left off because it and comment-one-sentence-per-line report the same wrap.
// Turn this one off and that one on to rewrite a wrapped sentence under --fix instead.
export const parsing: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    'looks-good/comment-content': 'warn',
    'looks-good/comment-one-sentence-per-line': 'error',
    'looks-good/describe-title-pattern': 'error',
    'looks-good/no-emoji': 'error',
    'looks-good/no-restricted-characters': 'error',
    'looks-good/require-file-calls': 'error',
    'looks-good/test-arrange-act-assert': 'error',
  },
}

// no-try-catch-handler is in no config, because it points at a result helper the consumer has to have written first.
// Enabled without one, it would tell a project to call a function that does not exist there.
// Write the helper, then enable the rule with the module path it lives at.

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
  parsing,
  recommended,
  typescript,
}

export default plugin
