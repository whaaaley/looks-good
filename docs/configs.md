# Configs

The plugin ships two configs on `looksGood.configs`.
Some rules are in none of them and are enabled by hand.

`recommended` is this project's house style, offered as an example of one set of choices rather than a baseline to adopt.
Read it, take the parts you agree with, and leave the rest.

```js
looksGood.configs.recommended,
looksGood.configs.parsing,
```

Most rules in `recommended` are enabled at `error`.
`no-ignored-tests` is enabled at `warn`, because a skipped test records deferred work rather than a defect.
A note about work still to do should not break a build.
`comment-content` in `parsing` is a `warn` for the same reason, since forbidden comment text is a cleanup note rather than broken code.

## parsing

`comment-content`, `comment-wrap`, `describe-title-pattern`, `no-emoji`, `no-id-only-mutation-scope`, `no-nullable-unique-column`, `no-restricted-characters`, `require-file-calls`, and `test-arrange-act-assert` read the text inside a file rather than estree nodes alone.
Finding where one sentence ends and the next begins takes `parse-english` and `nlcst-to-string`, telling a trailing code span from an unfinished line takes `mdast-util-from-markdown`, and matching a path pattern takes `minimatch`.
`no-id-only-mutation-scope` and `no-nullable-unique-column` are here for `minimatch` alone, since each one matches the linted path against a glob before it reads anything.
Both are inert until you give them one.
`no-id-only-mutation-scope` checks no file until its `patterns` list names one, and `no-nullable-unique-column` reads only the paths its `files` glob matches, which defaults to `**/*.tables.ts`.

These rules work the moment you enable them, so this config is about what the plugin costs rather than what it can do.
Installing from JSR pulls those four packages in for you, and taking `recommended` alone leaves them out.
Skip `parsing` if you would rather your linter dependencies stay at `eslint` and nothing else.

`comment-wrap` reports every wrapped sentence and `--fix` joins the two lines back into one.

## Rules No Config Enables

`no-try-catch-handler` is off because it points at a result helper your project has to have written first.
Its setup is in [Result Helper](result-helper.md).

`require-foreign-key-index` is off because it reads Drizzle table calls, which a project not using Drizzle never writes.
Enable it with a `files` glob naming your schema files.

```js
'looks-good/require-foreign-key-index': ['error', { files: '**/*.tables.ts' }],
```

`import-group-order` is off because a project already running `import-x/order` would see the same import reported twice.
Turn that rule off, then enable this one with the same options.

```js
'looks-good/import-group-order': ['error', {
  newlinesBetween: 'never',
  alphabetize: { order: 'asc', caseInsensitive: true, orderImportKind: 'asc' },
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
}],
```

`no-inline-regex` is off because a project that has never hoisted its patterns would see every inline match and replace reported at once, and each report needs the user to pick the name.
Enable it once the codebase is ready to hoist, and pass `position: 'top'` to additionally require the patterns be grouped at the head of the file.

```js
'looks-good/no-inline-regex': ['error', { position: 'top' }],
```

## Every Rule Listed Out

This is what `recommended` and `parsing` enable together, with example options filled in where a rule checks nothing until a project supplies its own.
The configs pass no options themselves, so spreading them runs every rule on its documented defaults instead.
Copy it and cut what your project does not want.

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import looksGood from '@whaaaley/looks-good'

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: { 'looks-good': looksGood },
    rules: {
      'looks-good/array-bracket-hug': 'error',
      'looks-good/blank-line-after-block': 'error',
      'looks-good/comment-content': ['warn', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks', ignoreCase: true },
        ],
        forbidBlockComments: true,
      }],
      'looks-good/comment-wrap': 'error',
      'looks-good/describe-group-order': ['error', {
        sequence: ['create', 'read', 'update', 'list', '*', 'delete'],
      }],
      'looks-good/describe-title-pattern': ['error', {
        patterns: [
          { files: '**/*.test.ts', title: 'All * Tests' },
        ],
      }],
      'looks-good/max-comment-length': ['error', { maxLength: 120 }],
      'looks-good/max-destructured-parameters': ['error', { max: 0 }],
      'looks-good/max-single-line-statement-length': ['error', { maxLength: 80 }],
      'looks-good/no-blank-line-in-object': 'error',
      'looks-good/no-emoji': 'error',
      'looks-good/no-id-only-mutation-scope': ['error', {
        patterns: [
          { files: '**/*.queries.ts', tenantColumns: ['collectiveId'] },
        ],
      }],
      'looks-good/no-ignored-tests': 'warn',
      'looks-good/no-nullable-unique-column': ['error', { files: '**/*.tables.ts', allowSingleColumn: true }],
      'looks-good/no-restricted-characters': ['error', {
        restrict: [
          { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
        ],
      }],
      'looks-good/no-single-line-nested-object': 'error',
      'looks-good/no-test-before-group': 'error',
      'looks-good/object-comments-trailing': 'error',
      'looks-good/regex-const-style': ['error', { suffix: 'Pattern', requireComment: true }],
      'looks-good/require-file-calls': ['error', {
        patterns: [
          { id: 'router-registers', files: '*.router.ts', require: [{ call: 'router' }], message: 'A router file builds its router with router().' },
        ],
      }],
      'looks-good/test-arrange-act-assert': 'error',
    },
  },
])
```

## Related Docs

- [Rules](rules.md) - what each rule reports and the options it takes
- [Result Helper](result-helper.md) - enabling `no-try-catch-handler`
- [ESLint Rule Set](eslint-rules.md) - the third-party rules shipped alongside the plugin
