import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-test-before-group.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-test-before-group', rule, {
  valid: [
    // Every test sits inside a group.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {",
        "    it('creates a task', () => {})",
        '  })',
        '})',
      ].join('\n'),
    },
    // A flat file of tests declares no group, so nothing is misplaced.
    {
      code: [
        "it('creates a task', () => {})",
        "it('deletes a task', () => {})",
      ].join('\n'),
    },
    // A group body holding only tests is flat one level down, and is left alone.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  it('deletes a task', () => {})",
        '})',
      ].join('\n'),
    },
    // A test after the last group is a different shape, so it is not reported.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  it('deletes a task', () => {})",
        '})',
      ].join('\n'),
    },
    // A call that is not a test or a group never places anything.
    {
      code: [
        "describe('All Task Tests', () => {",
        '  beforeAll(() => {})',
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
    },
    // A curried call names its function through another call, which resolves to no name.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  describe.each([1])('create', () => {})",
        '})',
      ].join('\n'),
    },
    // The test function is renamed away from the default, so `it` is not a test here.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ testFunctions: ['spec'] }],
    },
  ],
  invalid: [
    // A loose test sits above the first group in the file.
    {
      code: [
        "it('creates a task', () => {})",
        "describe('create', () => {})",
      ].join('\n'),
      errors: [{ messageId: 'before', data: { group: 'create' } }],
    },
    // The same shape one level down, inside a group body.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      errors: [{ messageId: 'before', data: { group: 'create' } }],
    },
    // Every test above the first group is reported, not only the first.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  test('reads a task', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      errors: [{ messageId: 'before' }, { messageId: 'before' }],
    },
    // A modifier resolves to its base name, so `it.only` is still a test and `describe.skip` still a group.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it.only('creates a task', () => {})",
        "  describe.skip('create', () => {})",
        '})',
      ].join('\n'),
      errors: [{ messageId: 'before', data: { group: 'create' } }],
    },
    // The group carries no string title, so the message names no group.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        '  describe(title, () => {})',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'beforeUntitled' }],
    },
    // Only the tests above the first group are reported, not the one after it.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  describe('create', () => {})",
        "  it('deletes a task', () => {})",
        '})',
      ].join('\n'),
      errors: [{ messageId: 'before', data: { group: 'create' } }],
    },
    // A renamed group function is what the test is measured against.
    {
      code: [
        "suite('All Task Tests', () => {",
        "  it('creates a task', () => {})",
        "  suite('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ groupFunctions: ['suite'] }],
      errors: [{ messageId: 'before', data: { group: 'create' } }],
    },
  ],
})
