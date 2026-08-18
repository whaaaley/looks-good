import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './blank-line-after-block.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('blank-line-after-block', rule, {
  valid: [
    // A blank line separates the brace from what follows.
    { code: 'if (a) {\n  read()\n}\n\nwrite()' },
    { code: 'for (const item of items) {\n  read(item)\n}\n\nwrite()' },
    { code: 'while (a) {\n  read()\n}\n\nwrite()' },
    { code: 'try {\n  read()\n} catch {\n  fail()\n}\n\nwrite()' },
    { code: 'switch (a) {\n  default:\n}\n\nwrite()' },
    // A block that ends the enclosing body has nothing to separate from.
    { code: 'if (a) {\n  read()\n}' },
    { code: 'const run = () => {\n  if (a) {\n    read()\n  }\n}' },
    // A comment after the blank line is separated like any statement.
    { code: 'if (a) {\n  read()\n}\n\n// Then write.\nwrite()' },
    // A statement that owns no block is not this rule.
    { code: 'const a = 1\nconst b = 2' },
    { code: 'read()\nwrite()' },
    // Consecutive braceless guards stay together.
    { code: 'const run = () => {\n  if (!a) return 1\n  if (!b) return 2\n\n  return 3\n}' },
    { code: 'for (const item of items) read(item)\nwrite()' },
    // An import against a brace is hoisted syntax, not a paragraph to separate.
    { code: "if (a) {\n  read()\n}\nimport b from 'c'" },
    // A statement outside the owner set ends in a brace without owning a paragraph.
    { code: 'const a = () => {\n  read()\n}\nb()' },
    { code: 'class A {\n  m() {}\n}\nb()' },
  ],
  invalid: [
    // The shape that prompted this rule.
    {
      code: 'if (a) {\n  read()\n}\nwrite()',
      errors: [{ messageId: 'touching' }],
      output: 'if (a) {\n  read()\n}\n\nwrite()',
    },
    // A loop closes the same way.
    {
      code: 'for (const item of items) {\n  read(item)\n}\nwrite()',
      errors: [{ messageId: 'touching' }],
      output: 'for (const item of items) {\n  read(item)\n}\n\nwrite()',
    },
    // A try closes on its last handler.
    {
      code: 'try {\n  read()\n} catch {\n  fail()\n}\nwrite()',
      errors: [{ messageId: 'touching' }],
      output: 'try {\n  read()\n} catch {\n  fail()\n}\n\nwrite()',
    },
    // A comment against the brace is what the reader sees, so it is what reports.
    {
      code: 'if (a) {\n  read()\n}\n// Then write.\nwrite()',
      errors: [{ messageId: 'touching' }],
      output: 'if (a) {\n  read()\n}\n\n// Then write.\nwrite()',
    },
    // A nested block reports inside its own body.
    {
      code: 'const run = () => {\n  if (a) {\n    read()\n  }\n  write()\n}',
      errors: [{ messageId: 'touching' }],
      output: 'const run = () => {\n  if (a) {\n    read()\n  }\n\n  write()\n}',
    },
    // A one-line block followed on the same line still gets a blank line, not just a break.
    {
      code: 'if (a) { read() } write()',
      errors: [{ messageId: 'touching' }],
      output: 'if (a) { read() }\n\n write()',
    },
    // Two touching blocks are two reports.
    {
      code: 'if (a) {\n  read()\n}\nif (b) {\n  write()\n}\nfinish()',
      errors: [
        { messageId: 'touching' },
        { messageId: 'touching' },
      ],
      output: 'if (a) {\n  read()\n}\n\nif (b) {\n  write()\n}\n\nfinish()',
    },
  ],
})
