import { readComments } from '../../utils/comment.utils.ts'
import { docUrl } from '../../utils/docs.utils.ts'
import { findWrappedPairs } from './comment-wrap.utils.ts'
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
      description: 'A comment sentence fits on one line, joined onto it under --fix',
      url: docUrl('comment-wrap'),
    },
    defaultOptions: [defaults],
    fixable: 'whitespace',
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        maxLength: { type: 'integer', minimum: 1 },
        allowUrls: { type: 'boolean' },
        allowIdentifiers: { type: 'boolean' },
        allowLabels: { type: 'array', items: { type: 'string' } },
      },
    }],
    messages: {
      join: 'This sentence continues on the next line, so the two lines join into one',
      tooLongToJoin: 'This sentence continues on the next line, but joining them would run past {{maxLength}} characters',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (): void => {
      // The wrap check joins lines, which only line comments do, so block comments drop out here.
      const comments = readComments(context).filter((comment) => !comment.block)

      for (const { comment, next } of findWrappedPairs(comments, options)) {
        // An empty line contributes no text, so joining it must not leave a trailing space.
        const joined = [comment.text, next.text].filter(Boolean).join(' ')

        const replacement = `// ${joined}`

        // Joining past the limit would trade a wrapped sentence for a line max-comment-length flags.
        // The joined line keeps the first comment's indentation plus its own comment marker.
        if (comment.column + replacement.length > options.maxLength) {
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
          fix: (fixer) => fixer.replaceTextRange([comment.range[0], next.range[1]], replacement),
        })
      }
    }

    return {
      'Program:exit': check,
    }
  },
}

export default rule
