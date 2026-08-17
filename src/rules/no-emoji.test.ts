import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-emoji.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-emoji', rule, {
  valid: [
    { code: 'const message = "Hello, world"' },
    { code: 'const message = `Hello, world`' },
    { code: '// A comment with no emoji.' },
    { code: 'const identifier = 1' },
    // Punctuation and symbols are not pictographs.
    { code: 'const symbols = "@#$%^&*() -- +/= <>"' },
    // A currency or maths symbol carries meaning that an emoji does not.
    { code: 'const price = "£10 ≈ $13"' },
    // An allowed emoji passes wherever it appears.
    {
      code: 'const status = "✅ done"',
      options: [{ allow: ['✅'] }],
    },
    // Each position can be turned off on its own.
    {
      code: 'const status = "🎉"',
      options: [{ strings: false }],
    },
    {
      code: '// A note with 🎉 in it.',
      options: [{ comments: false }],
    },
  ],
  invalid: [
    {
      code: 'const status = "Done 🎉"',
      errors: [{ messageId: 'emoji', data: { emoji: '🎉' } }],
    },
    {
      code: 'const status = `Done 🎉`',
      errors: [{ messageId: 'emoji' }],
    },
    {
      code: '// Ship it 🚀',
      errors: [{ messageId: 'emoji', data: { emoji: '🚀' } }],
    },
    {
      code: '/* Ship it 🚀 */',
      errors: [{ messageId: 'emoji' }],
    },
    // A comment reports at its own line rather than at the file start.
    {
      code: 'const a = 1\n// Ship it 🚀',
      errors: [{ messageId: 'emoji', line: 2 }],
    },
    // Every emoji in one string reports separately.
    {
      code: 'const status = "🎉 and 🚀"',
      errors: [{ messageId: 'emoji' }, { messageId: 'emoji' }],
    },
    // A skin tone modifier belongs to the emoji before it rather than reporting twice.
    {
      code: 'const wave = "👋🏽"',
      errors: [{ messageId: 'emoji', data: { emoji: '👋🏽' } }],
    },
    // A zero width joiner sequence is one emoji.
    {
      code: 'const family = "👨‍👩‍👧"',
      errors: [{ messageId: 'emoji', data: { emoji: '👨‍👩‍👧' } }],
    },
    // A flag is a pair of regional indicators.
    {
      code: 'const flag = "🇬🇧"',
      errors: [{ messageId: 'emoji', data: { emoji: '🇬🇧' } }],
    },
    // An emoji not on the allow list still reports.
    {
      code: 'const status = "✅ and 🎉"',
      options: [{ allow: ['✅'] }],
      errors: [{ messageId: 'emoji', data: { emoji: '🎉' } }],
    },
  ],
})
