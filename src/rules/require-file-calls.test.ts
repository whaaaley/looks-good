import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './require-file-calls.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

// ESLint relativizes an absolute path against the cwd before matching, so a tree glob is written relative to it.
const absolute = `${Deno.cwd()}/src/apps/governance/event/event.router.ts`

const treeEntry = [{
  id: 'router-registers',
  files: 'src/apps/**/*.router.ts',
  require: [{ call: 'router' }],
  message: 'A router file builds its router with router().',
}]

const routerEntry = [{
  id: 'router-registers',
  files: '*.router.ts',
  require: [{ call: 'router' }],
  message: 'A router file builds its router with router().',
}]

const schemaEntry = [{
  id: 'schema-parses',
  files: '*.schema.ts',
  require: [{ call: '*.parse' }],
  message: 'A schema file parses its input with parse().',
}]

const callerEntry = [{
  id: 'test-uses-caller',
  files: '*.test.ts',
  require: [{ member: 'caller*' }],
  message: 'A test file drives the router through a caller.',
}]

const eitherEntry = [{
  id: 'test-asserts',
  files: '*.test.ts',
  requireAny: [{ call: 'assertEquals' }, { call: 'assertExists' }],
  message: 'A test file asserts something.',
}]

const referencesEntry = [{
  id: 'transaction-passes-tx',
  when: { references: 'transaction' },
  require: [{ identifier: 'tx' }],
  message: 'A file that opens a transaction passes tx down.',
}]

const chainedEntries = [
  {
    id: 'has-router',
    files: '*.router.ts',
    require: [{ call: 'router' }],
    message: 'A router file builds its router with router().',
  },
  {
    id: 'router-is-exported',
    files: '*.router.ts',
    when: { found: 'has-router' },
    require: [{ literal: 'export-marker' }],
    message: 'A router file marks its export.',
  },
]

tester.run('require-file-calls', rule, {
  valid: [
    // The required call is present.
    {
      code: 'export const eventRouter = router({})',
      filename: 'event.router.ts',
      options: [{ patterns: routerEntry }],
    },
    // An absolute path relativized against the cwd still matches a tree glob.
    {
      code: 'export const eventRouter = router({})',
      filename: absolute,
      options: [{ patterns: treeEntry }],
    },
    // A method call on any receiver satisfies a `*.` matcher.
    {
      code: 'export const read = (input) => schema.parse(input)',
      filename: 'event.schema.ts',
      options: [{ patterns: schemaEntry }],
    },
    // A member matcher with a trailing wildcard matches a prefixed object name.
    {
      code: 'const rows = callerOne.event.list()',
      filename: 'event.queries.test.ts',
      options: [{ patterns: callerEntry }],
    },
    // requireAny is satisfied by one of its matchers.
    {
      code: 'assertExists(row)',
      filename: 'event.queries.test.ts',
      options: [{ patterns: eitherEntry }],
    },
    // The other matcher satisfies it too.
    {
      code: 'assertEquals(row.id, 1)',
      filename: 'event.queries.test.ts',
      options: [{ patterns: eitherEntry }],
    },
    // The files glob does not match, so the entry is skipped entirely.
    {
      code: 'export const helper = 1',
      filename: 'event.utils.ts',
      options: [{ patterns: routerEntry }],
    },
    // An entry with no files glob applies everywhere, and here its condition is met.
    {
      code: 'const result = transaction((tx) => tx)',
      filename: 'event.queries.ts',
      options: [{ patterns: referencesEntry }],
    },
    // The `when.references` identifier is absent, so the entry does not apply.
    {
      code: 'export const helper = 1',
      filename: 'event.queries.ts',
      options: [{ patterns: referencesEntry }],
    },
    // The entry a `when.found` waits on was not satisfied, so the dependent entry does not apply.
    {
      code: 'export const helper = 1',
      filename: 'event.utils.ts',
      options: [{ patterns: chainedEntries }],
    },
    // Both entries in the chain are satisfied.
    {
      code: "export const eventRouter = router({ marker: 'export-marker' })",
      filename: 'event.router.ts',
      options: [{ patterns: chainedEntries }],
    },
    // An empty patterns list makes the rule inert.
    {
      code: 'export const helper = 1',
      filename: 'event.router.ts',
      options: [{ patterns: [] }],
    },
    // No options at all leaves every file alone.
    {
      code: 'export const helper = 1',
      filename: 'event.router.ts',
    },
    // A literal matcher is satisfied by an exact string value.
    {
      code: "const kind = 'governance'",
      filename: 'event.queries.ts',
      options: [{ patterns: [{ id: 'names-app', require: [{ literal: 'governance' }], message: 'Name the app.' }] }],
    },
    // A call matcher with a trailing wildcard matches a prefixed callee.
    {
      code: 'createTestContext()',
      filename: 'event.queries.test.ts',
      options: [{ patterns: [{ id: 'creates-context', require: [{ call: 'create*' }], message: 'Create a context.' }] }],
    },
    // Every matcher in `require` is present.
    {
      code: 'const rows = caller.event.list()\nassertEquals(rows.length, 1)',
      filename: 'event.queries.test.ts',
      options: [{
        patterns: [{
          id: 'test-shape',
          files: '*.test.ts',
          require: [{ member: 'caller' }, { call: 'assertEquals' }],
          message: 'A test file calls the router and asserts.',
        }],
      }],
    },
  ],
  invalid: [
    // A missing call under an absolute path proves the tree glob matched rather than silently missing.
    {
      code: 'export const eventRouter = {}',
      filename: absolute,
      options: [{ patterns: treeEntry }],
      errors: [{ messageId: 'missing' }],
    },
    // The required call is missing.
    {
      code: 'export const eventRouter = {}',
      filename: 'event.router.ts',
      options: [{ patterns: routerEntry }],
      errors: [{
        messageId: 'missing',
        data: { id: 'router-registers', message: 'A router file builds its router with router().' },
        line: 1,
      }],
    },
    // A bare call does not satisfy a `*.` method matcher.
    {
      code: 'export const read = (input) => parse(input)',
      filename: 'event.schema.ts',
      options: [{ patterns: schemaEntry }],
      errors: [{ messageId: 'missing', data: { id: 'schema-parses', message: 'A schema file parses its input with parse().' } }],
    },
    // No member access on a matching object name.
    {
      code: 'const rows = list()',
      filename: 'event.queries.test.ts',
      options: [{ patterns: callerEntry }],
      errors: [{ messageId: 'missing' }],
    },
    // Neither requireAny matcher is present.
    {
      code: 'const rows = caller.event.list()',
      filename: 'event.queries.test.ts',
      options: [{ patterns: eitherEntry }],
      errors: [{ messageId: 'missing', data: { id: 'test-asserts', message: 'A test file asserts something.' } }],
    },
    // One of two require matchers is missing, so the whole entry reports.
    {
      code: 'const rows = caller.event.list()',
      filename: 'event.queries.test.ts',
      options: [{
        patterns: [{
          id: 'test-shape',
          files: '*.test.ts',
          require: [{ member: 'caller' }, { call: 'assertEquals' }],
          message: 'A test file calls the router and asserts.',
        }],
      }],
      errors: [{ messageId: 'missing', data: { id: 'test-shape', message: 'A test file calls the router and asserts.' } }],
    },
    // The `when.references` identifier appears, so the entry applies and its requirement is unmet.
    {
      code: 'const result = transaction(() => 1)',
      filename: 'event.queries.ts',
      options: [{ patterns: referencesEntry }],
      errors: [{ messageId: 'missing', data: { id: 'transaction-passes-tx', message: 'A file that opens a transaction passes tx down.' } }],
    },
    // The entry a `when.found` waits on was satisfied, so the dependent entry applies and reports.
    {
      code: 'export const eventRouter = router({})',
      filename: 'event.router.ts',
      options: [{ patterns: chainedEntries }],
      errors: [{ messageId: 'missing', data: { id: 'router-is-exported', message: 'A router file marks its export.' } }],
    },
    // A `when.found` naming an entry that does not exist is a configuration error.
    {
      code: 'export const helper = 1',
      filename: 'event.utils.ts',
      options: [{
        patterns: [{
          id: 'router-is-exported',
          when: { found: 'has-rooter' },
          require: [{ call: 'router' }],
          message: 'A router file marks its export.',
        }],
      }],
      errors: [{ messageId: 'unknownFound', data: { id: 'router-is-exported', found: 'has-rooter' } }],
    },
    // Two independent entries each report on their own.
    {
      code: 'export const helper = 1',
      filename: 'event.router.ts',
      options: [{
        patterns: [
          { id: 'router-registers', files: '*.router.ts', require: [{ call: 'router' }], message: 'Build the router.' },
          { id: 'router-exports', files: '*.router.ts', require: [{ identifier: 'publicProcedure' }], message: 'Expose a procedure.' },
        ],
      }],
      errors: [
        { messageId: 'missing', data: { id: 'router-registers', message: 'Build the router.' } },
        { messageId: 'missing', data: { id: 'router-exports', message: 'Expose a procedure.' } },
      ],
    },
    // A literal matcher is not satisfied by a near miss.
    {
      code: "const kind = 'governance-app'",
      filename: 'event.queries.ts',
      options: [{ patterns: [{ id: 'names-app', require: [{ literal: 'governance' }], message: 'Name the app.' }] }],
      errors: [{ messageId: 'missing' }],
    },
    // An entry with no files glob reports on any file that fails it.
    {
      code: 'export const helper = 1',
      filename: 'anything.ts',
      options: [{ patterns: [{ id: 'needs-export', require: [{ call: 'defineConfig' }], message: 'Define the config.' }] }],
      errors: [{ messageId: 'missing', data: { id: 'needs-export', message: 'Define the config.' } }],
    },
  ],
})
