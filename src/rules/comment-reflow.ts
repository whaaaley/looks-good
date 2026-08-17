import { isAdjacent, looksUnfinished, readLineComments, startsWithLabel } from '../utils/comment.utils.ts'
import type { Rule } from 'eslint'

const defaults = {
  maxLength: 120,
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Joins a comment sentence that wraps onto the next line',
    },
    // Joining moves text without rewriting it, so the fix is safe to apply.
    fixable: 'whitespace',
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
      join: 'This sentence continues on the next line, so the two lines join into one',
      tooLongToJoin: 'This sentence continues on the next line, but joining them would run past {{maxLength}} characters',
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

          const next = comments[index + 1]
          if (!next) return
          if (!isAdjacent(comment, next)) return

          // Two trailing comments annotate their own lines rather than one continuing the other.
          if (comment.trailing || next.trailing) return

          if (startsWithLabel(next.text, options.allowLabels)) return
          if (!looksUnfinished(text, options)) return

          const joined = `${text} ${next.text}`

          // Joining past the limit trades a wrapped sentence for one the other rule reports.
          if (joined.length > options.maxLength) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'tooLongToJoin',
              data: { maxLength: String(options.maxLength) },
            })

            return
          }

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'join',
            fix: (fixer) => fixer.replaceTextRange([comment.range[0], next.range[1]], `// ${joined}`),
          })
        })
      },
    }
  },
}

export default rule
