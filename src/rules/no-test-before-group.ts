import { docUrl } from '../utils/docs.utils.ts'
import { calleeName, readBody, readTitle } from '../utils/test.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Node } from 'estree'

type Options = {
  testFunctions: string[]
  groupFunctions: string[]
}

const defaults: Options = {
  testFunctions: ['it', 'test'],
  groupFunctions: ['describe'],
}

// A statement counts as a call only when it is a bare call, so an assignment or a return is skipped.
const readCall = (statement: Node): CallExpression | null => {
  if (statement.type !== 'ExpressionStatement') return null
  if (statement.expression.type !== 'CallExpression') return null

  return statement.expression
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports a test written above the first group in the same body',
      url: docUrl('no-test-before-group'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        testFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
        groupFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
      },
    }],
    messages: {
      before: "This test sits above the '{{group}}' group. Move it inside the group it belongs to, so it does not read as the primary behaviour here.",
      beforeUntitled: 'This test sits above the first group below it. Move it inside the group it belongs to, so it does not read as the primary behaviour here.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    // Reports every test statement that precedes the first group call in one body.
    const checkBody = (statements: Node[]): void => {
      const loose: CallExpression[] = []

      for (const statement of statements) {
        const call = readCall(statement)
        if (!call) continue

        const name = calleeName(call)

        if (options.groupFunctions.includes(name)) {
          const title = readTitle(call)

          for (const test of loose) {
            context.report({
              node: test,
              messageId: title ? 'before' : 'beforeUntitled',
              data: { group: title },
            })
          }

          return
        }

        if (options.testFunctions.includes(name)) loose.push(call)
      }
      // A body with no group has nothing to sit above, so a flat run of tests is left alone.
    }

    return {
      'Program:exit': (): void => {
        checkBody(context.sourceCode.ast.body)
      },
      CallExpression: (node: CallExpression): void => {
        if (!options.groupFunctions.includes(calleeName(node))) return

        const body = readBody(node)
        if (!body) return

        checkBody(body.body)
      },
    }
  },
}

export default rule
