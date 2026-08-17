import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import { buildTextListener } from './textScan.utils.ts'
import type { TextFinding, TextPositions } from './textScan.utils.ts'
import type { Rule } from 'eslint'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const defaults: TextPositions = {
  strings: true,
  comments: true,
  identifiers: true,
}

// Reports every `x`, so a case's error count states exactly which text positions were visited.
const scan = (text: string): TextFinding[] => {
  return [...text].filter((character) => character === 'x').map(() => ({ found: 'x' }))
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          strings: { type: 'boolean' },
          comments: { type: 'boolean' },
          identifiers: { type: 'boolean' },
        },
      },
    ],
    messages: {
      found: "Found '{{found}}'",
    },
  },

  create(context): Rule.RuleListener {
    const positions: TextPositions = { ...defaults, ...context.options[0] }

    return buildTextListener({ context, positions, scan, messageId: 'found' })
  },
}

const tester = new RuleTester()

tester.run('buildTextListener', rule, {
  valid: [
    { code: 'const a = "clean"' },
    { code: '// A clean comment.' },
    // A position that is turned off is never visited.
    {
      code: 'const a = "xx"',
      options: [{ strings: false, identifiers: false }],
    },
    {
      code: '// x',
      options: [{ comments: false }],
    },
    {
      code: 'const x = 1',
      options: [{ identifiers: false }],
    },
    // A non-string literal carries no text to scan.
    {
      code: 'const a = 0',
      options: [{ identifiers: false }],
    },
  ],
  invalid: [
    {
      code: 'const a = "x"',
      options: [{ identifiers: false }],
      errors: [{ messageId: 'found', data: { found: 'x' } }],
    },
    // A template is read through its raw text.
    {
      code: 'const a = `x`',
      options: [{ identifiers: false }],
      errors: 1,
    },
    {
      code: 'const x = 1',
      options: [{ strings: false }],
      errors: 1,
    },
    // Each finding in one piece of text reports on its own.
    {
      code: 'const a = "xx"',
      options: [{ identifiers: false }],
      errors: 2,
    },
    // A comment has no node, so its report lands at the start of its own line.
    {
      code: '// x',
      errors: [{ messageId: 'found', line: 1, column: 1 }],
    },
  ],
})
