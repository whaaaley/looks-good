import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './comment-reflow.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('comment-reflow', rule, {
  valid: [
    { code: '// A single finished sentence.\nconst a = 1' },
    { code: '// First sentence.\n// Second sentence.\nconst a = 1' },
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
    // Reflow moves text without rewriting it, so a merely long sentence is left alone.
    { code: `// ${'x'.repeat(200)}\nconst a = 1` },
  ],
  invalid: [
    {
      code: '// A sentence that runs on\n// and finishes here.\nconst a = 1',
      output: '// A sentence that runs on and finishes here.\nconst a = 1',
      errors: [{ messageId: 'join' }],
    },
    {
      code: '// First sentence. Second sentence.\nconst a = 1',
      output: '// First sentence.\n// Second sentence.\nconst a = 1',
      errors: [{ messageId: 'split' }],
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
    // An indented comment keeps its indentation when it splits.
    {
      code: 'function a() {\n  // First. Second.\n}',
      output: 'function a() {\n  // First.\n  // Second.\n}',
      errors: [{ messageId: 'split' }],
    },
  ],
})
