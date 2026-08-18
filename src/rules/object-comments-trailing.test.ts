import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './object-comments-trailing.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('object-comments-trailing', rule, {
  valid: [
    // A trailing comment names the property it sits beside.
    { code: 'const meta = {\n  fixable: undefined, // Rewriting prose changes what it says.\n}' },
    // An object holding no comments has nothing to place.
    { code: 'const meta = {\n  fixable: undefined,\n}' },
    // A comment above the object describes the object rather than a property.
    { code: '// The rule metadata.\nconst meta = {\n  fixable: undefined,\n}' },
    // A comment inside a function body is not inside an object literal.
    { code: 'const read = () => {\n  // Reads the value.\n  return 1\n}' },
    // A trailing comment on the opening line stays with it.
    { code: 'const meta = { // The rule metadata.\n  fixable: undefined,\n}' },
    // A comment between array elements describes an element, not an enclosing property.
    { code: 'const cases = {\n  valid: [\n    { code: 1 },\n    // Names the next case.\n    { code: 2 },\n  ],\n}' },
    // A comment inside a nested function body has a body to sit in, not an object.
    { code: 'const meta = {\n  create: () => {\n    // Reads the value.\n    return 1\n  },\n}' },
  ],
  invalid: [
    // The shape that prompted this rule.
    {
      code: 'const meta = {\n  defaultOptions: [defaults],\n  // Deciding what a marker said needs the user.\n  fixable: undefined,\n}',
      errors: [{ messageId: 'ownLine', line: 3 }],
    },
    // A comment above the first property is the same shape.
    {
      code: 'const meta = {\n  // The rule reports only.\n  fixable: undefined,\n}',
      errors: [{ messageId: 'ownLine', line: 2 }],
    },
    // A block comment on its own line reads the same way.
    {
      code: 'const meta = {\n  /* The rule reports only. */\n  fixable: undefined,\n}',
      errors: [{ messageId: 'ownLine', line: 2 }],
    },
    // Two own line comments are two reports.
    {
      code: 'const meta = {\n  // First.\n  a: 1,\n  // Second.\n  b: 2,\n}',
      errors: [
        { messageId: 'ownLine', line: 2 },
        { messageId: 'ownLine', line: 4 },
      ],
    },
    // A nested object is checked like any other.
    {
      code: 'const meta = {\n  docs: {\n    // Names the rule.\n    url: link,\n  },\n}',
      errors: [{ messageId: 'ownLine', line: 3 }],
    },
  ],
})
