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

// A replacement is the machine field the fixer reads, and the message stays human prose.
const fixingDashes = {
  restrict: [
    { chars: '—–', message: 'Start a new sentence rather than joining clauses with a dash.', replacement: '. ' },
  ],
}

const fixingPunctuation = {
  restrict: [
    { chars: '…', message: 'Write three dots instead.', replacement: '...' },
    { chars: '“”', message: 'Use a straight quote instead.', replacement: '"' },
  ],
}

// An astral character is two code units wide, so the replaced range has to be sized by the character itself.
const fixingAstral = {
  restrict: [
    { chars: '𝑥', message: 'Write a plain letter instead.', replacement: 'x' },
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
    // A restriction with no replacement stays report only, so a consumer configured before the fixer sees no rewrite.
    {
      code: '// An em dash — in a comment the fixer leaves alone.',
      options: [dashes],
      errors: 1,
      output: null,
    },
    // A replacement rewrites the comment in place.
    {
      code: '// An ellipsis … here.',
      options: [fixingPunctuation],
      errors: 1,
      output: '// An ellipsis ... here.',
    },
    // Two restricted characters on one line each fix at their own offset.
    {
      code: '// An ellipsis … and another … here.',
      options: [fixingPunctuation],
      errors: 2,
      output: '// An ellipsis ... and another ... here.',
    },
    // Two characters from different restrictions on one line fix independently.
    {
      code: '// An ellipsis … and a quote ” here.',
      options: [fixingPunctuation],
      errors: 2,
      output: '// An ellipsis ... and a quote " here.',
    },
    // Never dropping the character means a dash becomes a sentence break rather than joining the words.
    {
      code: '// One clause—another clause.',
      options: [fixingDashes],
      errors: 1,
      output: '// One clause. another clause.',
    },
    // A block comment is rewritten the same way.
    {
      code: '/* An ellipsis … here. */',
      options: [fixingPunctuation],
      errors: 1,
      output: '/* An ellipsis ... here. */',
    },
    // A surrogate pair is two code units wide, so a range sized at one would split it.
    {
      code: '// A letter 𝑥 here.',
      options: [fixingAstral],
      errors: 1,
      output: '// A letter x here.',
    },
    // A string and an identifier report without a fix, since a rewrite there can change what the program does.
    {
      code: 'const a = "an ellipsis … here"\n// An ellipsis … here.',
      options: [fixingPunctuation],
      errors: 2,
      output: 'const a = "an ellipsis … here"\n// An ellipsis ... here.',
    },
    // The allow list is honored before anything is fixed.
    {
      code: '// An ellipsis … and a quote ” here.',
      options: [{ ...fixingPunctuation, allow: ['…'] }],
      errors: 1,
      output: '// An ellipsis … and a quote " here.',
    },
  ],
})
