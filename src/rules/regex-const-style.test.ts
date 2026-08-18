import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './regex-const-style.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('regex-const-style', rule, {
  valid: [
    // A suffixed name with a trailing comment satisfies both checks.
    { code: 'const urlPattern = /https?:/ // Matches a url scheme.' },
    { code: 'export const trailingUrlPattern = /https?:$/ // Matches a url closing the line.' },
    // The bare lowercase suffix already says what the constant holds.
    { code: 'const pattern = /x/ // Matches the letter.' },
    // A dynamic expression is not the static literal this rule governs.
    { code: 'const matcher = new RegExp(source)' },
    // A non-regex constant is outside this rule whatever its name.
    { code: "const url = 'https://example.com'" },
    // With the comment check off, the suffix alone satisfies the rule.
    {
      code: 'const urlPattern = /https?:/',
      options: [{ requireComment: false }],
    },
    // A regex too wide for a shared line keeps its explanation directly above instead.
    { code: '// Matches a url scheme.\nconst urlPattern = /https?:/' },
    { code: '// Matches a url scheme.\nexport const urlPattern = /https?:/' },
    // A configured suffix replaces the default.
    {
      code: 'const urlRegex = /https?:/ // Matches a url scheme.',
      options: [{ suffix: 'Regex' }],
    },
  ],
  invalid: [
    // A bare noun name says nothing about holding a regular expression.
    {
      code: 'const url = /https?:/ // Matches a url scheme.',
      errors: [{ messageId: 'suffix' }],
    },
    {
      code: 'export const whitespace = /\\s/ // Matches one whitespace character.',
      errors: [{ messageId: 'suffix' }],
    },
    // A regex line without a comment leaves the pattern unexplained.
    {
      code: 'const urlPattern = /https?:/',
      errors: [{ messageId: 'comment' }],
    },
    // A blank line between the comment and the declaration orphans the explanation.
    {
      code: '// Matches a url scheme.\n\nconst urlPattern = /https?:/',
      errors: [{ messageId: 'comment' }],
    },
    // Both defects on one declaration yield both reports.
    {
      code: 'const url = /https?:/',
      errors: [{ messageId: 'suffix' }, { messageId: 'comment' }],
    },
    // The configured suffix is the one enforced, so the default suffix no longer passes.
    {
      code: 'const urlPattern = /https?:/ // Matches a url scheme.',
      options: [{ suffix: 'Regex' }],
      errors: [{ messageId: 'suffix' }],
    },
  ],
})
