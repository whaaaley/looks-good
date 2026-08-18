import { findWrappedPairs, readLineComments } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import type { CommentLine } from '../utils/comment.utils.ts'
import type { Rule } from 'eslint'

type Options = {
  onWrap: 'report' | 'join'
  maxLength: number
  allowUrls: boolean
  allowIdentifiers: boolean
  allowLabels: string[]
}

const defaults: Options = {
  onWrap: 'report',
  maxLength: 120,
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'A comment sentence fits on one line, reported or joined under --fix depending on onWrap',
      url: docUrl('comment-wrap'),
    },
    defaultOptions: [defaults],
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          onWrap: { enum: ['report', 'join'] },
          maxLength: { type: 'integer', minimum: 1 },
          allowUrls: { type: 'boolean' },
          allowIdentifiers: { type: 'boolean' },
          allowLabels: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
    messages: {
      wrapped: 'This sentence continues onto the next comment line. Rewrite it to fit on one line, or cut it.',
      join: 'This sentence continues on the next line, so the two lines join into one',
      tooLongToJoin: 'This sentence continues on the next line, but joining them would run past {{maxLength}} characters',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const reportMode = (comments: CommentLine[]): void => {
      for (const { comment } of findWrappedPairs(comments, options)) {
        context.report({
          loc: { line: comment.line, column: 0 },
          messageId: 'wrapped',
        })
      }
    }

    const joinMode = (comments: CommentLine[]): void => {
      for (const { comment, next } of findWrappedPairs(comments, options)) {
        const joined = `${comment.text} ${next.text}`

        // The joined line keeps the first comment's indentation plus its own comment marker.
        const column = comment.node.loc?.start.column ?? 0

        // Joining past the limit would trade a wrapped sentence for a line max-comment-length flags.
        if (column + 3 + joined.length > options.maxLength) {
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
    }

    return {
      'Program:exit': (): void => {
        const comments = readLineComments(context)

        if (options.onWrap === 'join') {
          joinMode(comments)

          return
        }

        reportMode(comments)
      },
    }
  },
}

export default rule
