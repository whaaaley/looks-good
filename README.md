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

Most rules are enabled at `error`.
Two are enabled at `warn`, `comment-content` and `no-ignored-tests`, because they record deferred work rather than a defect.
A marker comment and a skipped test are both notes about work still to do, so they do not break a build.

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
      'looks-good/describe-group-order': ['error', {
        sequence: ['create', 'read', 'update', 'list', '*', 'delete'],
      }],
      'looks-good/describe-title-pattern': ['error', {
        patterns: [
          { files: '**/*.test.ts', title: 'All * Tests' },
        ],
      }],
      'looks-good/max-timeout-value': ['error', { max: 5000 }],
      'looks-good/no-database-access-in-tests': 'error',
      'looks-good/no-emoji': 'error',
      'looks-good/no-ignored-tests': 'warn',
      'looks-good/no-optional-chain-on-index': 'error',
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

## The eslint rule set

`src/eslint-rules.ts` holds the eslint, import, and typescript-eslint rules this project considers correct, separately from the plugin.
Its default export has a `recommended` property, which is a list of flat configs rather than a single one, so it is spread rather than listed.

```js
// eslint.config.js
import eslintRules from '@whaaaley/looks-good/src/eslint-rules.ts'
import looksGood from '@whaaaley/looks-good'

export default [
  ...eslintRules.recommended,
  looksGood.configs.recommended,
]
```

It covers `@eslint/js` recommended, the `import-x` rules including a configured `import-x/order`, and the `typescript-eslint` strict set.
It is independent of the plugin, so a consumer can take either one alone.

## Rules

| Rule | Description | Fixable |
| --- | --- | --- |
| [comment-content](#comment-content) | Forbids comment text a project does not want left in source | |
| [comment-one-sentence-per-line](#comment-one-sentence-per-line) | A comment sentence fits on one line and a line holds one sentence | |
| [comment-reflow](#comment-reflow) | Joins a comment sentence that wraps onto the next line | yes |
| [describe-group-order](#describe-group-order) | Requires sibling describe groups to appear in a configured order | |
| [describe-title-pattern](#describe-title-pattern) | Requires a test file to name its subject in a top level describe title | |
| [max-timeout-value](#max-timeout-value) | Reports a named constant holding a number above a budget | |
| [no-database-access-in-tests](#no-database-access-in-tests) | Reports a test that queries the database directly rather than through the interface under test | |
| [no-emoji](#no-emoji) | Reports emoji in code, comments, and identifiers | |
| [no-ignored-tests](#no-ignored-tests) | Reports a skipped or ignored test | |
| [no-optional-chain-on-index](#no-optional-chain-on-index) | Forbids optional chaining on an indexed access | |
| [no-restricted-characters](#no-restricted-characters) | Reports characters a project does not want in source | |
| [require-file-calls](#require-file-calls) | Requires a file to contain the calls its path or contents call for | |
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

### max-timeout-value

Reports a named constant holding a number above a budget.
The motivating case is a spec timeout that waits out a product delay rather than asserting against it.

Examples of **incorrect** code for this rule:

```js
const TIMEOUT = 30000
let SUCCESS_TIMEOUT_MS = 15_000
```

Examples of **correct** code for this rule:

```js
const TIMEOUT = 5000
const RETRIES = 20000
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `namePattern` | `'TIMEOUT'` | A substring matched against the declared name without regard to case. |
| `max` | `5000` | The largest allowed value. The bound is inclusive, so a value equal to it passes. |
| `message` | | Optional prose appended to the report. |

Only a variable declared with an identifier name and a numeric literal initializer is checked, so a computed value is left alone.
A number written with underscore separators such as `30_000` is normalized by the parser and reads as `30000`.

### no-database-access-in-tests

Reports a test that queries the database directly rather than through the interface under test.
A test that reaches past the interface duplicates its query logic, and it keeps passing when the interface it claims to cover is broken.

ESLint core's `no-restricted-properties` can express the same match, but flat config replaces rule options rather than merging them.
A consumer who sets their own `no-restricted-properties` entries silently drops the database restriction a shipped config had set, with no error.
This rule owns its own rule id, so it cannot be clobbered that way.

Examples of **incorrect** code for this rule:

```js
it('creates a task', async () => {
  // Act
  await createTask({ title: 'Write the spec' })

  // Assert
  const rows = await db.select().from(tasks)
  assertEquals(rows.length, 1)
})
```

Examples of **correct** code for this rule:

```js
it('creates a task', async () => {
  // Act
  await createTask({ title: 'Write the spec' })

  // Assert
  const tasks = await listTasks()
  assertEquals(tasks.length, 1)
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `handles` | `['db', 'tx', 'client', 'database']` | Identifier names that hold a database connection. |
| `methods` | `['insert', 'select', 'update', 'delete']` | Query builder methods called on those handles. |
| `allow` | `[]` | Handle names exempted, for a test that legitimately must seed directly. |
| `ignoreCase` | `true` | Matches handle and method names regardless of spelling case. |
| `message` | | Replaces the default message entirely when a project wants its own wording. |

A computed access such as `db['insert']()` is not matched, since the property is an expression rather than a name.
Only the immediate object of the call is compared, so `a.b.insert()` does not match on `a`.

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

### no-ignored-tests

Reports a skipped or ignored test.
A skipped test proves nothing, and in a security suite it means a gate that does not exist.

Examples of **incorrect** code for this rule:

```js
it.ignore('rejects an outsider', () => {})
describe.skip('delete', () => {})
test.todo('rejects an unsafe scheme', () => {})
xit('rejects an outsider', () => {})
```

Examples of **correct** code for this rule:

```js
it('rejects an outsider', () => {
  // Act
  const result = call(outsider)

  // Assert
  assertForbidden(result)
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `modifiers` | `['ignore', 'skip', 'todo', 'failing']` | The member names that mark a test as not running. |
| `testFunctions` | `['it', 'test', 'describe']` | The functions these modifiers attach to. |

A bare identifier written as `x` followed by a configured test function name counts too, so `xit`, `xtest`, and `xdescribe` are reported.

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

### require-file-calls

Reports when a file does not contain the calls its path or contents require.
This replaces a structural test that asserts a file of some kind must contain some call, where the fix is always to write the missing call.
There is no call site to disable, so the rule reports at the top of the file and carries the entry `id` in the message.

An entry applies when its `files` glob matches the linted path, or always when it has no `files`.
`when.references` narrows it further to files that mention an identifier, and `when.found` narrows it to files where a named earlier entry was satisfied.
Every matcher in `require` must be satisfied and at least one in `requireAny` must be.
A `when.found` naming an entry that does not exist is reported as a configuration error rather than silently doing nothing.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/require-file-calls: ["error", { patterns: [{ id: "router-registers", files: "*.router.ts", require: [{ call: "router" }], message: "A router file builds its router with router()." }] }] */

// event.router.ts
export const eventRouter = {}
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/require-file-calls: ["error", { patterns: [{ id: "router-registers", files: "*.router.ts", require: [{ call: "router" }], message: "A router file builds its router with router()." }] }] */

// event.router.ts
export const eventRouter = router({})
```

Several requirements configured at once:

```js
{
  patterns: [
    {
      id: 'router-registers',
      files: '*.router.ts',
      require: [{ call: 'router' }],
      message: 'A router file builds its router with router().',
    },
    {
      id: 'router-guards-procedures',
      files: '*.router.ts',
      when: { found: 'router-registers' },
      requireAny: [{ identifier: 'protectedProcedure' }, { identifier: 'memberProcedure' }],
      message: 'A router exposes its procedures through a guarded builder.',
    },
    {
      id: 'schema-parses',
      files: '*.schema.ts',
      require: [{ call: '*.parse' }],
      message: 'A schema file parses its input rather than trusting it.',
    },
    {
      id: 'test-drives-router',
      files: '*.test.ts',
      require: [{ member: 'caller*' }],
      message: 'A test file drives the router through a caller.',
    },
    {
      id: 'transaction-passes-tx',
      when: { references: 'transaction' },
      require: [{ identifier: 'tx' }],
      message: 'A file that opens a transaction passes tx into every query it calls.',
    },
  ],
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `patterns` | `[]` | A list of `{ id, files, when, require, requireAny, message }`. `id` is a stable handle reported alongside the message, `files` is a glob matched against the linted path, `when` is `{ references }` or `{ found }`, `require` lists matchers that must all be satisfied, `requireAny` lists matchers of which one must be, and `message` is reported verbatim. An empty list leaves every file alone. |

A matcher is one of the following.

| Matcher | Matches |
| --- | --- |
| `{ call: 'router' }` | A call whose callee is the named identifier. A trailing `*` such as `create*` matches any callee starting with `create`. |
| `{ call: '*.parse' }` | A method call on any receiver, so `schema.parse(input)` matches. |
| `{ member: 'caller*' }` | A member access whose object name matches, so `caller.event.list` matches. |
| `{ identifier: 'tx' }` | A bare identifier reference anywhere in the file. |
| `{ literal: 'governance' }` | A string literal whose value equals the string. |

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
