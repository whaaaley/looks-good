# looks-good

Lint rules for conventions nothing else enforces.

The rules are written to the ESLint rule interface, and ESLint is the host they are developed and tested against.

## Install

```sh
deno add jsr:@whaaaley/looks-good npm:eslint
```

The package is `@whaaaley/looks-good` at version `0.1.0`.
It exports the plugin from `.` and the separate eslint rule set from `./eslint-rules`.

The plugin is consumed through a flat config.
It is developed and tested against ESLint 10.8.1, and no earlier version has been tested.
Legacy `.eslintrc` is not supported.

## Usage

The plugin ships two configs.

| Config | Description |
| --- | --- |
| `recommended` | the default set |
| `typescript` | adds the rules that read TypeScript syntax |

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

`comment-reflow` rewrites the wrapped sentence that `comment-one-sentence-per-line` only reports.
Both report the same wrap, so `recommended` enables the reporting one and leaves the fixer off.
Turn one off and the other on to rewrite under `--fix` instead.

```js
looksGood.configs.recommended,
{
  rules: {
    'looks-good/comment-one-sentence-per-line': 0,
    'looks-good/comment-reflow': 'error',
  },
}
```

### The typescript config

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

| Rule | Description | Config | Fixable |
| --- | --- | --- | --- |
| [blank-line-after-block](#blank-line-after-block) | Separates a closing brace from the statement that follows it | recommended | yes |
| [comment-content](#comment-content) | Forbids comment text a project does not want left in source | recommended | |
| [comment-one-sentence-per-line](#comment-one-sentence-per-line) | A comment sentence fits on one line and a line holds one sentence | recommended | |
| [comment-reflow](#comment-reflow) | Joins a comment sentence that wraps onto the next line | opt in | yes |
| [describe-group-order](#describe-group-order) | Requires sibling describe groups to appear in a configured order | recommended | |
| [describe-title-pattern](#describe-title-pattern) | Requires a test file to name its subject in a top level describe title | recommended | |
| [max-destructured-parameters](#max-destructured-parameters) | Limits how many bindings a function parameter may destructure | recommended | |
| [max-single-line-statement-length](#max-single-line-statement-length) | Keeps a single line if body on one line only while that line stays short | recommended | yes |
| [no-emoji](#no-emoji) | Reports emoji in code, comments, and identifiers | recommended | |
| [no-ignored-tests](#no-ignored-tests) | Reports a skipped or ignored test | recommended | |
| [no-restricted-characters](#no-restricted-characters) | Reports characters a project does not want in source | recommended | |
| [no-single-line-nested-object](#no-single-line-nested-object) | Keeps a nested object out of a call or construction argument written on one line | recommended | |
| [no-union-in-parameter-type](#no-union-in-parameter-type) | Forbids an inline union type in a function parameter annotation | typescript | |
| [object-comments-trailing](#object-comments-trailing) | Keeps a comment inside an object literal on the line it describes | recommended | |
| [require-file-calls](#require-file-calls) | Requires a file to contain the calls its path or contents call for | recommended | |
| [test-arrange-act-assert](#test-arrange-act-assert) | Requires test bodies to be labelled with Arrange, Act, and Assert comments | recommended | |

`comment-reflow` and `comment-one-sentence-per-line` both catch a sentence that wraps onto the next line.
The first rewrites, the second reports.
Enable one or the other, never both, since both enabled report the same wrapped sentence twice.
`recommended` enables `comment-one-sentence-per-line`, and `comment-reflow` is the one you opt into.

### Rules that were removed

`max-timeout-value`, `no-optional-chain-on-index`, and `no-database-access-in-tests` were removed.
Each of them matched a syntax shape that ESLint core's `no-restricted-syntax` already expresses, so they carried a rule implementation for no added reach.
A project that used them can get the same reports from core.

```js
// eslint.config.js
export default [
  {
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'VariableDeclarator[id.name=/TIMEOUT/i][init.value>5000]',
          message: 'A timeout above 5000 waits out a delay rather than asserting against it.',
        },
        {
          selector: 'MemberExpression[optional=true] > MemberExpression.object[computed=true]',
          message: 'Destructure the element and guard it rather than chaining off an indexed access.',
        },
        {
          selector: 'CallExpression[optional=true] > MemberExpression.callee[computed=true]',
          message: 'Destructure the element and guard it rather than chaining off an indexed access.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression > MemberExpression[computed=false][object.name=/^(db|tx|client|database)$/i][property.name=/^(insert|select|update|delete)$/i]',
        message: 'Drive the interface under test rather than querying the database directly.',
      }],
    },
  },
]
```

Flat config replaces rule options rather than merging them, so a later config block setting its own `no-restricted-syntax` drops these entries.
Keep every selector a project needs in one place.

### blank-line-after-block

Reports a statement that sits directly under the closing brace of an `if`, a loop, a `try`, or a `switch`.
A closing brace ends a paragraph, so the next statement starts a new one and needs a blank line between them.
A braceless guard such as `if (!first) return` ends in its own statement rather than a brace, so it is left alone.

Examples of **incorrect** code for this rule:

```js
if (!input) {
  return ''
}
const parsed = parse(input)
```

Examples of **correct** code for this rule:

```js
if (!input) {
  return ''
}

const parsed = parse(input)
```

This rule takes no options.

When a comment sits between the brace and the next statement, the comment is what the reader sees first, so the blank line is required above the comment.

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
| `forbid` | `[]` | A list of `{ pattern, message, ignoreCase }`. `pattern` is a regex source string matched against the comment text, `message` is reported when it matches, and `ignoreCase` matches the pattern regardless of case. |
| `forbidBlockComments` | `false` | Reports any `/* */` comment. |

`ignoreCase` defaults to `false` and is set per entry, so one entry can be case sensitive while another is not.
With it set, a `\\bTODO\\b` pattern also matches `todo` and `ToDo`.

```js
{
  forbid: [
    { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks', ignoreCase: true },
  ],
}
```

A pattern that is not a valid regular expression is reported once at the top of the file rather than being ignored.

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

### max-destructured-parameters

Reports a function parameter that destructures in the signature.
A destructured signature hides the shape of the argument behind a list of names, and the names have to be read against the call site to work out what is being passed.
Naming the parameter and destructuring it in the body puts the shape and the names in two separate places.

Examples of **incorrect** code for this rule:

```js
const format = ({ title, body, author }) => {
  return `${title} by ${author}`
}
```

Examples of **correct** code for this rule:

```js
const format = (post) => {
  const { title, author } = post

  return `${title} by ${author}`
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `max` | `0` | The most bindings a destructured parameter may introduce. At `0` any destructuring in a signature is reported. |

A nested pattern counts the names it introduces rather than itself, so `({ a, b: { c } })` counts three.
An array pattern counts the same way, and a default value or a rest element counts what it wraps.

### max-single-line-statement-length

Reports a braceless `if` whose body sits on the same line as the condition when that line runs past `maxLength`.
A short guard reads fine on one line, and a long one hides the body at the end of a line nobody scans that far into.

Examples of **incorrect** code for this rule:

```js
if (!parsed) return { status: 'failed', message: 'The input did not parse into anything usable' }
```

Examples of **correct** code for this rule:

```js
if (!parsed) {
  return { status: 'failed', message: 'The input did not parse into anything usable' }
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `maxLength` | `80` | The longest the line may run before the body has to move into braces. The bound is inclusive, so a line exactly this long passes. |

A body already written in braces is left alone whatever its width, and a body already on its own line is not the form this rule governs.
The fix wraps the body in braces on its own line, indented one step past the `if`.

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

### no-single-line-nested-object

Reports an object nested inside a call or construction argument that is written on one line.
An argument holding a nested object carries two levels of structure, and on one line the reader has to count braces to see where each level starts.
Putting the outer object's properties on their own lines gives each level its own line.

Examples of **incorrect** code for this rule:

```js
createUser({ name: 'Ada', address: { city: 'London' } })

const tester = new RuleTester({ languageOptions: { parser: tsParser } })
```

Examples of **correct** code for this rule:

```js
createUser({
  name: 'Ada',
  address: { city: 'London' },
})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `minNestedProperties` | `1` | The fewest properties the nested object must hold before it is reported. At `0` an empty nested object counts too. |

Only an outer object passed directly as an argument to a call or a `new` expression is checked, which is where the crowding happens.
An outer object already spread across several lines is left alone whatever it nests.

### no-union-in-parameter-type

Reports a union type written inline in a function parameter annotation.
A union in a signature states the values without stating what the set of them means, and the same union then gets rewritten at every other place that takes it.
A named alias says what the set is once, and every signature refers to it.

This rule reads a TypeScript node, so it ships in the `typescript` config rather than in `recommended`.

Examples of **incorrect** code for this rule:

```ts
const setStatus = (status: 'open' | 'closed' | 'merged'): void => {
  record(status)
}
```

Examples of **correct** code for this rule:

```ts
type Status = 'open' | 'closed' | 'merged'

const setStatus = (status: Status): void => {
  record(status)
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `allowNullable` | `false` | Exempts a two member union whose other member is `null` or `undefined`, so `string \| null` passes. |

A rest parameter annotated as an array of a union is reported too, since the annotation sits one wrapper above the parameter.
A `TSFunctionType` describes a type rather than a function being written, so its parameters are left alone.

### object-comments-trailing

Reports a comment that sits on its own line inside an object literal.
A comment on its own line inside an object breaks the list of properties into paragraphs that the object does not actually have.
Put it after the property it describes, or cut it.

Examples of **incorrect** code for this rule:

```js
const config = {
  // The port the server binds to.
  port: 3000,
  host: 'localhost',
}
```

Examples of **correct** code for this rule:

```js
const config = {
  port: 3000, // The port the server binds to.
  host: 'localhost',
}
```

This rule takes no options.

A comment that sits inside one of the properties belongs to whatever nests there, so it is checked against that inner object rather than this one.
A comment sharing a line with the opening brace counts as trailing that line.

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

## Tools

These are for developing this repository, and are not part of the published plugin.

`tools/hooks/` holds the git hooks, and `deno task install-hooks` points `core.hooksPath` at it.
The `commit-msg` hook runs the commit message validator in `tools/commit/`, which checks the subject line against the types and scopes that file configures.
The `pre-commit` hook runs `deno task lint` and `deno task test` from the repository root.

The `post-commit` and `post-rewrite` hooks both run `deno task uncommitted`.

`tools/uncommitted/` warns when too much work is sitting uncommitted.
It reports when the working tree holds 12 or more changed files, or 400 or more changed lines counting insertions and deletions together.
Either threshold alone trips the warning, and reaching both names them together.
The warning names what is uncommitted and says to split the remaining work into focused commits before starting anything new.

## License

MIT
