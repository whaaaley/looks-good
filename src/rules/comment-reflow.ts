import { findWrappedPairs, readLineComments } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'

type Options = {
  maxLength: number
  allowUrls: boolean
  allowIdentifiers: boolean
  allowLabels: string[]
}

const defaults: Options = {
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
      url: docUrl('comment-reflow'),
    },
    defaultOptions: [defaults],
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
    const options: Options = { ...defaults, ...context.options[0] }

    return {
      'Program:exit': (): void => {
        for (const { comment, next } of findWrappedPairs(readLineComments(context), options)) {
          const joined = `${comment.text} ${next.text}`

          // Joining past the limit trades a wrapped sentence for one the other rule reports.
          if (joined.length > options.maxLength) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'tooLongToJoin',
              data: { maxLength: String(options.maxLength) },
            })

            continue
          }

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'join',
            fix: (fixer) => fixer.replaceTextRange([comment.range[0], next.range[1]], `// ${joined}`),
          })
        }
      },
    }
  },
}

export default rule
