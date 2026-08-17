# looks-good

ESLint rules for conventions nothing else enforces.

## Install

```sh
deno add npm:eslint jsr:@whaaaley/looks-good
```

Requires ESLint 9 or later, and flat config.
Legacy `.eslintrc` is not supported.

## Usage

The plugin ships two configs, and they differ only in which comment wrapping rule they enable.

| Config | Comment wrapping rule | Rewrites on `--fix` |
| --- | --- | --- |
| `recommended` | `comment-one-sentence-per-line` | no |
| `fixing` | `comment-reflow` | yes |

Every other rule is enabled in both.
Pick `fixing` when you want `--fix` to join a wrapped sentence for you.

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import looksGood from '@whaaaley/looks-good'

export default defineConfig([
  looksGood.configs.recommended,
  {
    files: ['**/*.ts'],
  },
])
```

Configure a rule by listing it yourself instead.

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
      // Swap this for 'looks-good/comment-reflow' to have --fix join a wrapped sentence.
      'looks-good/comment-one-sentence-per-line': 'error',
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
| [describe-group-order](#describe-group-order) | Requires sibling describe groups to appear in a configured order | |
| [describe-title-pattern](#describe-title-pattern) | Requires a test file to name its subject in a top level describe title | |
| [no-emoji](#no-emoji) | Reports emoji in code, comments, and identifiers | |
| [no-optional-chain-on-index](#no-optional-chain-on-index) | Forbids optional chaining on an indexed access | |
| [no-restricted-characters](#no-restricted-characters) | Reports characters a project does not want in source | |
| [test-arrange-act-assert](#test-arrange-act-assert) | Requires test bodies to be labelled with Arrange, Act, and Assert comments | |

`comment-reflow` and `comment-one-sentence-per-line` both catch a sentence that wraps onto the next line.
The first rewrites, the second reports.
Enable one or the other, never both, since both enabled report the same wrapped sentence twice.
`recommended` enables `comment-one-sentence-per-line` and `fixing` enables `comment-reflow`.

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

### describe-group-order

Requires sibling `describe` groups to appear in the order `sequence` lists.
Only groups that share a parent are compared, so two groups in different parents are never held against each other.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/describe-group-order: ["error", { sequence: ["create", "read", "update", "list", "*", "delete"] }] */

describe('All Task Tests', () => {
  describe('create', () => {})
  describe('delete', () => {})
  describe('list', () => {})
})
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/describe-group-order: ["error", { sequence: ["create", "read", "update", "list", "*", "delete"] }] */

describe('All Task Tests', () => {
  describe('create', () => {})
  describe('read', () => {})
  describe('update', () => {})
  describe('list', () => {})
  describe('archive', () => {})
  describe('delete', () => {})
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `sequence` | `[]` | The group names in the order they must appear. The entry `*` is a wildcard slot matching any group named nowhere else in the sequence. An empty sequence checks nothing. |
| `match` | `'word'` | How a title matches a name. `word` counts a whole word anywhere in the title, so `soft delete and restore` is a `delete` group. `exact` requires the title to equal the name. |
| `ignoreCase` | `true` | Matches a name regardless of case. |
| `requireAll` | `false` | Reports every non wildcard name in `sequence` that no group covers. A set of groups where no name matches at all is treated as wrappers and is left alone. |
| `testFunctions` | `['describe']` | The calls that declare a group. A call written as `describe.only` or `describe.skip` counts as its base name. |
| `depth` | `'any'` | `any` checks every set of sibling groups in the file. `top` checks only the groups that are not nested inside another group. |

A group whose title matches no name occupies the wildcard slot when the sequence has one, and is otherwise unconstrained.

### describe-title-pattern

Requires the top level `describe` in a test file to be titled by a pattern chosen from the file's path.
The first `patterns` entry whose `files` glob matches the file wins, and a file matching no entry is not checked.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/describe-title-pattern: ["error", { patterns: [{ files: "**/*.queries.test.ts", title: "All * Tests" }] }] */

// event.queries.test.ts
describe('Event Tests', () => {
  it('creates an event', () => {})
})
```

```js
/* eslint looks-good/describe-title-pattern: ["error", { patterns: [{ files: "**/*.queries.test.ts", title: "All * Tests" }] }] */

// event.queries.test.ts, which names nothing at all.
it('creates an event', () => {})
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/describe-title-pattern: ["error", { patterns: [{ files: "**/*.queries.test.ts", title: "All * Tests" }] }] */

// event.queries.test.ts
describe('All Event Tests', () => {
  describe('create', () => {
    it('creates an event', () => {})
  })
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `patterns` | `[]` | A list of `{ files, title, message }`. `files` is a glob matched against the linted file's path, `title` is the pattern its top level describe must match, and `message` is optional prose appended to the report. The first entry whose glob matches wins. |
| `testFunctions` | `['describe']` | The calls that count as a describe. A call written as `describe.only` or `describe.skip` counts as its base name. |
| `allowTitles` | `[]` | Regex source strings. A top level describe whose title matches any of them is exempt. |

A `title` is literal apart from `*`, which stands for any run of characters, and the whole string is anchored.
So `All * Tests` matches `All Event Tests` and not `Event Tests`, and every other character matches itself rather than as regex.
Only the outermost describe is checked, so a nested one carries no title requirement of its own.

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
