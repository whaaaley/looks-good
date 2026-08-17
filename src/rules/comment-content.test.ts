import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './comment-content.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const markers = {
  forbid: [
    { pattern: '\\b(TODO|FIXME|HACK|XXX)\\b', message: 'a marker is deferred work nothing tracks' },
  ],
}

const trackers = {
  forbid: [
    { pattern: 'GH #\\d+|issue #\\d+', message: 'state the constraint rather than citing the tracker' },
  ],
}

tester.run('comment-content', rule, {
  valid: [
    // With nothing configured the rule forbids nothing.
    { code: '// TODO: something\nconst a = 1' },
    {
      code: '// A comment with no marker.\nconst a = 1',
      options: [markers],
    },
    {
      code: '// The word todo in prose is not a marker.\nconst a = 1',
      options: [markers],
    },
    {
      code: '// A comment citing nothing.\nconst a = 1',
      options: [trackers],
    },
    {
      code: '/* A block comment when they are allowed. */\nconst a = 1',
      options: [{ forbidBlockComments: false }],
    },
    // A pattern is matched against comment text, so code holding the word is untouched.
    {
      code: 'const TODO = 1',
      options: [markers],
    },
  ],
  invalid: [
    {
      code: '// TODO: finish this\nconst a = 1',
      options: [markers],
      errors: [{ messageId: 'forbidden', data: { message: 'a marker is deferred work nothing tracks' } }],
    },
    {
      code: '// FIXME: broken\nconst a = 1',
      options: [markers],
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: '// See GH #123 for the reason\nconst a = 1',
      options: [trackers],
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: '/* A block comment. */\nconst a = 1',
      options: [{ forbidBlockComments: true }],
      errors: [{ messageId: 'blockComment' }],
    },
    // A block comment is reported once, rather than also matching a forbidden pattern.
    {
      code: '/* TODO: finish this */\nconst a = 1',
      options: [{ ...markers, forbidBlockComments: true }],
      errors: [{ messageId: 'blockComment' }],
    },
    // Every configured pattern reports, so one comment can carry two problems.
    {
      code: '// TODO: see GH #123\nconst a = 1',
      options: [{ forbid: [...markers.forbid, ...trackers.forbid] }],
      errors: [{ messageId: 'forbidden' }, { messageId: 'forbidden' }],
    },
    {
      code: 'const a = 1 // HACK: works for now',
      options: [markers],
      errors: [{ messageId: 'forbidden' }],
    },
    // A pattern that does not compile reports as a configuration problem rather than crashing the run.
    {
      code: '// A plain comment.\nconst a = 1',
      options: [{ forbid: [{ pattern: '([', message: 'Never reached.' }] }],
      errors: [{ messageId: 'invalidPattern', data: { source: '([' } }],
    },
  ],
})
