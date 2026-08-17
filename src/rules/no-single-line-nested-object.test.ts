import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-single-line-nested-object.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-single-line-nested-object', rule, {
  valid: [
    // The motivating call written multi-line, which is the shape the codebase settled on.
    { code: 'context.report({\n  loc: { line: comment.line, column: 0 },\n  messageId,\n})' },
    // A flat argument object nests nothing.
    { code: 'context.report({ node, messageId })' },
    // A nested object outside a call argument is a declaration, not a crowded call.
    { code: 'const meta = { docs: { url: link } }' },
    // A nested object in a multi-line declaration is likewise untouched.
    { code: 'const meta = {\n  docs: { url: link },\n}' },
    // An array argument holding objects is not an argument object nesting one.
    { code: 'run([{ code: 1 }, { code: 2 }])' },
    // A constructor argument is a new expression, which this rule leaves alone.
    { code: 'const tester = new RuleTester({ languageOptions: { parser: tsParser } })' },
    // An empty nested object holds nothing to split out, so the default threshold skips it.
    { code: 'context.report({ data: {}, messageId })' },
    // minNestedProperties above the nested size leaves the call alone.
    {
      code: 'context.report({ loc: { line: 1 }, messageId })',
      options: [{ minNestedProperties: 2 }],
    },
  ],
  invalid: [
    // The shape that prompted this rule.
    {
      code: 'context.report({ loc: { line: comment.line, column: 0 }, messageId, data })',
      errors: [{ messageId: 'nested' }],
    },
    // Depth three reports the level under the argument object, since that is the one crowding the call.
    {
      code: 'run({ a: { b: { c: 1 } } })',
      errors: [{ messageId: 'nested' }],
    },
  ],
})
