import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './comment-one-sentence-per-line.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('comment-one-sentence-per-line', rule, {
  valid: [
    { code: '// A single finished sentence.\nconst a = 1' },
    { code: '// First sentence.\n// Second sentence.\nconst a = 1' },
    // A directive is read by a tool, so joining it into the next line would break it.
    { code: '// eslint-disable-next-line no-console\n// A following note.\nconst a = 1' },
    { code: '// @ts-expect-error the shape is wrong here\n// A following note.\nconst a = 1' },
    { code: '// deno-lint-ignore no-explicit-any\n// A following note.\nconst a = 1' },
    // A comment above a directive is left alone too, since the join would consume it.
    { code: '// An unfinished thought\n// eslint-disable-next-line no-console\nconst a = 1' },
    // Two sentences on one line are fine, since the line does not wrap.
    { code: '// First sentence. Second sentence.\nconst a = 1' },
    { code: 'const a = 1 // A trailing comment.' },
    // Two trailing comments annotate their own lines rather than continuing each other.
    { code: "const a = [\n  'x', // the first\n  'y', // the second\n]" },
    { code: 'const a = 1' },
    // A comment with no neighbour cannot be wrapping onto anything.
    { code: '// An unfinished thought\nconst a = 1' },
    // A blank line between them means the second is a new comment rather than a continuation.
    { code: '// An unfinished thought\n\n// A separate note.\nconst a = 1' },
    {
      code: '// See https://example.com/a/very/long/path\n// A following note.\nconst a = 1',
      options: [{ allowUrls: true }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      options: [{ allowIdentifiers: true }],
    },
    {
      code: '// Arrange\n// Act\nconst a = 1',
      options: [{ allowLabels: ['Arrange', 'Act', 'Assert'] }],
    },
    {
      code: `// ${'x'.repeat(40)}\nconst a = 1`,
      options: [{ maxLength: 50 }],
    },
  ],
  invalid: [
    {
      code: '// A sentence that runs on\n// and finishes here.\nconst a = 1',
      errors: [{ messageId: 'wrapped' }],
    },
    {
      code: `// ${'x'.repeat(60)}\nconst a = 1`,
      options: [{ maxLength: 50 }],
      errors: [{ messageId: 'tooLong' }],
    },
    {
      code: '// See https://example.com/path\n// A following note.\nconst a = 1',
      options: [{ allowUrls: false }],
      errors: [{ messageId: 'wrapped' }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      options: [{ allowIdentifiers: false }],
      errors: [{ messageId: 'wrapped' }],
    },
    {
      code: '// Arrange the fixture\n// then act on it.\nconst a = 1',
      options: [{ allowLabels: [] }],
      errors: [{ messageId: 'wrapped' }],
    },
  ],
})
