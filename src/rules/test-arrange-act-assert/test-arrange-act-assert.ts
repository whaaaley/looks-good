import { docUrl } from '../../utils/docs.utils.ts'
import { compilePattern } from '../../utils/regex.utils.ts'
import { calleeName, readBody, readTitle } from '../../utils/test.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Program } from 'estree'

type Options = {
  require: string[]
  order: string[]
  testFunctions: string[]
  allowTitles: string[]
}

const defaults: Options = {
  require: ['Act', 'Assert'],
  order: ['Arrange', 'Act', 'Assert'],
  testFunctions: ['it', 'test'],
  allowTitles: [],
}

type Placed = {
  label: string
  line: number
}

type Leader = {
  label: string
  rank: number
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

    // A label in require but not in order must still be counted, or its missing report could never be satisfied.
    const labels = new Set([...options.order, ...options.require])

    const checkPatterns = (program: Program): void => {
      for (const source of invalid) {
        context.report({
          node: program,
          messageId: 'invalidPattern',
          data: { source },
        })
      }
    }

    const checkTest = (node: CallExpression & Rule.NodeParentExtension): void => {
      if (!options.testFunctions.includes(calleeName(node))) return

      const title = readTitle(node)
      if (exempt.some((expression) => expression.test(title))) return

      // An empty body has no phases to label, so a pending test placeholder passes.
      const body = readBody(node)
      if (!body || body.type !== 'BlockStatement' || body.body.length === 0) {
        return
      }

      const placed: Placed[] = []
      const seen = new Set<string>()

      for (const comment of context.sourceCode.getCommentsInside(body)) {
        // Only a located line comment can label a phase, so a block comment or a comment with no position is skipped.
        if (comment.type !== 'Line' || !comment.loc) continue

        const text = comment.value.trim()
        if (!labels.has(text)) continue

        if (seen.has(text)) {
          context.report({
            loc: { line: comment.loc.start.line, column: 0 },
            messageId: 'duplicate',
            data: { label: text },
          })

          continue
        }

        seen.add(text)
        placed.push({ label: text, line: comment.loc.start.line })
      }

      for (const label of options.require) {
        if (seen.has(label)) continue

        context.report({
          node,
          messageId: 'missing',
          data: { label },
        })
      }

      // The highest-ranked label placed so far, so a label is out of order exactly when it ranks below the leader.
      let leader: Leader | null = null

      for (const entry of placed) {
        // A label outside the order carries no rank, so it sits anywhere without an order report.
        const rank = options.order.indexOf(entry.label)
        if (rank === -1) continue

        if (!leader || rank >= leader.rank) {
          leader = { label: entry.label, rank }
          continue
        }

        context.report({
          loc: { line: entry.line, column: 0 },
          messageId: 'order',
          data: { label: entry.label, previous: leader.label, expected: options.order.join(', then ') },
        })
      }
    }

    return {
      Program: checkPatterns,
      CallExpression: checkTest,
    }
  },
}

export default rule
