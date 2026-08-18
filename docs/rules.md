# Rules

Every rule the plugin registers, with its options and examples.
Each rule reads as `looks-good/<name>` in a flat config.
Which config enables a rule, and what enabling it costs, is in [Configs](configs.md).

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

### comment-wrap

Reports a comment sentence that wraps to the next line, and a comment past `maxLength`.
`onWrap` selects the remedy for a wrapped sentence, leaving everything else the same in both modes.

Examples of **incorrect** code for this rule:

```js
// This sentence continues
// onto the next line.
const a = 1
```

Examples of **correct** code under the default `onWrap: 'report'`, where the sentence is rewritten to fit:

```js
// This sentence fits on one line.
const a = 1
```

Examples of **correct** code under `onWrap: 'join'`, where the two lines become one:

```js
// This sentence continues onto the next line.
const a = 1
```

Report mode attaches no fix, since deciding what a sentence should say instead is a person's call.
Join mode is the fixable one, so it is what `--fix` acts on.

A comment line past `maxLength` is reported in both modes, and that report never carries a fix, because joining a line cannot shorten it.
It also suppresses the wrap report for the same line, so an over-length line yields one message rather than two.

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `onWrap` | `'report'` | What to do with a sentence that wraps. `'report'` asks for a rewrite, and `'join'` joins the two lines under `--fix`. |
| `maxLength` | `120` | The longest a comment may run. Under `'join'`, two lines that would join past it are reported without a fix. |
| `allowUrls` | `true` | Exempts a line ending in a url. |
| `allowIdentifiers` | `true` | Exempts a line ending in a symbol such as `` `comment.utils` `` or `discord.js`. |
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

### import-group-order

Reports an import written out of the group order and the alphabetical order a project pins.
Imports carry no meaning in the order they are written, so a fixed order makes the list scannable and stops a diff from recording a rearrangement nobody chose.
Every import is placed in a group by the shape of its specifier, the groups run in the order the `groups` option lists, and imports inside one group sort alphabetically.

This rule is a port of [`import-x/order`](https://github.com/un-ts/eslint-plugin-import-x/blob/v4.17.1/src/rules/order.ts) from `eslint-plugin-import-x`, which is MIT licensed and copyright 2015 Ben Mosher.
It exists so a project can keep this ordering under oxlint, which has no equivalent rule and whose maintainers declined to add one.
No config enables it, because a project already running `import-x/order` would see the same import reported twice, so turn that rule off before enabling this one.
The port covers the options this project pins and leaves the rest out, so read the options table below as the whole surface rather than a summary of the original's.
Option names are camelCase here, so the original's `newlines-between` is spelled `newlinesBetween`, matching every other rule in this plugin.

Examples of **incorrect** code for this rule:

```js
import b from './b.ts'
import { z } from 'zod'
```

Examples of **correct** code for this rule:

```js
import { z } from 'zod'
import b from './b.ts'
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `groups` | `['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type']` | The group names in the order they should appear. A group left out of the list sorts below every group named in it. |
| `alphabetize` | `{ order: 'ignore', orderImportKind: 'ignore', caseInsensitive: false }` | Sorting inside a group. `order` and `orderImportKind` take `asc`, `desc`, or `ignore`, and `caseInsensitive` folds case before comparing. |
| `newlinesBetween` | `'ignore'` | `never` reports a blank line written between two imports. |
| `internalPrefixes` | `[]` | Specifier prefixes that name the internal group, which is how a project's own alias reaches that group without module resolution. |

A specifier is classified by its text alone, where the original resolves it against the filesystem to decide whether a bare name is a package or a file inside the project.
A `node:` specifier and a bare Node builtin name are `builtin`, a `jsr:`, `npm:`, `http:`, or `https:` specifier is `external`, a name opening on a word character or an `@scope/name` is `external`, `..` is `parent`, `.` and `./index` are `index`, another `./` path is `sibling`, and anything else is `unknown`.
An alias opening on a symbol, such as `$shared/temporal.ts` or `~/components/Button.tsx`, matches no group and lands in `unknown`, which is where the original also puts it whenever resolution fails.
Name the alias in `internalPrefixes` to route it to the internal group instead.

The rule is fixable and moves whole lines, carrying a comment written on the same line as an import along with it.
A comment written on its own line above an import stays where it is, matching the original, so a comment that documents an import does not follow it.

**Two things differ from the original, and both show up on the first run.**
`newlinesBetween` takes only `never` and `ignore` here, where the original also takes `always` and `always-and-inside-groups`.
A project that separates its groups with blank lines has no setting to ask for that, so leave `newlinesBetween` at `ignore` and the blank lines are left alone.

The default `groups` names all eight groups, where the original defaults to `builtin`, `external`, `parent`, `sibling`, and `index`, leaving `internal`, `object`, and `type` unranked.
A project migrating with default options therefore sees its type imports move to the bottom of the list on the first `--fix`.
Pass the original's five explicitly to keep the previous placement.

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

### no-blank-line-in-object

Reports a blank line written between the properties of an object literal.
An object literal is one paragraph, so a gap inside it splits a single declaration into what reads as two, and the reader looks for a boundary that the braces already drew.
Closing the gap leaves the object as one unit.

Examples of **incorrect** code for this rule:

```js
const listeners = {
  Program: () => {
    check()
  },

  CallExpression: () => {
    check()
  },
}
```

Examples of **correct** code for this rule:

```js
const listeners = {
  Program: () => {
    check()
  },
  CallExpression: () => {
    check()
  },
}
```

Only the gap between one member and the next is reported, so padding after the opening brace or before the closing brace is left alone.
A blank line inside a property's value belongs to whatever is written there, so a function body assigned to a property keeps its own spacing.
This leaves the rule and `blank-line-after-block` on separate ground, and a blank line that rule requires after a nested closing brace is never reported here.
The fix deletes the blank lines between the two members.

This rule takes no options.

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

### no-id-only-mutation-scope

Reports an `update` or `delete` whose where clause names only an id column, in a file that scopes other queries by a tenant column.
The file itself is the evidence of intent: a mutation reachable by any id in a file whose sibling queries carry the tenant condition is almost always an oversight rather than a deliberate system path, so a file with no tenant scoped where clause anywhere is never reported.
The first `patterns` entry whose `files` glob matches the file wins, and a file matching no entry is not checked.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/no-id-only-mutation-scope: ["error", { patterns: [{ files: "**/*.queries.ts", tenantColumns: ["collectiveId"] }] }] */

// document.queries.ts
export const listDocuments = async (ctx) => {
  return await db.select().from(document).where(eq(document.collectiveId, ctx.membership.collectiveId))
}

export const updateDocument = async (ctx, input) => {
  return await db.update(document).set(input).where(eq(document.id, input.id))
}
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/no-id-only-mutation-scope: ["error", { patterns: [{ files: "**/*.queries.ts", tenantColumns: ["collectiveId"] }] }] */

// document.queries.ts
export const listDocuments = async (ctx) => {
  return await db.select().from(document).where(eq(document.collectiveId, ctx.membership.collectiveId))
}

export const updateDocument = async (ctx, input) => {
  return await db.update(document).set(input).where(and(eq(document.collectiveId, ctx.membership.collectiveId), eq(document.id, input.id)))
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `patterns` | `[]` | A list of `{ files, tenantColumns, idColumns }`. `files` is a glob matched against the linted file's path, `tenantColumns` are the column names that count as tenant scoping, and `idColumns` (default `['id']`) are the column names that count as id filtering. The first entry whose glob matches wins. |

A column is read from the first argument of each comparator call inside the where clause, following the `eq(column, value)` shape query builders write.
A where clause naming a column outside both lists, such as a foreign key, is out of scope, and reads are never reported.
A mutation inside a transaction is not reported when the same transaction also holds a tenant scoped where clause, or a plain function call handed the transaction handle, since a verify running on the transaction is the pattern this rule asks for.
The same verify outside a transaction still reports, because the mutation itself stays open between the check and the write.

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

### no-inline-regex

Reports a regular expression written anywhere other than as the initializer of a module-level `const`.

An inline pattern is recompiled on every call, and it says nothing about what it matches beyond the pattern itself.
Hoisting it to a named const compiles it once and gives the call site a name to read instead of a pattern to decode.
Both a literal and a `new RegExp(...)` call are read.

Examples of **incorrect** code for this rule:

```js
export const slugify = (value) => {
  return value.replace(/[^a-z0-9]+/g, '-')
}
```

Examples of **correct** code for this rule:

```js
const nonAlphanumericRun = /[^a-z0-9]+/g

export const slugify = (value) => {
  return value.replace(nonAlphanumericRun, '-')
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `position` | `'module'` | `module` accepts a pattern const anywhere at the top level of the file. `top` additionally requires the pattern consts be grouped in an unbroken run at the head of the file. |

A const holding a collection of patterns, such as an array or an object of them, counts as a pattern declaration under `top`, so it does not break the opening run for the ones beside it.

This rule is not fixable.
The name a hoisted pattern carries is the point of hoisting it, and nothing in the source says what that name should be.

### no-nullable-unique-column

Reports a Drizzle unique constraint that covers a column a row may leave null.

Postgres treats a null as distinct from every other null, including another null in the same column.
A unique constraint compares rows for equality, and null is never equal to null, so two rows whose covered column is null do not collide.
The constraint is therefore not enforced at all for those rows, and duplicates are accepted without limit.
This is standard SQL behaviour rather than a Postgres quirk, and it is easy to miss because the constraint looks like it holds and the failure only appears once real rows start leaving the column null.

The shape is worth reporting because the column definitions and the constraint sit in the same table call, so whether a covered column is nullable is decided by reading one expression.
A column is nullable unless its builder chain calls `.notNull()` or `.primaryKey()`, since a primary key is not null in Postgres whether or not the builder spells it out.

Consider a vote table that means to allow one vote per member per proposal:

```js
export const vote = pgTable('vote', {
  proposalId: integer('proposal_id').notNull(),
  createdBy: integer('created_by'),
}, (table) => [
  unique().on(table.proposalId, table.createdBy),
])
```

Once a member is deleted and the foreign key sets `createdBy` to null, that member's votes stack without limit and the tally drifts.

Examples of **incorrect** code for this rule:

```js
export const rsvp = pgTable('rsvp', {
  eventId: integer('event_id'),
  membershipId: integer('membership_id'),
}, (table) => [
  unique().on(table.eventId, table.membershipId),
])
```

Examples of **correct** code for this rule:

```js
export const rsvp = pgTable('rsvp', {
  eventId: integer('event_id').notNull(),
  membershipId: integer('membership_id').notNull(),
}, (table) => [
  unique().on(table.eventId, table.membershipId),
])
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `files` | `'**/*.tables.ts'` | The paths holding table definitions, so the rule reads nothing else. |
| `allowSingleColumn` | `true` | Skips a unique that covers exactly one nullable column, since that shape is usually the intended unique when present pattern, such as a Discord guild id or a Stripe customer id that is null until the account is connected. Set it to `false` to report those too. |

There are two ways to fix a report, and which one is right depends on what the constraint was meant to promise.
Making the column `.notNull()` is correct when every row should carry a value and the nullability was an oversight.
Writing the constraint as a unique index with `NULLS NOT DISTINCT` is correct when the column is legitimately nullable but two null rows should still collide.
`NULLS NOT DISTINCT` needs Postgres 15 or newer; on an older server the equivalent is a pair of partial unique indexes, one covering the rows where the column is null and one covering the rest.

**The composite case and the single-column case are not the same defect.**
A composite unique is a strong signal of a real one, since its columns are usually a pair whose combination is meant to be unique per entity, and null in either one silently drops that promise for the rows that need it most.
Those are reported by default.
A unique covering exactly one nullable column is usually deliberate, so it is allowed by default and `allowSingleColumn: false` turns that allowance off.

A nullable column in a single-column unique is often exactly what a schema wants.
An optional external identifier is the usual case, where a unique on a nullable `stripe_customer_id` means no two rows claim the same Stripe customer while any number of rows have no Stripe customer at all.
Postgres null distinctness is the wanted semantic there rather than an oversight, and turning it into `NULLS NOT DISTINCT` would be a bug, since it would cap the table at a single row without a Stripe customer.
Set `allowSingleColumn` to `false` when a schema means every unique column to be present, which surfaces the constraint that meant to promise one row per user and quietly stops promising it once the user is deleted.

The rule reads `unique().on(...)`, `unique('name').on(...)`, and the same two spellings of `uniqueIndex`.
A `.unique()` modifier written directly on a column definition is not read, since no table in the projects this was measured against uses that form.

This rule is not fixable.
The two remedies produce different behaviour, and nothing in the source says which the author meant, so a fix would have to guess at intent.

### no-restricted-characters

Reports characters a project does not want in source.

A restriction that names a `replacement` is fixable, and the fix applies in comments only.
An identifier is left alone because renaming it breaks its references, and a string is left alone because it may be a pattern or a fixture asserting on the character itself.

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
| `restrict` | `[]` | A list of `{ chars, message, replacement }`. Every character in `chars` is matched literally, and `message` is reported alongside the character found. `replacement` is optional, and naming it makes the entry fixable in comments. |
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

### no-test-before-group

Reports a test written above the first group in the same body.
A test placed there reads as the primary behaviour of the file or of the group it sits in, whatever it actually covers, so a reader takes the wrong thing as the subject.
Only the statements above the first group are reported, and a body that declares no group at all is left alone.

Examples of **incorrect** code for this rule:

```js
/* eslint looks-good/no-test-before-group: "error" */

describe('All Task Tests', () => {
  it('creates a task', () => {})

  describe('create', () => {
    it('rejects an empty title', () => {})
  })
})
```

Examples of **correct** code for this rule:

```js
/* eslint looks-good/no-test-before-group: "error" */

describe('All Task Tests', () => {
  describe('create', () => {
    it('creates a task', () => {})
    it('rejects an empty title', () => {})
  })
})
```

```js
/* eslint looks-good/no-test-before-group: "error" */

// A file of tests with no group declares no subject to sit above.
it('creates a task', () => {})
it('deletes a task', () => {})
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `testFunctions` | `['it', 'test']` | The calls that declare a test. A call written as `it.only` or `it.skip` counts as its base name. |
| `groupFunctions` | `['describe']` | The calls that declare a group. A call written as `describe.only` or `describe.skip` counts as its base name. |

Every body is checked, not only the top level of the file, so a group holding a test above a nested group is reported the same way.
A test written after the last group is a different shape and is not reported, because it does not stand in front of the groups a reader scans first.
A curried call such as `describe.each([1])('create', ...)` names its function through another call, which resolves to no name, so it does not count as a group.

### no-try-catch-handler

Reports a `try` statement that has a `catch` clause, in favour of a go-style result helper that returns its failure instead of throwing it.
A `try` with only a `finally` clause is left alone, since a result helper has no finally channel and cleanup still needs the guarantee.

The rule picks the helper to name by walking out to the nearest enclosing function and reading whether it is async.
A `try` inside no function at all is treated as async, since a module body can hold a top level await.

This rule is in no shipped config.
It points at a helper your project has to have written, so enabling it without one would report every `try` and name a function that does not exist there.
The helper source and the config that enables the rule are in [Result Helper](result-helper.md).

Examples of **incorrect** code for this rule:

```ts
const read = async (id: string): Promise<Row> => {
  try {
    return await fetchRow(id)
  } catch (error) {
    report(error)
    throw error
  }
}
```

Examples of **correct** code for this rule:

```ts
const read = async (id: string): Promise<Row> => {
  const { data, error } = await safeAsync(() => fetchRow(id))

  if (error) {
    report(error)
    throw error
  }

  return data
}
```

A `try` that only guarantees cleanup keeps its `finally`.

```ts
const read = (path: string): string => {
  const file = open(path)

  try {
    return file.read()
  } finally {
    file.close()
  }
}
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `module` | `''` | The path the helper is imported from, named in the report so a reader knows where to import from. Left empty, the report names the helper alone. |
| `sync` | `'safe'` | The helper named when the nearest enclosing function is not async. |
| `async` | `'safeAsync'` | The helper named when the nearest enclosing function is async, or when there is no enclosing function. |

With `module` set to `~/utils/safe.utils.ts`, a `try` in an async function reports as follows.

```
Wrap the call in safeAsync from ~/utils/safe.utils.ts and guard on the returned error. A try with only a finally clause is still allowed.
```

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

### require-foreign-key-index

Reports a Drizzle foreign key whose referencing columns have no index covering them.

Postgres creates a backing index for a primary key and for a unique constraint, but it never creates one for the referencing side of a foreign key.
That side is the one a query filters on.
Every lookup by `collectiveId`, `createdBy`, or `eventId` reads the whole child table when no index exists.
The cost is worse on delete than on read.
A foreign key declaring `on delete cascade` or `on delete set null` makes Postgres scan the entire child table once for every parent row deleted, because it has no other way to find the rows that reference it.
A parent with sixteen referencing tables turns one delete into sixteen full scans, and that stays invisible until the tables are large enough for it to time out.

The rule reads one table config at a time and compares each `foreignKey({ columns: [...] })` against the indexes and constraints declared beside it.
An index covers a foreign key when the foreign key's columns are a leading prefix of the index's columns, which is what Postgres can actually use.
So an index on `(a, b, c)` covers a foreign key on `(a)` and on `(a, b)`, and an index on `(b, a)` covers neither.
Both `index()` and `uniqueIndex()` count, and so does a `unique()` constraint, since Postgres enforces uniqueness through a btree index that a lookup can read.
A column declared `.primaryKey()` and a `primaryKey({ columns: [...] })` in the config array count for the same reason.

The rule is not fixable.
Inserting `index().on(table.x)` is mechanical, but the name the index carries and its position among the other constraints are choices a person makes, and a composite foreign key often wants a wider index than the one covering it exactly.

Examples of **incorrect** code for this rule:

```js
export const task = governanceSchema.table('task', {
  id: serial().primaryKey().notNull(),
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] })
    .onDelete('cascade'),
])
```

Examples of **correct** code for this rule:

```js
export const task = governanceSchema.table('task', {
  id: serial().primaryKey().notNull(),
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  index().on(table.collectiveId),
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] })
    .onDelete('cascade'),
])

export const settings = governanceSchema.table('settings', {
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  unique().on(table.collectiveId),
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] }),
])
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `files` | `'**/*.tables.ts'` | A glob matched against the linted path. A file that does not match is not read at all. |
| `tableFunctions` | `['table', 'pgTable']` | The calls that declare a table. A call written as `pgSchema('x').table(...)` counts as `table`. |
| `indexFunctions` | `['index', 'uniqueIndex']` | The builders that declare an index. |
| `uniqueFunctions` | `['unique']` | The builders that declare a unique constraint, which Postgres backs with an index. |
| `foreignKeyFunction` | `'foreignKey'` | The call that declares a foreign key. |

The rule reads the third argument of a table call only when it is an arrow function returning an array, which is the shape current Drizzle uses.
A table declaring its constraints some other way is left alone rather than guessed at.

Only a `foreignKey({ ... })` call in that array is detected.
A foreign key declared inline on a column with `.references(() => other.id)` is not read, so a schema written that way reports nothing at all.
Declare the foreign key in the config array to bring it into scope.

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

## Rules That Were Removed

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

## Related Docs

- [Configs](configs.md) - which config enables each rule and what it costs to install
- [Result Helper](result-helper.md) - the `safe` and `safeAsync` source `no-try-catch-handler` points at
