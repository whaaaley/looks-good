import { findWrappedPairs, isDirective, readLineComments, startsWithLabel } from '../utils/comment.utils.ts'
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
      description: 'A comment sentence fits on one line and a line holds one sentence',
      url: docUrl('comment-one-sentence-per-line'),
    },
    defaultOptions: [defaults],
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
      wrapped: 'This sentence continues onto the next comment line. Rewrite it to fit on one line, or cut it.',
      tooLong: 'This comment runs to {{length}} characters, past the {{maxLength}} configured. Shorten the sentence rather than wrapping it.',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    return {
      'Program:exit': (): void => {
        const comments = readLineComments(context)
        const tooLong = new Set<number>()

        for (const comment of comments) {
          const text = comment.text
          if (startsWithLabel(text, options.allowLabels)) continue
          if (isDirective(text)) continue

          // A sentence that is merely long cannot be shortened without changing what it says.
          if (text.length <= options.maxLength) continue

          tooLong.add(comment.line)

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'tooLong',
            data: { length: String(text.length), maxLength: String(options.maxLength) },
          })
        }

        for (const { comment } of findWrappedPairs(comments, options)) {
          // A line already reported as too long is not reported again for wrapping.
          if (tooLong.has(comment.line)) continue

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'wrapped',
          })
        }
      },
    }
  },
}

export default rule
