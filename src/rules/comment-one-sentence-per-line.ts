import { isAdjacent, looksUnfinished, readLineComments, startsWithLabel } from '../utils/comment.utils.ts'
import type { Rule } from 'eslint'

const defaults = {
  maxLength: 120,
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

// A second sentence hides behind the first when a reader scans the line.
const twoSentences = /^(.*?[.!?])\s+(\S.*[.!?])\s*$/

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'A comment sentence fits on one line and a line holds one sentence',
    },
    // Rewriting prose changes what it says, so this rule reports and never fixes.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          maxLength: { type: 'integer', minimum: 1 },
          allowUrls: { type: 'boolean' },
          allowIdentifiers: { type: 'boolean' },
          allowLabels: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
    messages: {
      wrapped: 'This sentence continues onto the next comment line. Rewrite it to fit within {{maxLength}} characters, or cut it.',
      twoSentences: 'This line holds two sentences. Split it into two comment lines, or cut one.',
      tooLong: 'This comment runs to {{length}} characters, past the {{maxLength}} configured. Shorten the sentence rather than wrapping it.',
    },
  },

  create(context): Rule.RuleListener {
    const options = { ...defaults, ...context.options[0] }

    return {
      'Program:exit': (): void => {
        const comments = readLineComments(context)

        comments.forEach((comment, index) => {
          const text = comment.text
          if (startsWithLabel(text, options.allowLabels)) return

          // A sentence that is merely long cannot be shortened without changing what it says.
          if (text.length > options.maxLength) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'tooLong',
              data: { length: String(text.length), maxLength: String(options.maxLength) },
            })

            return
          }

          const split = twoSentences.exec(text)

          if (split) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'twoSentences',
            })

            return
          }

          const [next] = comments.slice(index + 1)
          if (!next) return
          if (!isAdjacent(comment, next)) return

          // Two trailing comments annotate their own lines rather than one continuing the other.
          if (comment.trailing || next.trailing) return

          if (startsWithLabel(next.text, options.allowLabels)) return
          if (!looksUnfinished(text, options)) return

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'wrapped',
            data: { maxLength: String(options.maxLength) },
          })
        })
      },
    }
  },
}

export default rule
