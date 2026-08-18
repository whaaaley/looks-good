import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './comment-wrap.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('comment-wrap', rule, {
  valid: [
    // Valid shapes.
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
    // A long standalone line is max-comment-length's business, not a wrap.
    { code: `// ${'x'.repeat(200)}.\nconst a = 1` },
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
  ],
  invalid: [
    // A wrapped pair under a raised limit joins rather than reporting length, which is the other rule's business.
    {
      code: `// ${'x'.repeat(60)}\n// and finishes here.\nconst a = 1`,
      output: `// ${'x'.repeat(60)} and finishes here.\nconst a = 1`,
      options: [{ maxLength: 200 }],
      errors: [{ messageId: 'join' }],
    },
    // Joining these would run past the limit, so it reports without rewriting.
    {
      code: `// ${'x'.repeat(80)}\n// ${'y'.repeat(80)}.\nconst a = 1`,
      output: null,
      errors: [{ messageId: 'tooLongToJoin' }],
    },
    // The guard measures the whole joined line, indentation and marker included.
    {
      code: `const run = () => {\n  // ${'x'.repeat(58)}\n  // and finishes here.\n}`,
      output: null,
      options: [{ maxLength: 80 }],
      errors: [{ messageId: 'tooLongToJoin' }],
    },
    // An empty continuation line joins without leaving a trailing space.
    {
      code: '// A short start\n//\nconst a = 1',
      output: '// A short start\nconst a = 1',
      errors: [{ messageId: 'join' }],
    },
    // A shorter pair joins as usual.
    {
      code: '// A short start\n// and a short end.\nconst a = 1',
      output: '// A short start and a short end.\nconst a = 1',
      options: [{ maxLength: 60 }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// A sentence that runs on\n// and finishes here.\nconst a = 1',
      output: '// A sentence that runs on and finishes here.\nconst a = 1',
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// See https://example.com/path\n// A following note.\nconst a = 1',
      output: '// See https://example.com/path A following note.\nconst a = 1',
      options: [{ allowUrls: false }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      output: '// The helper lives in `comment.utils` A following note.\nconst a = 1',
      options: [{ allowIdentifiers: false }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// Arrange the fixture\n// then act on it.\nconst a = 1',
      output: '// Arrange the fixture then act on it.\nconst a = 1',
      options: [{ allowLabels: [] }],
      errors: [{ messageId: 'join' }],
    },
  ],
})
