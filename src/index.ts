/**
 * An eslint plugin of rules for comment text, test structure, and statement shape.
 * @module
 */

import denoConfig from '../deno.json' with { type: 'json' }
import arrayBracketHug from './rules/array-bracket-hug.ts'
import blankLineAfterBlock from './rules/blank-line-after-block.ts'
import commentContent from './rules/comment-content.ts'
import commentWrap from './rules/comment-wrap.ts'
import describeGroupOrder from './rules/describe-group-order.ts'
import describeTitlePattern from './rules/describe-title-pattern.ts'
import importGroupOrder from './rules/import-group-order.ts'
import maxCommentLength from './rules/max-comment-length/max-comment-length.ts'
import maxDestructuredParameters from './rules/max-destructured-parameters/max-destructured-parameters.ts'
import maxSingleLineStatementLength from './rules/max-single-line-statement-length.ts'
import noBlankLineInObject from './rules/no-blank-line-in-object.ts'
import noEmoji from './rules/no-emoji.ts'
import noIdOnlyMutationScope from './rules/no-id-only-mutation-scope.ts'
import noIgnoredTests from './rules/no-ignored-tests.ts'
import noInlineRegex from './rules/no-inline-regex.ts'
import noNullableUniqueColumn from './rules/no-nullable-unique-column.ts'
import noRestrictedCharacters from './rules/no-restricted-characters.ts'
import noSingleLineNestedObject from './rules/no-single-line-nested-object.ts'
import noTestBeforeGroup from './rules/no-test-before-group.ts'
import noTryCatchHandler from './rules/no-try-catch-handler.ts'
import noUnionInParameterType from './rules/no-union-in-parameter-type.ts'
import objectCommentsTrailing from './rules/object-comments-trailing.ts'
import regexConstStyle from './rules/regex-const-style.ts'
import requireFileCalls from './rules/require-file-calls.ts'
import requireForeignKeyIndex from './rules/require-foreign-key-index.ts'
import testArrangeActAssert from './rules/test-arrange-act-assert.ts'
import type { ESLint, Linter } from 'eslint'

// Rules that report and never rewrite.
// A violation here needs the user or an agent to decide what the text should say.
const reporting = {
  'comment-content': commentContent,
  'describe-group-order': describeGroupOrder,
  'describe-title-pattern': describeTitlePattern,
  'max-comment-length': maxCommentLength,
  'max-destructured-parameters': maxDestructuredParameters,
  'no-emoji': noEmoji,
  'no-id-only-mutation-scope': noIdOnlyMutationScope,
  'no-ignored-tests': noIgnoredTests,
  'no-inline-regex': noInlineRegex,
  'no-nullable-unique-column': noNullableUniqueColumn,
  'no-single-line-nested-object': noSingleLineNestedObject,
  'no-test-before-group': noTestBeforeGroup,
  'no-try-catch-handler': noTryCatchHandler,
  'no-union-in-parameter-type': noUnionInParameterType,
  'object-comments-trailing': objectCommentsTrailing,
  'regex-const-style': regexConstStyle,
  'require-file-calls': requireFileCalls,
  'require-foreign-key-index': requireForeignKeyIndex,
  'test-arrange-act-assert': testArrangeActAssert,
}

// Rules that rewrite under --fix.
// A violation here moves text, or swaps one character for the spelling a project asked for.
const fixable = {
  'array-bracket-hug': arrayBracketHug,
  'blank-line-after-block': blankLineAfterBlock,
  'comment-wrap': commentWrap,
  'import-group-order': importGroupOrder,
  'max-single-line-statement-length': maxSingleLineStatementLength,
  'no-blank-line-in-object': noBlankLineInObject,
  'no-restricted-characters': noRestrictedCharacters,
}

const rules = {
  ...reporting,
  ...fixable,
}

/** The plugin object, holding every rule the package registers. */
export const plugin: ESLint.Plugin = {
  meta: {
    name: 'looks-good',
    version: denoConfig.version,
  },
  rules,
}

// Rules that record deferred work rather than a defect, so they do not break a build.
const warnings = {
  'looks-good/no-ignored-tests': 'warn',
} as const

// Rules that report a defect, where the fix is to change the code.
const errors = {
  'looks-good/array-bracket-hug': 'error',
  'looks-good/blank-line-after-block': 'error',
  'looks-good/describe-group-order': 'error',
  'looks-good/max-comment-length': 'error',
  'looks-good/max-destructured-parameters': 'error',
  'looks-good/max-single-line-statement-length': 'error',
  'looks-good/no-blank-line-in-object': 'error',
  'looks-good/no-single-line-nested-object': 'error',
  'looks-good/no-test-before-group': 'error',
  'looks-good/object-comments-trailing': 'error',
  'looks-good/regex-const-style': 'error',
} as const

/** The house style, spread into a flat config so every rule reads as looks-good/<name>. */
export const recommended: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    ...warnings,
    ...errors,
  },
}

/** The rules that parse the text inside a file rather than reading estree nodes alone. */
export const parsing: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    'looks-good/comment-content': 'warn',
    'looks-good/comment-wrap': 'error',
    'looks-good/describe-title-pattern': 'error',
    'looks-good/no-emoji': 'error',
    'looks-good/no-id-only-mutation-scope': 'error',
    'looks-good/no-nullable-unique-column': 'error',
    'looks-good/no-restricted-characters': 'error',
    'looks-good/require-file-calls': 'error',
    'looks-good/test-arrange-act-assert': 'error',
  },
}

/** The rules that read TypeScript syntax nodes, spread inside a block that sets a TypeScript parser. */
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
