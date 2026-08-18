import { isLineComment } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import { compilePattern } from '../utils/regex.utils.ts'
import { calleeName, readBody, readTitle } from '../utils/test.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Program } from 'estree'

type Options = {
  require: string[]
  order: string[]
  testFunctions: string[]
  allowTitles: string[]
  minStatements: number
}

const defaults: Options = {
  require: ['Act', 'Assert'],
  order: ['Arrange', 'Act', 'Assert'],
  testFunctions: ['it', 'test'],
  allowTitles: [],
  minStatements: 2,
}

type Placed = {
  label: string
  line: number
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires test bodies to be labelled with Arrange, Act, and Assert comments',
      url: docUrl('test-arrange-act-assert'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        require: { type: 'array', items: { type: 'string', minLength: 1 } },
        order: { type: 'array', items: { type: 'string', minLength: 1 } },
        testFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
        allowTitles: { type: 'array', items: { type: 'string', minLength: 1 } },
        minStatements: { type: 'integer', minimum: 0 },
      },
    }],
    messages: {
      missing: "This test body has no '// {{label}}' comment. Label the {{label}} step so the phases of the test read apart.",
      order: "The '// {{label}}' comment comes after '// {{previous}}'. Move it above so the body reads {{expected}}.",
      duplicate: "This body labels '// {{label}}' more than once. Keep one label per phase, or split the extra phase into its own test.",
      invalidPattern: "The allowed title '{{source}}' is not a valid regular expression. Correct it in this rule's configuration.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const exempt: RegExp[] = []
    const invalid: string[] = []

    for (const source of options.allowTitles) {
      const expression = compilePattern({ source, flags: 'u' })

      if (!expression) {
        invalid.push(source)
        continue
      }

      exempt.push(expression)
    }

    const labels = new Set(options.order)

    return {
      'Program:exit': (program: Program): void => {
        for (const source of invalid) {
          context.report({
            node: program,
            messageId: 'invalidPattern',
            data: { source },
          })
        }
      },
      CallExpression: (node: CallExpression & Rule.NodeParentExtension): void => {
        if (!options.testFunctions.includes(calleeName(node))) return

        const title = readTitle(node)
        if (exempt.some((expression) => expression.test(title))) return

        const body = readBody(node)
        if (!body || body.type !== 'BlockStatement') return
        if (body.body.length < options.minStatements) return

        const placed: Placed[] = []
        const counts = new Map<string, number>()

        for (const comment of context.sourceCode.getCommentsInside(body)) {
          if (!isLineComment(comment)) continue

          const text = comment.value.trim()
          if (!labels.has(text)) continue

          const seen = (counts.get(text) ?? 0) + 1
          counts.set(text, seen)

          if (seen > 1) {
            context.report({
              loc: { line: comment.loc?.start.line ?? body.loc?.start.line ?? 1, column: 0 },
              messageId: 'duplicate',
              data: { label: text },
            })

            continue
          }

          placed.push({ label: text, line: comment.loc?.start.line ?? 1 })
        }

        for (const label of options.require) {
          if (counts.has(label)) continue

          context.report({
            node,
            messageId: 'missing',
            data: { label },
          })
        }

        let highest = -1
        let previous = ''

        for (const entry of placed) {
          const rank = options.order.indexOf(entry.label)

          if (rank < highest) {
            context.report({
              loc: { line: entry.line, column: 0 },
              messageId: 'order',
              data: { label: entry.label, previous, expected: options.order.join(', then ') },
            })

            continue
          }

          highest = rank
          previous = entry.label
        }
      },
    }
  },
}

export default rule
