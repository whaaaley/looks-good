import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-restricted-method-calls.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const message = 'Call the router rather than reaching past it.'

const database = {
  restrict: [
    { receivers: ['db', 'tx', 'client'], methods: ['insert', 'select', 'update', 'delete'], message },
  ],
}

const caseSensitive = {
  restrict: [
    { receivers: ['db'], methods: ['insert'], message, ignoreCase: false },
  ],
}

tester.run('no-restricted-method-calls', rule, {
  valid: [
    // With nothing configured the rule restricts nothing.
    { code: 'db.insert({ id: 1 })' },
    { code: 'tx.select()', options: [{ restrict: [] }] },
    // A receiver outside the list is untouched.
    {
      code: 'router.insert({ id: 1 })',
      options: [database],
    },
    // A method outside the list is untouched.
    {
      code: 'db.connect()',
      options: [database],
    },
    // An allowed receiver is exempt even though the entry names it.
    {
      code: 'db.insert({ id: 1 })',
      options: [{ ...database, allow: ['db'] }],
    },
    // A computed access is not matched, since the property is an expression rather than a name.
    {
      code: "db['insert']({ id: 1 })",
      options: [database],
    },
    // A bare call has no receiver to match.
    {
      code: 'insert({ id: 1 })',
      options: [database],
    },
    // Only the innermost object is compared, so a nested chain does not match on the root.
    {
      code: 'a.b.insert({ id: 1 })',
      options: [database],
    },
    // With ignoreCase off the spelling has to match exactly.
    {
      code: 'DB.insert({ id: 1 })',
      options: [caseSensitive],
    },
    {
      code: 'db.INSERT({ id: 1 })',
      options: [caseSensitive],
    },
  ],
  invalid: [
    {
      code: 'db.insert({ id: 1 })',
      options: [database],
      errors: [{ messageId: 'forbidden', data: { message } }],
    },
    {
      code: 'tx.select()',
      options: [database],
      errors: [{ messageId: 'forbidden', data: { message } }],
    },
    {
      code: 'client.update({ id: 1 })',
      options: [database],
      errors: [{ messageId: 'forbidden', data: { message } }],
    },
    // Case is ignored by default, so a differently spelled receiver is the same mistake.
    {
      code: 'DB.insert({ id: 1 })',
      options: [database],
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'db.INSERT({ id: 1 })',
      options: [database],
      errors: [{ messageId: 'forbidden' }],
    },
    // The exact spelling still reports when ignoreCase is off.
    {
      code: 'db.insert({ id: 1 })',
      options: [caseSensitive],
      errors: [{ messageId: 'forbidden' }],
    },
    // A chain reports where the identifier is the immediate object of the called method.
    {
      code: 'a.b(db.insert({ id: 1 }))',
      options: [database],
      errors: [{ messageId: 'forbidden' }],
    },
    // Each entry carries its own message.
    {
      code: 'db.insert({ id: 1 })\ncache.flush()',
      options: [{
        restrict: [
          { receivers: ['db'], methods: ['insert'], message },
          { receivers: ['cache'], methods: ['flush'], message: 'Let the cache expire on its own.' },
        ],
      }],
      errors: [
        { messageId: 'forbidden', data: { message }, line: 1 },
        { messageId: 'forbidden', data: { message: 'Let the cache expire on its own.' }, line: 2 },
      ],
    },
    // The report lands on the call rather than the statement start.
    {
      code: 'const rows = db.select()',
      options: [database],
      errors: [{ messageId: 'forbidden', column: 14 }],
    },
    // Another receiver stays restricted when only one is allowed.
    {
      code: 'tx.insert({ id: 1 })',
      options: [{ ...database, allow: ['db'] }],
      errors: [{ messageId: 'forbidden' }],
    },
  ],
})
