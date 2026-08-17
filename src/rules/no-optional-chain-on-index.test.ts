import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-optional-chain-on-index.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-optional-chain-on-index', rule, {
  valid: [
    // The element is named, so the guard reads as a decision rather than a shrug.
    { code: 'const read = () => {\n  const [first] = items\n  if (!first) return\n  return first.name\n}' },
    // Optional chaining on a named property is not an index read.
    { code: 'const a = user?.name' },
    { code: 'const a = user?.address?.city' },
    // A computed read with no optional chain states that the element is there.
    { code: 'const a = items[0].name' },
    { code: 'const a = items[index]' },
    // An optional call on a named property is likewise not an index read.
    { code: 'callbacks.onDone?.()' },
    { code: 'const a = map.get(key)?.value' },
  ],
  invalid: [
    {
      code: 'const a = items[0]?.name',
      errors: [{ messageId: 'chained' }],
    },
    {
      code: 'const a = items[index]?.name',
      errors: [{ messageId: 'chained' }],
    },
    {
      code: 'const a = lines[line - 1]?.trim()',
      errors: [{ messageId: 'chained' }],
    },
    // One optional read over one computed object, so one report rather than two.
    {
      code: 'const a = matrix[0]?.[1]',
      errors: [{ messageId: 'chained' }],
    },
    {
      code: 'handlers[name]?.()',
      errors: [{ messageId: 'chained' }],
    },
    // The report points at the index read rather than the statement holding it.
    {
      code: 'const done = items[0]?.done',
      errors: [{ messageId: 'chained', column: 14 }],
    },
  ],
})
