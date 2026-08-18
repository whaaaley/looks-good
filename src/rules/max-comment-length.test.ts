import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './max-comment-length.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const prose = (length: number): string => 'a'.repeat(length)

tester.run('max-comment-length', rule, {
  valid: [
    // A comment line at the bound passes, since the bound is inclusive.
    { code: `// ${prose(117)}\nconst a = 1` },
    // A trailing comment counts the whole line, and this one stays inside it.
    { code: `const a = 1 // ${prose(50)}` },
    // A code line with no comment is outside this rule, however long it runs.
    { code: `const a = '${prose(200)}'` },
    // A url has no natural break, so the line carrying one is exempt.
    { code: `// See https://example.com/${prose(120)}\nconst a = 1` },
    // A directive is read by a tool, so its length is not the writer's to shorten.
    { code: `// @ts-expect-error ${prose(120)}\nconst a = 1` },
    // A raised bound admits the line the default would report.
    {
      code: `// ${prose(150)}\nconst a = 1`,
      options: [{ maxLength: 200 }],
    },
  ],
  invalid: [
    // A standalone comment past the bound reports.
    {
      code: `// ${prose(120)}\nconst a = 1`,
      errors: [{ messageId: 'tooLong' }],
    },
    // A trailing comment reports when code plus comment overrun the line.
    {
      code: `const a = 1 // ${prose(110)}`,
      errors: [{ messageId: 'tooLong' }],
    },
    // A block comment reports each overlong line it spans once.
    {
      code: `/* ${prose(120)}\n${prose(130)} */\nconst a = 1`,
      errors: [{ messageId: 'tooLong' }, { messageId: 'tooLong' }],
    },
    // Two comments sharing one overlong line yield a single report, not one per comment.
    {
      code: `/* first */ /* second */ const a = '${prose(120)}' // third`,
      errors: [{ messageId: 'tooLong' }],
    },
    // A lowered bound reports a line the default would pass.
    {
      code: `// ${prose(50)}\nconst a = 1`,
      options: [{ maxLength: 40 }],
      errors: [{ messageId: 'tooLong' }],
    },
  ],
})
