import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './array-bracket-hug.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('array-bracket-hug', rule, {
  valid: [
    // The compact chain is the enforced shape.
    { code: 'const s = [{\n  a: 1,\n}, {\n  b: 2,\n}]' },
    { code: 'const s = [{\n  a: 1,\n}]' },
    // A single-line array has nothing to hug.
    { code: 'const s = [{ a: 1 }, { b: 2 }]' },
    // An array with any non-object element is left as written.
    { code: "const d = [\n  'one',\n  'two',\n]" },
    { code: 'const m = [\n  1,\n  { a: 1 },\n]' },
    // An empty array has no elements to hug.
    { code: 'const e = []' },
    // A hole is not an object literal, so the array is left as written.
    { code: 'const h = [\n  ,\n  { a: 1 },\n]' },
    // A list of single-line objects reads as a list, not a chain.
    { code: 'const l = [\n  { a: 1 },\n  { b: 2 },\n]' },
    // A comment between the brackets anchors the expanded form, so the whole array is left as written.
    { code: 'const s = [\n  // note\n  {\n    a: 1,\n  },\n]' },
    { code: 'const s = [\n  {\n    a: 1,\n  },\n  // note\n  {\n    b: 2,\n  },\n]' },
    { code: 'const s = [\n  {\n    a: 1,\n  }, // note\n  {\n    b: 2,\n  },\n]' },
    { code: 'const s = [\n  {\n    a: 1,\n  },\n  // note\n]' },
  ],
  invalid: [
    // An expanded array of objects collapses into the compact chain.
    {
      code: 'const s = [\n  {\n    a: 1,\n  },\n  {\n    b: 2,\n  },\n]',
      output: 'const s = [{\n    a: 1,\n  }, {\n    b: 2,\n  }]',
      errors: [{ messageId: 'hugOpen' }, { messageId: 'hugSeam' }, { messageId: 'hugClose' }],
    },
    // A single-element array hugs both brackets.
    {
      code: 'const s = [\n  {\n    a: 1,\n  },\n]',
      output: 'const s = [{\n    a: 1,\n  }]',
      errors: [{ messageId: 'hugOpen' }, { messageId: 'hugClose' }],
    },
    // A partly hugged array reports only the seams still open.
    {
      code: 'const s = [{\n  a: 1,\n},\n{\n  b: 2,\n}]',
      output: 'const s = [{\n  a: 1,\n}, {\n  b: 2,\n}]',
      errors: [{ messageId: 'hugSeam' }],
    },
    // Without a trailing comma the closing bracket still folds up.
    {
      code: 'const s = [\n  {\n    a: 1,\n  }\n]',
      output: 'const s = [{\n    a: 1,\n  }]',
      errors: [{ messageId: 'hugOpen' }, { messageId: 'hugClose' }],
    },
    // A comment inside an element still hugs, since the comment rides inside its object.
    {
      code: 'const s = [\n  {\n    a: 1, // note\n  },\n]',
      output: 'const s = [{\n    a: 1, // note\n  }]',
      errors: [{ messageId: 'hugOpen' }, { messageId: 'hugClose' }],
    },
  ],
})
