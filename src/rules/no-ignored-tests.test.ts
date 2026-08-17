import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-ignored-tests.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-ignored-tests', rule, {
  valid: [
    // A test that runs is the only test that proves anything.
    { code: "it('creates a task', () => {})" },
    // The x prefix follows the skip modifier, so dropping skip drops the prefix form too.
    {
      code: "xit('creates a task', () => {})",
      options: [{ modifiers: ['ignore'] }],
    },
    { code: "test('creates a task', () => {})" },
    { code: "describe('create', () => {})" },
    // A modifier that leaves the test running is not a skip.
    { code: "it.only('creates a task', () => {})" },
    { code: "it.each([1, 2])('creates a task', () => {})" },
    // A member call on something that is not a test function is left alone.
    { code: 'queue.skip(1)' },
    { code: 'router.todo()' },
    { code: 'logger.failing()' },
    // A bare identifier starting with x that names no test function is left alone.
    { code: 'xhr()' },
    { code: 'xmlParse(input)' },
    // A computed member read is not the modifier form.
    { code: "it[name]('creates a task', () => {})" },
    // A custom modifier list narrows what counts as skipped.
    {
      code: "it.skip('creates a task', () => {})",
      options: [{ modifiers: ['ignore'] }],
    },
    // A custom test function list narrows what the modifier may attach to.
    {
      code: "describe.skip('create', () => {})",
      options: [{ testFunctions: ['it'] }],
    },
  ],
  invalid: [
    // Each default modifier is reported.
    {
      code: "it.ignore('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'ignore' } }],
    },
    // The report points at the whole call rather than the modifier alone.
    {
      code: "it.skip('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'skip' }, column: 1 }],
    },
    {
      code: "it.todo('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'todo' } }],
    },
    {
      code: "it.failing('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'failing' } }],
    },
    // Each default test function carries the modifier.
    {
      code: "test.skip('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'skip' } }],
    },
    {
      code: "describe.skip('create', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'skip' } }],
    },
    // The x prefixed forms mean the same thing.
    {
      code: "xit('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'xit' } }],
    },
    {
      code: "xtest('creates a task', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'xtest' } }],
    },
    {
      code: "xdescribe('create', () => {})",
      errors: [{ messageId: 'ignored', data: { modifier: 'xdescribe' } }],
    },
    // A custom modifier is reported once configured.
    {
      code: "it.later('creates a task', () => {})",
      options: [{ modifiers: ['later'] }],
      errors: [{ messageId: 'ignored', data: { modifier: 'later' } }],
    },
    // A custom test function is reported once configured.
    {
      code: "scenario.skip('creates a task', () => {})",
      options: [{ testFunctions: ['scenario'] }],
      errors: [{ messageId: 'ignored', data: { modifier: 'skip' } }],
    },
    // A skipped describe holding a skipped test is two reports.
    {
      code: "describe.skip('create', () => {\n  it.skip('creates a task', () => {})\n})",
      errors: [
        { messageId: 'ignored', data: { modifier: 'skip' } },
        { messageId: 'ignored', data: { modifier: 'skip' } },
      ],
    },
  ],
})
