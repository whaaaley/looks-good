# looks-good

ESLint rules for conventions nothing else enforces.

A personal collection rather than a themed product.
Each rule exists because no established plugin covers it and the convention kept drifting without one.

## Install

```sh
deno add npm:eslint jsr:@whaaaley/looks-good
```

Requires ESLint 9 or later, and flat config.
Legacy `.eslintrc` is not supported.

## Usage

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import looksGood from '@whaaaley/looks-good'

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: { 'looks-good': looksGood },
    rules: {
      'looks-good/comment-content': ['error', {
        forbid: [
          { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks' },
        ],
        forbidBlockComments: true,
      }],
      'looks-good/comment-one-sentence-per-line': 'error',
      'looks-good/comment-reflow': 'error',
      'looks-good/no-optional-chain-on-index': 'error',
    },
  },
])
```

## Rules

🔧 Automatically fixable by the `--fix` CLI option.

| Rule | Description | 🔧 |
| --- | --- | :-: |
| [comment-content](#comment-content) | Forbids comment text a project does not want left in source | |
| [comment-one-sentence-per-line](#comment-one-sentence-per-line) | A comment sentence fits on one line and a line holds one sentence | |
| [comment-reflow](#comment-reflow) | Joins a wrapped comment sentence and splits a line holding two | 🔧 |
| [no-optional-chain-on-index](#no-optional-chain-on-index) | Forbids optional chaining on an indexed access | |

The comment rules divide by whether a fix is mechanical.
`comment-reflow` moves text without changing what it says, so it rewrites.
`comment-one-sentence-per-line` reports the same problems and leaves the wording to a person.
Enable one or the other depending on whether you want the fix applied for you.

### comment-content

Forbids comment text a project does not want left in source.
Markers, references to a tracker, and block comments are all the same operation with a different pattern, so they are one rule rather than three.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/comment-content: ["error", { forbid: [{ pattern: "\\bTODO\\b", message: "do the work or record it elsewhere" }] }] */

// TODO: handle the empty case
const first = items.at(0)
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/comment-content: ["error", { forbid: [{ pattern: "\\bTODO\\b", message: "do the work or record it elsewhere" }] }] */

// An empty list yields nothing, which the caller already handles.
const first = items.at(0)
```

#### Options

`forbid` is a list of `{ pattern, message }` objects.
Each `pattern` is a regular expression source string, matched against the comment's text.
Each `message` is reported verbatim when the pattern matches, so it should say what to do instead.

`forbidBlockComments` reports any `/* */` comment when true.
It defaults to false.

#### When not to use it

A codebase that tracks deferred work in comments deliberately, rather than in a tracker, should leave the marker patterns unconfigured.

### comment-one-sentence-per-line

A comment sentence fits on one line and a line holds one sentence.

A sentence folded across two lines hides its second half from a reader scanning the file.
A line holding two sentences hides the second behind the first.
This rule reports both, and never rewrites, because deciding what a sentence should say is not mechanical.

Examples of **incorrect** code for this rule:

```js
// This sentence continues
// onto the next line.
const a = 1

// First sentence. Second sentence.
const b = 2
```

Examples of **correct** code for this rule:

```js
// This sentence fits on one line.
const a = 1

// First sentence.
// Second sentence.
const b = 2
```

#### Options

`maxLength` is the longest a comment may run before it is reported, defaulting to 120.

`allowUrls` exempts a line ending in a url, since a url has no natural break.
`allowIdentifiers` exempts a line ending in a symbol such as `` `comment.utils` `` or `discord.js`, which reads as finished.
Both default to true.

`allowLabels` is a list of words that mark a comment as a label rather than prose.
It defaults to `['Arrange', 'Act', 'Assert']`.

### comment-reflow

Joins a wrapped comment sentence and splits a line holding two.

This is the fixing counterpart to `comment-one-sentence-per-line`.
Both transformations move text without rewriting it, so both are safe to apply.

Examples of **incorrect** code for this rule:

```js
// This sentence continues
// onto the next line.
const a = 1
```

Examples of **correct** code for this rule:

```js
// This sentence continues onto the next line.
const a = 1
```

#### Options

`allowUrls`, `allowIdentifiers`, and `allowLabels` behave as they do in `comment-one-sentence-per-line`.

There is no `maxLength`, because a sentence that is merely long cannot be shortened without changing what it says.

#### When not to use it

Enable this or `comment-one-sentence-per-line`, not both.
Running both reports every violation twice.

### no-optional-chain-on-index

Forbids optional chaining on an indexed access.

Under `noUncheckedIndexedAccess`, `items[0]` is typed as possibly undefined, which is the type system asking you to decide what an empty list means.
Writing `items[0]?.name` silences that question without answering it, and the undefined flows onward unnamed.
It also conflates two different absences: an empty list, and a present element with a missing property.

Examples of **incorrect** code for this rule:

```js
const name = items[0]?.name
const trimmed = lines[index]?.trim()
handlers[event]?.()
```

Examples of **correct** code for this rule:

```js
const [first] = items
if (!first) return ''

const name = first.name
```

#### When not to use it

A codebase without `noUncheckedIndexedAccess` gets no warning from the type system either way, so this rule is the only thing asking the question.
That is an argument for enabling it, but it will report more often.

## License

MIT
