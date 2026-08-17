# Configs

The plugin ships three configs on `looksGood.configs`.
Two rules are in none of them and are enabled by hand.

`recommended` is this project's house style, offered as an example of one set of choices rather than a baseline to adopt.
Read it, take the parts you agree with, and leave the rest.

```js
looksGood.configs.recommended,
looksGood.configs.parsing,
```

Most rules in `recommended` are enabled at `error`.
`no-ignored-tests` is enabled at `warn`, because a skipped test records deferred work rather than a defect.
A note about work still to do should not break a build.

## parsing

`comment-content`, `comment-one-sentence-per-line`, `describe-title-pattern`, `no-emoji`, `no-restricted-characters`, `require-file-calls`, and `test-arrange-act-assert` read the text inside a file rather than estree nodes alone.
Finding where one sentence ends and the next begins takes `parse-english` and `nlcst-to-string`, telling a trailing code span from an unfinished line takes `mdast-util-from-markdown`, and matching a path pattern takes `minimatch`.

These rules work the moment you enable them, so this config is about what the plugin costs rather than what it can do.
Installing from JSR pulls those four packages in for you, and taking `recommended` alone leaves them out.
Skip `parsing` if you would rather your linter dependencies stay at `eslint` and nothing else.

`comment-reflow` rewrites the wrapped sentence that `comment-one-sentence-per-line` only reports.
Both report the same wrap, so `parsing` enables the reporting one and leaves the fixer off.
Turn one off and the other on to rewrite under `--fix` instead.

```js
looksGood.configs.parsing,
{
  rules: {
    'looks-good/comment-one-sentence-per-line': 0,
    'looks-good/comment-reflow': 'error',
  },
}
```

## typescript

`no-union-in-parameter-type` reads a node the default `espree` parser never produces, so it cannot fire on plain JavaScript.
It lives in the `typescript` config rather than in `recommended`, so a JavaScript only project is never handed a rule that silently does nothing.

The config sets no parser of its own, since doing so would override the parser you chose.
Spread it inside a config block where you have already set `@typescript-eslint/parser`.

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import looksGood from '@whaaaley/looks-good'

export default defineConfig([
  looksGood.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    ...looksGood.configs.typescript,
  },
])
```

## Rules No Config Enables

`comment-reflow` is off because it rewrites what `comment-one-sentence-per-line` reports, and enabling both reports the same wrapped sentence twice.

`no-try-catch-handler` is off because it points at a result helper your project has to have written first.
Its setup is in [Result Helper](result-helper.md).

## Every Rule Listed Out

This is what `recommended` and `parsing` enable together, written out with their options.
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
      'looks-good/blank-line-after-block': 'error',
      'looks-good/comment-content': ['error', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks', ignoreCase: true },
        ],
        forbidBlockComments: true,
      }],
      // Swap this for 'looks-good/comment-reflow' to have --fix join a wrapped sentence.
      'looks-good/comment-one-sentence-per-line': 'error',
      'looks-good/describe-group-order': ['error', {
        sequence: ['create', 'read', 'update', 'list', '*', 'delete'],
      }],
      'looks-good/describe-title-pattern': ['error', {
        patterns: [
          { files: '**/*.test.ts', title: 'All * Tests' },
        ],
      }],
      'looks-good/max-destructured-parameters': ['error', { max: 0 }],
      'looks-good/max-single-line-statement-length': ['error', { maxLength: 80 }],
      'looks-good/no-emoji': 'error',
      'looks-good/no-ignored-tests': 'warn',
      'looks-good/no-single-line-nested-object': 'error',
      'looks-good/object-comments-trailing': 'error',
      'looks-good/no-restricted-characters': ['error', {
        restrict: [
          { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
        ],
      }],
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

- [Rules](rules.md) -- what each rule reports and the options it takes
- [Result Helper](result-helper.md) -- enabling `no-try-catch-handler`
- [ESLint Rule Set](eslint-rules.md) -- the third-party rules shipped alongside the plugin
