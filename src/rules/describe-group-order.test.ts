import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './describe-group-order.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const crudl = ['create', 'read', 'update', 'list', '*', 'delete']

// Every message names the configured sequence, so each expected error repeats it.
const crudlOrder = crudl.join(', then ')
const pairOrder = 'create, then delete'

tester.run('describe-group-order', rule, {
  valid: [
    // The groups already read in the configured order.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('read', () => {})",
        "  describe('update', () => {})",
        "  describe('list', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // An empty sequence is inert, so nothing is checked.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('delete', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
    },
    // A group named by no entry sits in the wildcard slot between list and delete.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('list', () => {})",
        "  describe('archive', () => {})",
        "  describe('restore', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // requireAll is off, so a missing group is fine.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // requireAll is on and every named group is present.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('read', () => {})",
        "  describe('update', () => {})",
        "  describe('list', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl, requireAll: true }],
    },
    // Word matching lets a longer title carry the name.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create a task', () => {})",
        "  describe('soft delete and restore', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // Exact matching leaves a longer title unranked, so it is unconstrained.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('soft delete and restore', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'], match: 'exact' }],
    },
    // ignoreCase defaults on, so a capitalised title still matches.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('Create', () => {})",
        "  describe('Delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'] }],
    },
    // ignoreCase off leaves a capitalised title unranked, so order is not enforced on it.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('Delete', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'], ignoreCase: false }],
    },
    // Two groups in different parents are unrelated and are never compared.
    {
      code: [
        "describe('read paths', () => {",
        "  describe('delete', () => {})",
        '})',
        "describe('write paths', () => {",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // depth top checks the outermost groups only, so a nested pair is left alone.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {",
        "    describe('delete', () => {})",
        "    describe('create', () => {})",
        '  })',
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl, depth: 'top' }],
    },
    // A file with a single group has nothing to order.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // describe.only is still a group and this pair is in order.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe.only('create', () => {})",
        "  describe.skip('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // Groups written at the top level of the file are siblings and are in order.
    {
      code: [
        "describe('create', () => {})",
        "describe('delete', () => {})",
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
    // A call that is not a group function is left alone.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  it('deletes a task', () => {})",
        "  it('creates a task', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
    },
  ],
  invalid: [
    // Delete placed above list reads backwards.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('delete', () => {})",
        "  describe('list', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
      errors: [{ messageId: 'order', data: { title: 'list', previous: 'delete', expected: crudlOrder }, line: 4 }],
    },
    // An unnamed group after delete falls outside the wildcard slot.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('delete', () => {})",
        "  describe('archive', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
      errors: [{ messageId: 'order', data: { title: 'archive', previous: 'delete', expected: crudlOrder }, line: 4 }],
    },
    // requireAll names the group that is absent.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('read', () => {})",
        "  describe('list', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl, requireAll: true }],
      errors: [{ messageId: 'missing', data: { name: 'update', expected: crudlOrder }, line: 1 }],
    },
    // requireAll reports each absent group separately.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {})",
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'read', 'update', 'delete'], requireAll: true }],
      errors: [
        { messageId: 'missing', data: { name: 'read', expected: 'create, then read, then update, then delete' } },
        { messageId: 'missing', data: { name: 'update', expected: 'create, then read, then update, then delete' } },
      ],
    },
    // Word matching ranks a longer title, so this pair is out of order.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('soft delete and restore', () => {})",
        "  describe('create a task', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'] }],
      errors: [{ messageId: 'order', data: { title: 'create a task', previous: 'soft delete and restore', expected: pairOrder }, line: 3 }],
    },
    // Exact matching still ranks an exactly equal title.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('delete', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'], match: 'exact' }],
      errors: [{ messageId: 'order', data: { title: 'create', previous: 'delete', expected: pairOrder }, line: 3 }],
    },
    // ignoreCase on ranks a capitalised title, so the pair reports.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('Delete', () => {})",
        "  describe('Create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: ['create', 'delete'] }],
      errors: [{ messageId: 'order', data: { title: 'Create', previous: 'Delete', expected: pairOrder }, line: 3 }],
    },
    // depth any reaches the nested pair as well as the outer one.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe('create', () => {",
        "    describe('delete', () => {})",
        "    describe('create', () => {})",
        '  })',
        "  describe('delete', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
      errors: [{ messageId: 'order', data: { title: 'create', previous: 'delete', expected: crudlOrder }, line: 4 }],
    },
    // describe.only counts as a group, so this pair is compared.
    {
      code: [
        "describe('All Task Tests', () => {",
        "  describe.only('delete', () => {})",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl }],
      errors: [{ messageId: 'order', data: { title: 'create', previous: 'delete', expected: crudlOrder }, line: 3 }],
    },
    // Groups at the top level of the file are siblings and are ordered too.
    {
      code: [
        "describe('delete', () => {})",
        "describe('create', () => {})",
      ].join('\n'),
      options: [{ sequence: crudl }],
      errors: [{ messageId: 'order', data: { title: 'create', previous: 'delete', expected: crudlOrder }, line: 2 }],
    },
    // A custom group function is checked once it is named.
    {
      code: [
        "suite('All Task Tests', () => {",
        "  suite('delete', () => {})",
        "  suite('create', () => {})",
        '})',
      ].join('\n'),
      options: [{ sequence: crudl, testFunctions: ['suite'] }],
      errors: [{ messageId: 'order', data: { title: 'create', previous: 'delete', expected: crudlOrder }, line: 3 }],
    },
  ],
})
