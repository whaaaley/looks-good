import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-restricted-characters.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const dashes = {
  restrict: [
    { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.' },
  ],
}

const punctuation = {
  restrict: [
    { chars: '…', message: 'Write three dots instead.' },
    { chars: '“”‘’', message: 'Use a straight quote instead.' },
  ],
}

tester.run('no-restricted-characters', rule, {
  valid: [
    // With nothing configured the rule restricts nothing.
    { code: 'const a = "an em dash — here"' },
    {
      code: 'const a = "a hyphen - here"',
      options: [dashes],
    },
    {
      code: 'const a = "three dots ... here"',
      options: [punctuation],
    },
    {
      code: '// A comment with a hyphen - here.',
      options: [dashes],
    },
    // Each position can be turned off on its own.
    {
      code: 'const a = "an em dash — here"',
      options: [{ ...dashes, strings: false }],
    },
    {
      code: '// An em dash — here.',
      options: [{ ...dashes, comments: false }],
    },
  ],
  invalid: [
    {
      code: 'const a = "an em dash — here"',
      options: [dashes],
      errors: [{ messageId: 'restricted', data: { character: '—', message: 'Start a new sentence rather than joining clauses with a dash.' } }],
    },
    {
      code: 'const a = "an en dash – here"',
      options: [dashes],
      errors: [{ messageId: 'restricted', data: { character: '–', message: 'Start a new sentence rather than joining clauses with a dash.' } }],
    },
    {
      code: '// An em dash — here.',
      options: [dashes],
      errors: [{ messageId: 'restricted' }],
    },
    {
      code: 'const a = `an em dash — here`',
      options: [dashes],
      errors: [{ messageId: 'restricted' }],
    },
    // Every restricted character reports, so one string can carry two problems.
    {
      code: 'const a = "an ellipsis … and a curly quote ”"',
      options: [punctuation],
      errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
    },
    // A character repeated in one string reports once per occurrence.
    {
      code: 'const a = "— and —"',
      options: [dashes],
      errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
    },
    // A comment reports at its own line rather than at the file start.
    {
      code: 'const a = 1\n// An em dash — here.',
      options: [dashes],
      errors: [{ messageId: 'restricted', line: 2 }],
    },
    {
      code: 'const a = "…"',
      options: [{ restrict: [{ chars: '…', message: 'Write three dots instead.' }] }],
      errors: [{ messageId: 'restricted', data: { character: '…', message: 'Write three dots instead.' } }],
    },
  ],
})
