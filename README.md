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
      'looks-good/no-emoji': 'error',
      'looks-good/no-optional-chain-on-index': 'error',
      'looks-good/no-restricted-characters': ['error', {
        restrict: [
          { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
        ],
      }],
    },
  },
])
```

## Rules

| Rule | Description | Fixable |
| --- | --- | --- |
| [comment-content](#comment-content) | Forbids comment text a project does not want left in source | |
| [comment-one-sentence-per-line](#comment-one-sentence-per-line) | A comment sentence fits on one line and a line holds one sentence | |
| [comment-reflow](#comment-reflow) | Joins a comment sentence that wraps onto the next line | yes |
| [no-emoji](#no-emoji) | Reports emoji in code, comments, and identifiers | |
| [no-optional-chain-on-index](#no-optional-chain-on-index) | Forbids optional chaining on an indexed access | |
| [no-restricted-characters](#no-restricted-characters) | Reports characters a project does not want in source | |
| [test-arrange-act-assert](#test-arrange-act-assert) | Requires test bodies to be labelled with Arrange, Act, and Assert comments | |

`comment-reflow` and `comment-one-sentence-per-line` both catch a sentence that wraps onto the next line.
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

Reports a comment sentence that wraps to the next line, and a comment past `maxLength`.

Examples of **incorrect** code for this rule:

```js
// This sentence continues
// onto the next line.
const a = 1
```

Examples of **correct** code for this rule:

```js
// This sentence fits on one line.
const a = 1
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `maxLength` | `120` | The longest a comment may run. |
| `allowUrls` | `true` | Exempts a line ending in a url. |
| `allowIdentifiers` | `true` | Exempts a line ending in a symbol such as `` `comment.utils` `` or `discord.js`. |
| `allowLabels` | `['Arrange', 'Act', 'Assert']` | Words that mark a comment as a label rather than prose. |

### comment-reflow

Joins a comment sentence that wraps onto the next line.

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
| `maxLength` | `120` | The longest a joined comment may run. Two lines that would join past it are reported without a fix. |
| `allowUrls` | `true` | Exempts a line ending in a url. |
| `allowIdentifiers` | `true` | Exempts a line ending in a symbol. |
| `allowLabels` | `['Arrange', 'Act', 'Assert']` | Words that mark a comment as a label rather than prose. |

### no-emoji

Reports emoji in code, comments, and identifiers.

Examples of **incorrect** code for this rule:

```js
const status = 'Done 🎉'

// Ship it 🚀
const ship = true
```

Examples of **correct** code for this rule:

```js
const status = 'Done'

// Ship it.
const ship = true
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `allow` | `[]` | Emoji that are permitted anywhere. |
| `strings` | `true` | Reports emoji in string literals and template strings. |
| `comments` | `true` | Reports emoji in comments. |
| `identifiers` | `true` | Reports emoji in identifiers. |

A skin tone modifier, a zero width joiner run, and a regional indicator pair each count as one emoji, so `allow` takes the whole sequence.

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

### no-restricted-characters

Reports characters a project does not want in source.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/no-restricted-characters: ["error", { restrict: [{ chars: "—–", message: "Start a new sentence rather than joining clauses with a dash." }] }] */

// The parser reads the header — then the body.
const parsed = parse(input)
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/no-restricted-characters: ["error", { restrict: [{ chars: "—–", message: "Start a new sentence rather than joining clauses with a dash." }] }] */

// The parser reads the header.
// Then it reads the body.
const parsed = parse(input)
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `restrict` | `[]` | A list of `{ chars, message }`. Every character in `chars` is matched literally, and `message` is reported alongside the character found. |
| `allow` | `[]` | Characters that are permitted anywhere, even when a restriction lists them. |
| `strings` | `true` | Reports restricted characters in string literals and template strings. |
| `comments` | `true` | Reports restricted characters in comments. |
| `identifiers` | `true` | Reports restricted characters in identifiers. |

### test-arrange-act-assert

Requires every test body to be labelled with `// Arrange`, `// Act`, and `// Assert` comments.
Act and Assert are required, Arrange is optional, and the labels that are present must appear in that order.

Examples of **incorrect** code for this rule:

```js
it('adds two numbers', () => {
  const total = add(1, 2)
  assertEquals(total, 3)
})

it('adds two numbers', () => {
  // Assert
  const expected = 3

  // Act
  assertEquals(add(1, 2), expected)
})
```

Examples of **correct** code for this rule:

```js
it('adds two numbers', () => {
  // Arrange
  const a = 1
  const b = 2

  // Act
  const total = add(a, b)

  // Assert
  assertEquals(total, 3)
})

it('adds two numbers', () => {
  // Act
  const total = add(1, 2)

  // Assert
  assertEquals(total, 3)
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `require` | `['Act', 'Assert']` | The labels a test body must carry. |
| `order` | `['Arrange', 'Act', 'Assert']` | The order the labels that are present must appear in. |
| `testFunctions` | `['it', 'test']` | The calls whose last function argument is a test body. A call written as `it.only` or `test.skip` counts as its base name. |
| `allowTitles` | `[]` | Regex source strings. A test whose title matches any of them is exempt. |
| `minStatements` | `2` | A body with fewer statements than this is exempt, since a one line test needs no structure. |

Only a line comment whose whole text is a label counts, so prose such as `// Act on the parsed input.` is left alone.

## License

MIT
