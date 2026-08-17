# looks-good

ESLint rules for conventions nothing else enforces.

## Docs

- [Rules](https://github.com/whaaaley/looks-good/blob/main/docs/rules.md) - every rule, its options, and examples of what it reports
- [Configs](https://github.com/whaaaley/looks-good/blob/main/docs/configs.md) - what each of the three configs enables, what it costs to install, and the two rules none of them turn on
- [Result Helper](https://github.com/whaaaley/looks-good/blob/main/docs/result-helper.md) - the `safe` and `safeAsync` source, and enabling `no-try-catch-handler` against it
- [ESLint Rule Set](https://github.com/whaaaley/looks-good/blob/main/docs/eslint-rules.md) - the curated eslint, import, and typescript-eslint rules shipped as `./eslint-rules`
- [Tools](https://github.com/whaaaley/looks-good/blob/main/docs/tools.md) - the git hooks and the repo-local tooling this repository is developed with, which the published plugin does not include

## Install

```sh
deno add jsr:@whaaaley/looks-good npm:eslint
```

It exports the plugin from `.` and the separate eslint rule set from `./eslint-rules`.

The plugin is consumed through a flat config.
It is developed and tested against ESLint 10.8.1, and no earlier version has been tested.
Legacy `.eslintrc` is not supported.

## Usage

List the rules you want and set the options that suit your project.
Every rule reads as `looks-good/<name>`.

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import looksGood from '@whaaaley/looks-good'

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: { 'looks-good': looksGood },
    rules: {
      'looks-good/no-emoji': 'error',
      'looks-good/test-arrange-act-assert': 'error',
    },
  },
])
```

The plugin also ships three configs.

| Config | What it enables | What it costs |
| --- | --- | --- |
| `recommended` | the rules that need nothing beyond eslint | nothing |
| `parsing` | the rules that read the text inside a file | parse-english, nlcst-to-string, mdast-util-from-markdown, and minimatch |
| `typescript` | the rules that read TypeScript syntax nodes | a TypeScript parser you set yourself |

```js
looksGood.configs.recommended,
looksGood.configs.parsing,
looksGood.configs.typescript,
```

Two rules are in no config. `comment-reflow` reports the same wrap as `comment-one-sentence-per-line`, so a project turns one off to use the other. `no-try-catch-handler` names a result helper you write first.

## Rules

The rules are written to the ESLint rule interface, and ESLint is the host they are developed and tested against.

| Rule | Description | Config | Fixable |
| --- | --- | --- | --- |
| [blank-line-after-block](docs/rules.md#blank-line-after-block) | Separates a closing brace from the statement that follows it | recommended | yes |
| [comment-content](docs/rules.md#comment-content) | Forbids comment text a project does not want left in source | parsing | |
| [comment-one-sentence-per-line](docs/rules.md#comment-one-sentence-per-line) | A comment sentence fits on one line and a line holds one sentence | parsing | |
| [comment-reflow](docs/rules.md#comment-reflow) | Joins a comment sentence that wraps onto the next line | opt in | yes |
| [describe-group-order](docs/rules.md#describe-group-order) | Requires sibling describe groups to appear in a configured order | recommended | |
| [describe-title-pattern](docs/rules.md#describe-title-pattern) | Requires a test file to name its subject in a top level describe title | parsing | |
| [max-destructured-parameters](docs/rules.md#max-destructured-parameters) | Limits how many bindings a function parameter may destructure | recommended | |
| [max-single-line-statement-length](docs/rules.md#max-single-line-statement-length) | Keeps a single line if body on one line only while that line stays short | recommended | yes |
| [no-blank-line-in-object](docs/rules.md#no-blank-line-in-object) | Keeps a blank line out from between the properties of an object literal | recommended | yes |
| [no-emoji](docs/rules.md#no-emoji) | Reports emoji in code, comments, and identifiers | parsing | |
| [no-ignored-tests](docs/rules.md#no-ignored-tests) | Reports a skipped or ignored test | recommended | |
| [no-restricted-characters](docs/rules.md#no-restricted-characters) | Reports characters a project does not want in source | parsing | |
| [no-single-line-nested-object](docs/rules.md#no-single-line-nested-object) | Keeps a nested object out of a call or construction argument written on one line | recommended | |
| [no-test-before-group](docs/rules.md#no-test-before-group) | Reports a test written above the first group in the same body | recommended | |
| [no-try-catch-handler](docs/rules.md#no-try-catch-handler) | Reports a try statement with a catch clause in favour of a result helper | opt in | |
| [no-union-in-parameter-type](docs/rules.md#no-union-in-parameter-type) | Forbids an inline union type in a function parameter annotation | typescript | |
| [object-comments-trailing](docs/rules.md#object-comments-trailing) | Keeps a comment inside an object literal on the line it describes | recommended | |
| [require-file-calls](docs/rules.md#require-file-calls) | Requires a file to contain the calls its path or contents call for | parsing | |
| [test-arrange-act-assert](docs/rules.md#test-arrange-act-assert) | Requires test bodies to be labelled with Arrange, Act, and Assert comments | parsing | |

The Config column says which config enables each rule, and `opt in` means none of them does.
