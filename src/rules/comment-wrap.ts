import { findWrappedPairs, isDirective, readLineComments, startsWithLabel } from '../utils/comment.utils.ts'
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
      tooLong: 'This comment runs to {{length}} characters, past the {{maxLength}} configured. Shorten the sentence rather than wrapping it.',
      join: 'This sentence continues on the next line, so the two lines join into one',
      tooLongToJoin: 'This sentence continues on the next line, but joining them would run past {{maxLength}} characters',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    // Both modes measure length the same way, so onWrap selects only the remedy for a wrapped pair.
    const reportTooLong = (comments: CommentLine[]): Set<number> => {
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

      return tooLong
    }

    const reportMode = (comments: CommentLine[], tooLong: Set<number>): void => {
      for (const { comment } of findWrappedPairs(comments, options)) {
        // A line already reported as too long is not reported again for wrapping.
        if (tooLong.has(comment.line)) continue

        context.report({
          loc: { line: comment.line, column: 0 },
          messageId: 'wrapped',
        })
      }
    }

    const joinMode = (comments: CommentLine[], tooLong: Set<number>): void => {
      for (const { comment, next } of findWrappedPairs(comments, options)) {
        // Joining would lengthen a line already reported as too long, so that report stands alone.
        if (tooLong.has(comment.line)) continue

        const joined = `${comment.text} ${next.text}`

        // Joining past the limit trades a wrapped sentence for one report mode would flag.
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
    }

    return {
      'Program:exit': (): void => {
        const comments = readLineComments(context)

        // A long standalone line is flagged in both modes, with no fix since joining cannot shorten it.
        const tooLong = reportTooLong(comments)

        if (options.onWrap === 'join') {
          joinMode(comments, tooLong)

          return
        }

        reportMode(comments, tooLong)
      },
    }
  },
}

export default rule
