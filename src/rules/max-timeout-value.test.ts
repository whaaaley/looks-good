import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './max-timeout-value.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('max-timeout-value', rule, {
  valid: [
    // The bound is inclusive, so a value at the max is within budget.
    { code: 'const TIMEOUT = 5000' },
    { code: 'const TIMEOUT = 2000' },
    // A name that does not carry the pattern is not a timeout.
    { code: 'const RETRIES = 20000' },
    { code: 'const MAX_ROWS = 100000' },
    // A non numeric init has no value to compare.
    { code: "const TIMEOUT = '30000'" },
    { code: 'const TIMEOUT = base * 2' },
    { code: 'const TIMEOUT = null' },
    { code: 'const TIMEOUT = defaultTimeout' },
    // A declarator with no init declares nothing to check.
    { code: 'let TIMEOUT' },
    // A destructured binding is not an identifier declaration.
    { code: 'const { TIMEOUT } = config' },
    // The underscore separated form is the same number, and it is at the max.
    { code: 'const TIMEOUT = 5_000' },
    // A raised max puts the value back within budget.
    {
      code: 'const TIMEOUT = 20000',
      options: [{ max: 30000 }],
    },
    // A custom name pattern stops matching the default name.
    {
      code: 'const TIMEOUT = 30000',
      options: [{ namePattern: 'DELAY' }],
    },
  ],
  invalid: [
    // A value above the max is reported with the value and the budget, at the declarator rather than the statement.
    {
      code: 'const TIMEOUT = 30000',
      errors: [{ messageId: 'above', data: { name: 'TIMEOUT', value: '30000', max: '5000' }, column: 7 }],
    },
    // One over the bound is over the bound.
    {
      code: 'const TIMEOUT = 5001',
      errors: [{ messageId: 'above' }],
    },
    // The pattern is a substring matched without regard to case.
    {
      code: 'const createTimeout = 30000',
      errors: [{ messageId: 'above', data: { name: 'createTimeout', value: '30000', max: '5000' } }],
    },
    {
      code: 'const SUCCESS_TIMEOUT_MS = 15000',
      errors: [{ messageId: 'above' }],
    },
    // A let holds the same number as a const.
    {
      code: 'let TIMEOUT = 30000',
      errors: [{ messageId: 'above' }],
    },
    // The parser normalizes the underscore separators, so this reads as 30000.
    {
      code: 'const TIMEOUT = 30_000',
      errors: [{ messageId: 'above', data: { name: 'TIMEOUT', value: '30000', max: '5000' } }],
    },
    // A lowered max brings a previously passing value into report.
    {
      code: 'const TIMEOUT = 2000',
      options: [{ max: 1000 }],
      errors: [{ messageId: 'above', data: { name: 'TIMEOUT', value: '2000', max: '1000' } }],
    },
    // A custom name pattern picks up a name the default misses.
    {
      code: 'const RENDER_DELAY = 9000',
      options: [{ namePattern: 'DELAY' }],
      errors: [{ messageId: 'above', data: { name: 'RENDER_DELAY', value: '9000', max: '5000' } }],
    },
    // Extra prose is appended to the report.
    {
      code: 'const TIMEOUT = 30000',
      options: [{ message: 'Wait on the response instead.' }],
      errors: [{ messageId: 'aboveWithMessage', data: { name: 'TIMEOUT', value: '30000', max: '5000', message: 'Wait on the response instead.' } }],
    },
    // Each declarator in one statement is checked on its own.
    {
      code: 'const TIMEOUT = 30000, OTHER_TIMEOUT = 40000',
      errors: [
        { messageId: 'above', data: { name: 'TIMEOUT', value: '30000', max: '5000' } },
        { messageId: 'above', data: { name: 'OTHER_TIMEOUT', value: '40000', max: '5000' } },
      ],
    },
  ],
})
