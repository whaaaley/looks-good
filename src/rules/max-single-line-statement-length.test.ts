import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { RuleTester } from 'eslint'
import rule, { leadingWhitespacePattern } from './max-single-line-statement-length.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

// A return needs a function around it and a continue needs a loop, so each case carries its own.
const inFunction = (body: string): string => `const read = () => {\n  ${body}\n}`
const inLoop = (body: string): string => `for (const item of items) {\n  ${body}\n}`

const wide = 'forbidden.length === 0 && invalid.length === 0 && !options.forbidBlockComments'

tester.run('max-single-line-statement-length', rule, {
  valid: [
    // A short body reads fine on the line it guards.
    { code: inFunction("if (!first) return ''") },
    { code: inFunction('if (done) return') },
    { code: inLoop('if (skip) continue') },
    { code: inLoop('if (last) break') },
    // A braced body is its own paragraph however wide the condition runs.
    { code: inFunction(`if (${wide}) {\n    return {}\n  }`) },
    // A body already on its own line is not the single line form.
    { code: inFunction(`if (${wide})\n    return {}`) },
    // A short braceless else reads fine on its line.
    { code: inFunction("if (!first) return ''\n  else return 'rest'") },
    // A braced else is its own paragraph however wide its line runs.
    { code: inFunction(`if (first) {\n    return ''\n  } else {\n    return ${wide}\n  }`) },
    // A wider limit accepts a line the default would report.
    {
      code: inFunction(`if (${wide}) return {}`),
      options: [{ maxLength: 120 }],
    },
  ],
  invalid: [
    // The line that prompted this rule, and the braces the fix writes.
    {
      code: inFunction(`if (${wide}) return {}`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (${wide}) {\n    return {}\n  }`),
    },
    // A throw is the same shape as a return.
    {
      code: inFunction(`if (${wide}) throw new Error('nothing configured')`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (${wide}) {\n    throw new Error('nothing configured')\n  }`),
    },
    // So is a continue.
    {
      code: inLoop(`if (${wide}) continue`),
      errors: [{ messageId: 'tooLong' }],
      output: inLoop(`if (${wide}) {\n    continue\n  }`),
    },
    // A trailing line comment annotated the body, so it moves inside the braces with it.
    {
      code: inFunction(`if (${wide}) return {} // explains the branch`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (${wide}) {\n    return {} // explains the branch\n  }`),
    },
    // A block comment on the same line moves the same way.
    {
      code: inFunction(`if (${wide}) return {} /* explains */`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (${wide}) {\n    return {} /* explains */\n  }`),
    },
    // A comment on the next line annotates that line, so the fix leaves it alone.
    {
      code: inFunction(`if (${wide}) return {}\n  // annotates the close`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (${wide}) {\n    return {}\n  }\n  // annotates the close`),
    },
    // A braceless else body on the same line as its else gets the same braces.
    {
      code: inFunction(`if (first) {\n    return ''\n  } else return ${wide}`),
      errors: [{ messageId: 'tooLong' }],
      output: inFunction(`if (first) {\n    return ''\n  } else {\n    return ${wide}\n  }`),
    },
    // An enclosing brace on the same line is not a trailing comment, so the fix leaves it be.
    {
      code: `const read = () => { if (${wide}) return {} }`,
      errors: [{ messageId: 'tooLong' }],
      output: `const read = () => { if (${wide}) {\n  return {}\n} }`,
    },
    // A narrower limit reports a line the default would accept.
    {
      code: inFunction("if (!first) return ''"),
      options: [{ maxLength: 10 }],
      errors: [{ messageId: 'tooLong', data: { length: '23', maxLength: '10' } }],
      output: inFunction("if (!first) {\n    return ''\n  }"),
    },
  ],
})

describe('All Max Single Line Statement Length Pattern Tests', () => {
  describe('leadingWhitespacePattern', () => {
    it('captures the indent of an indented line', () => {
      // Act
      const [indent = ''] = '    if (ready) return'.match(leadingWhitespacePattern) ?? []

      // Assert
      assertEquals(indent, '    ')
    })

    it('captures an empty indent for a line starting at the margin', () => {
      // Act
      const [indent = ''] = 'if (ready) return'.match(leadingWhitespacePattern) ?? []

      // Assert
      assertEquals(indent, '')
    })

    it('captures a tab indent', () => {
      // Act
      const [indent = ''] = '\t\tif (ready) return'.match(leadingWhitespacePattern) ?? []

      // Assert
      assertEquals(indent, '\t\t')
    })

    it('captures an empty indent for an empty line', () => {
      // Act
      const [indent = ''] = ''.match(leadingWhitespacePattern) ?? []

      // Assert
      assertEquals(indent, '')
    })
  })
})
