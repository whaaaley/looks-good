# looks-good

ESLint rules for conventions nothing else enforces.

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

| Rule | Description | Fixable |
| --- | --- | --- |
| [comment-content](#comment-content) | Reports comments matching a pattern you configure | |
| [comment-one-sentence-per-line](#comment-one-sentence-per-line) | Reports a comment sentence that wraps, a line with two sentences, or a comment past a length | |
| [comment-reflow](#comment-reflow) | Joins a comment sentence that wraps, and splits a line with two sentences | yes |
| [no-optional-chain-on-index](#no-optional-chain-on-index) | Reports `?.` used on an indexed access | |

`comment-reflow` and `comment-one-sentence-per-line` catch the same problems.
The first rewrites, the second reports.
Enable one or the other.

### comment-content

Reports comments matching a pattern you configure.

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

| Option | Default | Description |
| --- | --- | --- |
| `forbid` | `[]` | A list of `{ pattern, message }`. `pattern` is a regex source string matched against the comment text, `message` is reported when it matches. |
| `forbidBlockComments` | `false` | Reports any `/* */` comment. |

### comment-one-sentence-per-line

Reports a comment sentence that wraps to the next line, a line holding two sentences, and a comment past `maxLength`.

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

| Option | Default | Description |
| --- | --- | --- |
| `maxLength` | `120` | The longest a comment may run. |
| `allowUrls` | `true` | Exempts a line ending in a url. |
| `allowIdentifiers` | `true` | Exempts a line ending in a symbol such as `` `comment.utils` `` or `discord.js`. |
| `allowLabels` | `['Arrange', 'Act', 'Assert']` | Words that mark a comment as a label rather than prose. |

### comment-reflow

Joins a comment sentence that wraps to the next line, and splits a line holding two sentences.

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

| Option | Default | Description |
| --- | --- | --- |
| `allowUrls` | `true` | Exempts a line ending in a url. |
| `allowIdentifiers` | `true` | Exempts a line ending in a symbol. |
| `allowLabels` | `['Arrange', 'Act', 'Assert']` | Words that mark a comment as a label rather than prose. |

### no-optional-chain-on-index

Reports `?.` used on an indexed access, such as `items[0]?.name`.

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

## License

MIT
