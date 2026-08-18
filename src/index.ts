/**
 * An eslint plugin of rules for comment text, test structure, and statement shape.
 *
 * The plugin object is exported as {@link plugin} and as the default export.
 * Three flat configs are exported for spreading into a consumer config:
 * {@link recommended}, {@link parsing}, and {@link typescript}. The same three
 * are reachable as `plugin.configs`.
 *
 * Some registered rules are enabled by no config.
 * `no-try-catch-handler` is off because it names a result helper the consumer
 * has to have written first, and enabled without one it would tell a project to
 * call a function that does not exist there. Write the helper, then enable the
 * rule with the module path it lives at. `require-foreign-key-index` is off
 * because it reads Drizzle table calls, which a project that does not use
 * Drizzle never writes. Enable it with a `files` glob pointing at the schema
 * files, such as `**\/*.tables.ts`. `import-group-order` is off because a
 * project already running `import-x/order` would get the same import reported
 * twice. Turn that rule off, then enable this one with the same options.
 * `no-inline-regex` is off because a project that has never hoisted its patterns
 * would see every inline match and replace reported at once, and each one needs
 * a person to pick the name. Enable it once the codebase is ready to hoist, and
 * pass `{ position: 'top' }` to additionally require the patterns be grouped at
 * the head of the file rather than scattered through it.
 *
 * `comment-wrap` reports a sentence that wraps onto the next comment line. Pass
 * `{ onWrap: 'join' }` to have `--fix` join the two lines instead of reporting
 * them.
 *
 * @module
 */

import denoConfig from '../deno.json' with { type: 'json' }
import blankLineAfterBlock from './rules/blank-line-after-block.ts'
import commentContent from './rules/comment-content.ts'
import commentWrap from './rules/comment-wrap.ts'
import describeGroupOrder from './rules/describe-group-order.ts'
import describeTitlePattern from './rules/describe-title-pattern.ts'
import importGroupOrder from './rules/import-group-order.ts'
import maxCommentLength from './rules/max-comment-length.ts'
import maxDestructuredParameters from './rules/max-destructured-parameters.ts'
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
// A violation here needs a person or an agent to decide what the text should say.
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

/**
 * The plugin object, holding every rule the package registers.
 *
 * Use this to wire rules by hand instead of spreading one of the configs, which
 * is what a project wants when it enables a rule no config turns on, such as
 * `no-inline-regex` or `no-try-catch-handler`.
 *
 * @example
 * ```js
 * import { plugin } from '@whaaaley/looks-good'
 *
 * export default [
 *   {
 *     plugins: { 'looks-good': plugin },
 *     rules: { 'looks-good/comment-wrap': ['error', { onWrap: 'join' }] },
 *   },
 * ]
 * ```
 */
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

/**
 * The house style, spread into a flat config so every rule reads as
 * `looks-good/<name>`.
 *
 * These are one project's choices rather than a cautious baseline, so turn off
 * what a project disagrees with. It holds the rules that read estree nodes
 * alone, so it costs no package beyond eslint itself.
 *
 * @example
 * ```js
 * import { recommended } from '@whaaaley/looks-good'
 *
 * export default [
 *   recommended,
 * ]
 * ```
 */
export const recommended: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    ...warnings,
    ...errors,
  },
}

/**
 * The rules that parse the text inside a file rather than reading estree nodes
 * alone.
 *
 * This costs four npm packages: sentences come from parse-english and
 * nlcst-to-string, code spans from mdast-util-from-markdown, and path patterns
 * from minimatch. Every rule here works the moment it is enabled, so this
 * config is about what the plugin costs rather than what it can do.
 *
 * @example
 * ```js
 * import { parsing, recommended } from '@whaaaley/looks-good'
 *
 * export default [
 *   recommended,
 *   parsing,
 * ]
 * ```
 */
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

/**
 * The rules that read TypeScript syntax nodes, which the default espree parser
 * never produces.
 *
 * This config sets no parser of its own, so it never overrides the one the
 * consumer chose. Spread it inside a config block that already sets
 * `@typescript-eslint/parser`.
 *
 * @example
 * ```js
 * import { typescript } from '@whaaaley/looks-good'
 * import tsParser from '@typescript-eslint/parser'
 *
 * export default [
 *   {
 *     files: ['**\/*.ts'],
 *     languageOptions: { parser: tsParser },
 *     ...typescript,
 *   },
 * ]
 * ```
 */
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
