import { readComments } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'

export type ForbiddenPattern = {
  pattern: string
  message: string
}

type Options = {
  forbid: ForbiddenPattern[]
  forbidBlockComments: boolean
}

const defaults: Options = {
  forbid: [],
  forbidBlockComments: false,
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbids comment text a project does not want left in source',
      url: docUrl('comment-content'),
    },
    defaultOptions: [defaults],
    // Deciding what a marker should have said needs a person, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          forbid: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['pattern', 'message'],
              properties: {
                pattern: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
          forbidBlockComments: { type: 'boolean' },
        },
      },
    ],
    messages: {
      forbidden: '{{message}}',
      blockComment: 'This is a block comment, so rewrite it as line comments',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const forbidden = options.forbid.map((entry) => ({
      expression: new RegExp(entry.pattern, 'u'),
      message: entry.message,
    }))

    return {
      'Program:exit': (): void => {
        for (const comment of readComments(context)) {
          if (options.forbidBlockComments && comment.block) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'blockComment',
            })

            continue
          }

          for (const entry of forbidden) {
            if (!entry.expression.test(comment.text)) continue

            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'forbidden',
              data: { message: entry.message },
            })
          }
        }
      },
    }
  },
}

export default rule
