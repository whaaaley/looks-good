import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-database-access-in-tests.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const caseSensitive = { ignoreCase: false }

tester.run('no-database-access-in-tests', rule, {
  valid: [
    // A handle outside the list is untouched.
    { code: 'router.insert({ id: 1 })' },
    // A method outside the list is untouched.
    { code: 'db.connect()' },
    // An allowed handle is exempt even though the defaults name it.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ allow: ['db'] }],
    },
    // A computed access is not matched, since the property is an expression rather than a name.
    { code: "db['insert']({ id: 1 })" },
    // A bare call has no handle to match.
    { code: 'insert({ id: 1 })' },
    // Only the innermost object is compared, so a nested chain does not match on the root.
    { code: 'a.b.insert({ id: 1 })' },
    // With ignoreCase off the spelling has to match exactly.
    {
      code: 'DB.insert({ id: 1 })',
      options: [caseSensitive],
    },
    {
      code: 'db.INSERT({ id: 1 })',
      options: [caseSensitive],
    },
    // An empty handles list leaves the rule inert.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ handles: [] }],
    },
    // A custom handle list replaces the defaults rather than adding to them.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ handles: ['store'] }],
    },
    // A custom method list replaces the defaults too.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ methods: ['query'] }],
    },
  ],
  invalid: [
    {
      code: 'db.insert({ id: 1 })',
      errors: [{ messageId: 'direct', data: { handle: 'db', method: 'insert' } }],
    },
    {
      code: 'tx.select()',
      errors: [{ messageId: 'direct', data: { handle: 'tx', method: 'select' } }],
    },
    {
      code: 'client.update({ id: 1 })',
      errors: [{ messageId: 'direct' }],
    },
    {
      code: 'database.delete({ id: 1 })',
      errors: [{ messageId: 'direct' }],
    },
    // Case is ignored by default, so a differently spelled handle is the same mistake.
    {
      code: 'DB.insert({ id: 1 })',
      errors: [{ messageId: 'direct' }],
    },
    {
      code: 'db.INSERT({ id: 1 })',
      errors: [{ messageId: 'direct' }],
    },
    // The exact spelling still reports when ignoreCase is off.
    {
      code: 'db.insert({ id: 1 })',
      options: [caseSensitive],
      errors: [{ messageId: 'direct' }],
    },
    // A chain reports where the identifier is the immediate object of the called method.
    {
      code: 'a.b(db.insert({ id: 1 }))',
      errors: [{ messageId: 'direct' }],
    },
    // The report lands on the call rather than the statement start.
    {
      code: 'const rows = db.select()',
      errors: [{ messageId: 'direct', column: 14 }],
    },
    // Another handle stays restricted when only one is allowed.
    {
      code: 'tx.insert({ id: 1 })',
      options: [{ allow: ['db'] }],
      errors: [{ messageId: 'direct' }],
    },
    // Custom lists report the names they were given.
    {
      code: 'store.query({ id: 1 })',
      options: [{ handles: ['store'], methods: ['query'] }],
      errors: [{ messageId: 'direct', data: { handle: 'store', method: 'query' } }],
    },
    // A configured message replaces the default wording.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ message: 'Call the router rather than reaching past it.' }],
      errors: [{ messageId: 'custom', data: { message: 'Call the router rather than reaching past it.' } }],
    },
  ],
})
