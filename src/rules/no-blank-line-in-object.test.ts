import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { RuleTester } from 'eslint'
import rule, { blankLineRun } from './no-blank-line-in-object.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-blank-line-in-object', rule, {
  valid: [
    // Properties written against each other are the shape this rule wants.
    { code: 'const meta = {\n  a: 1,\n  b: 2,\n}' },
    // An object holding one property has no gap to hold.
    { code: 'const meta = {\n  a: 1,\n}' },
    // An empty object has no properties at all.
    { code: 'const meta = {}' },
    // A one line object cannot carry a blank line.
    { code: 'const meta = { a: 1, b: 2 }' },
    // A blank line inside a property value is the function's own formatting.
    { code: 'const meta = {\n  create: () => {\n    const value = 1\n\n    return value\n  },\n  b: 2,\n}' },
    // A blank line inside the last property value has no property after it to report.
    { code: 'const meta = {\n  a: 1,\n  create: () => {\n    const value = 1\n\n    return value\n  },\n}' },
    // Padding at the start of the object sits before the first property, which this rule leaves alone.
    { code: 'const meta = {\n\n  a: 1,\n  b: 2,\n}' },
    // Padding at the end of the object follows the last property, which this rule leaves alone.
    { code: 'const meta = {\n  a: 1,\n  b: 2,\n\n}' },
    // A comment written against the property above it separates nothing.
    { code: 'const meta = {\n  a: 1,\n  // Names the value.\n  b: 2,\n}' },
    // A blank line between array elements is the array's spacing, not the object's.
    { code: 'const meta = {\n  cases: [\n    1,\n\n    2,\n  ],\n}' },
    // A spread member is a member like any other when it sits against its neighbour.
    { code: 'const meta = {\n  ...base,\n  b: 2,\n}' },
    // The blank line blank-line-after-block requires after a nested brace is inside the value, so this rule leaves it alone.
    { code: 'const listeners = {\n  Program: () => {\n    if (a) {\n      run()\n    }\n\n    after()\n  },\n  CallExpression: () => {\n    run()\n  },\n}' },
  ],
  invalid: [
    // The shape that prompted this rule.
    {
      code: 'const meta = {\n  a: 1,\n\n  b: 2,\n}',
      output: 'const meta = {\n  a: 1,\n  b: 2,\n}',
      errors: [{ messageId: 'gap' }],
    },
    // A gap after a property whose value is a function still belongs to the object.
    {
      code: 'const listeners = {\n  Program: () => {\n    check()\n  },\n\n  CallExpression: () => {\n    check()\n  },\n}',
      output: 'const listeners = {\n  Program: () => {\n    check()\n  },\n  CallExpression: () => {\n    check()\n  },\n}',
      errors: [{ messageId: 'gap' }],
    },
    // Several gaps are each reported against the property they precede.
    {
      code: 'const meta = {\n  a: 1,\n\n  b: 2,\n\n  c: 3,\n}',
      output: 'const meta = {\n  a: 1,\n  b: 2,\n  c: 3,\n}',
      errors: [{ messageId: 'gap' }, { messageId: 'gap' }],
    },
    // More than one blank line closes to none.
    {
      code: 'const meta = {\n  a: 1,\n\n\n  b: 2,\n}',
      output: 'const meta = {\n  a: 1,\n  b: 2,\n}',
      errors: [{ messageId: 'gap' }],
    },
    // A gap above a comment is reported at the comment the reader sees first.
    {
      code: 'const meta = {\n  a: 1,\n\n  // Names the value.\n  b: 2,\n}',
      output: 'const meta = {\n  a: 1,\n  // Names the value.\n  b: 2,\n}',
      errors: [{ messageId: 'gap' }],
    },
    // A gap inside a nested object is reported against that object rather than the outer one.
    {
      code: 'const meta = {\n  docs: {\n    a: 1,\n\n    b: 2,\n  },\n}',
      output: 'const meta = {\n  docs: {\n    a: 1,\n    b: 2,\n  },\n}',
      errors: [{ messageId: 'gap' }],
    },
    // A gap before a spread member reads the same as one before a property.
    {
      code: 'const meta = {\n  a: 1,\n\n  ...base,\n}',
      output: 'const meta = {\n  a: 1,\n  ...base,\n}',
      errors: [{ messageId: 'gap' }],
    },
  ],
})

describe('All No Blank Line In Object Pattern Tests', () => {
  describe('blankLineRun', () => {
    it('closes a single blank line', () => {
      // Act
      const closed = ',\n\n  '.replace(blankLineRun, '\n')

      // Assert
      assertEquals(closed, ',\n  ')
    })

    it('closes a run of several blank lines', () => {
      // Act
      const closed = ',\n\n\n\n  '.replace(blankLineRun, '\n')

      // Assert
      assertEquals(closed, ',\n  ')
    })

    it('leaves text with no blank line alone', () => {
      // Act
      const closed = ',\n  '.replace(blankLineRun, '\n')

      // Assert
      assertEquals(closed, ',\n  ')
    })

    it('closes every gap in one pass', () => {
      // Act
      const closed = 'a\n\nb\n\nc'.replace(blankLineRun, '\n')

      // Assert
      assertEquals(closed, 'a\nb\nc')
    })

    it('leaves an empty string alone', () => {
      // Act
      const closed = ''.replace(blankLineRun, '\n')

      // Assert
      assertEquals(closed, '')
    })
  })
})
