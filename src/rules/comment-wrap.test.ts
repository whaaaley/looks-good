import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './comment-wrap.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const join = { onWrap: 'join' } as const

tester.run('comment-wrap', rule, {
  valid: [
    // Shared valid shapes hold in both modes.
    { code: '// A single finished sentence.\nconst a = 1' },
    { code: '// A single finished sentence.\nconst a = 1', options: [join] },
    { code: '// First sentence.\n// Second sentence.\nconst a = 1' },
    { code: '// First sentence.\n// Second sentence.\nconst a = 1', options: [join] },
    // A directive is read by a tool, so joining it into the next line would break it.
    { code: '// eslint-disable-next-line no-console\n// A following note.\nconst a = 1' },
    { code: '// eslint-disable-next-line no-console\n// A following note.\nconst a = 1', options: [join] },
    { code: '// @ts-expect-error the shape is wrong here\n// A following note.\nconst a = 1' },
    { code: '// @ts-expect-error the shape is wrong here\n// A following note.\nconst a = 1', options: [join] },
    { code: '// deno-lint-ignore no-explicit-any\n// A following note.\nconst a = 1' },
    { code: '// deno-lint-ignore no-explicit-any\n// A following note.\nconst a = 1', options: [join] },
    // A comment above a directive is left alone too, since the join would consume it.
    { code: '// An unfinished thought\n// eslint-disable-next-line no-console\nconst a = 1' },
    { code: '// An unfinished thought\n// eslint-disable-next-line no-console\nconst a = 1', options: [join] },
    // Two sentences on one line are fine, since the line does not wrap.
    { code: '// First sentence. Second sentence.\nconst a = 1' },
    { code: '// First sentence. Second sentence.\nconst a = 1', options: [join] },
    { code: 'const a = 1 // A trailing comment.' },
    { code: 'const a = 1 // A trailing comment.', options: [join] },
    // Two trailing comments annotate their own lines rather than continuing each other.
    { code: "const a = [\n  'x', // the first\n  'y', // the second\n]" },
    { code: "const a = [\n  'x', // the first\n  'y', // the second\n]", options: [join] },
    { code: 'const a = 1' },
    { code: 'const a = 1', options: [join] },
    // A comment with no neighbour cannot be wrapping onto anything.
    { code: '// An unfinished thought\nconst a = 1' },
    { code: '// An unfinished thought\nconst a = 1', options: [join] },
    // A blank line between them means the second is a new comment rather than a continuation.
    { code: '// An unfinished thought\n\n// A separate note.\nconst a = 1' },
    { code: '// An unfinished thought\n\n// A separate note.\nconst a = 1', options: [join] },
    {
      code: '// See https://example.com/a/very/long/path\n// A following note.\nconst a = 1',
      options: [{ allowUrls: true }],
    },
    {
      code: '// See https://example.com/a/very/long/path\n// A following note.\nconst a = 1',
      options: [{ ...join, allowUrls: true }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      options: [{ allowIdentifiers: true }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      options: [{ ...join, allowIdentifiers: true }],
    },
    {
      code: '// Arrange\n// Act\nconst a = 1',
      options: [{ allowLabels: ['Arrange', 'Act', 'Assert'] }],
    },
    {
      code: '// Arrange\n// Act\nconst a = 1',
      options: [{ ...join, allowLabels: ['Arrange', 'Act', 'Assert'] }],
    },
    // A line inside the limit is left alone by the length check in both modes.
    {
      code: `// ${'x'.repeat(40)}\nconst a = 1`,
      options: [{ maxLength: 50 }],
    },
    {
      code: `// ${'x'.repeat(40)}\nconst a = 1`,
      options: [{ ...join, maxLength: 50 }],
    },
    // A label is exempt from the length check in both modes.
    {
      code: `// Arrange ${'x'.repeat(200)}\nconst a = 1`,
      options: [{ maxLength: 50 }],
    },
    {
      code: `// Arrange ${'x'.repeat(200)}\nconst a = 1`,
      options: [{ ...join, maxLength: 50 }],
    },
    // A directive is exempt from the length check in both modes.
    {
      code: `// @ts-expect-error ${'x'.repeat(200)}\nconst a = 1`,
      options: [{ maxLength: 50 }],
    },
    {
      code: `// @ts-expect-error ${'x'.repeat(200)}\nconst a = 1`,
      options: [{ ...join, maxLength: 50 }],
    },
  ],
  invalid: [
    // Report mode cases, preserved from comment-one-sentence-per-line.
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
    // Join mode cases, preserved from comment-reflow.
    // Joining these would run past the limit, so it reports without rewriting.
    {
      code: `// ${'x'.repeat(80)}\n// ${'y'.repeat(80)}.\nconst a = 1`,
      output: null,
      options: [join],
      errors: [{ messageId: 'tooLongToJoin' }],
    },
    // A shorter pair joins as usual.
    {
      code: '// A short start\n// and a short end.\nconst a = 1',
      output: '// A short start and a short end.\nconst a = 1',
      options: [{ ...join, maxLength: 60 }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// A sentence that runs on\n// and finishes here.\nconst a = 1',
      output: '// A sentence that runs on and finishes here.\nconst a = 1',
      options: [join],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// See https://example.com/path\n// A following note.\nconst a = 1',
      output: '// See https://example.com/path A following note.\nconst a = 1',
      options: [{ ...join, allowUrls: false }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// The helper lives in `comment.utils`\n// A following note.\nconst a = 1',
      output: '// The helper lives in `comment.utils` A following note.\nconst a = 1',
      options: [{ ...join, allowIdentifiers: false }],
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// Arrange the fixture\n// then act on it.\nconst a = 1',
      output: '// Arrange the fixture then act on it.\nconst a = 1',
      options: [{ ...join, allowLabels: [] }],
      errors: [{ messageId: 'join' }],
    },
    // maxLength means the same thing in both modes, so join mode reports a long standalone line too.
    {
      code: `// ${'x'.repeat(60)}\nconst a = 1`,
      output: null,
      options: [{ ...join, maxLength: 50 }],
      errors: [{ messageId: 'tooLong' }],
    },
    // There is nothing to join on a standalone line, so the report carries no fix.
    {
      code: `// ${'x'.repeat(60)}.\nconst a = 1`,
      output: null,
      options: [{ ...join, maxLength: 50 }],
      errors: [{ messageId: 'tooLong' }],
    },
    // A pair whose first line is too long yields the length report alone, in both modes.
    {
      code: `// ${'x'.repeat(60)}\n// and finishes here.\nconst a = 1`,
      options: [{ maxLength: 50 }],
      errors: [{ messageId: 'tooLong' }],
    },
    {
      code: `// ${'x'.repeat(60)}\n// and finishes here.\nconst a = 1`,
      output: null,
      options: [{ ...join, maxLength: 50 }],
      errors: [{ messageId: 'tooLong' }],
    },
    // A pair whose second line is too long is reported for the wrap and for that line's length.
    {
      code: `// A sentence that runs on\n// ${'x'.repeat(60)}.\nconst a = 1`,
      options: [{ maxLength: 50 }],
      errors: [{ messageId: 'wrapped', line: 1 }, { messageId: 'tooLong', line: 2 }],
    },
    // Joining that pair would run past the limit, so tooLongToJoin stands beside the length report.
    {
      code: `// A sentence that runs on\n// ${'x'.repeat(60)}.\nconst a = 1`,
      output: null,
      options: [{ ...join, maxLength: 50 }],
      errors: [{ messageId: 'tooLongToJoin', line: 1 }, { messageId: 'tooLong', line: 2 }],
    },
  ],
})
