import { isDirective, readComments } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import { compilePattern } from '../utils/regex.utils.ts'
import type { Rule } from 'eslint'
import type { Program } from 'estree'

export type ForbiddenPattern = {
  pattern: string
  message: string
  ignoreCase?: boolean
}

// A forbidden pattern once its source compiles, which is what comment text is matched against.
type CompiledPattern = {
  expression: RegExp
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
    fixable: undefined,
    schema: [{
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
              ignoreCase: { type: 'boolean' },
            },
          },
        },
        forbidBlockComments: { type: 'boolean' },
      },
    }],
    messages: {
      forbidden: '{{message}}',
      blockComment: 'This is a block comment, so rewrite it as line comments',
      invalidPattern: "The pattern '{{source}}' is not a valid regular expression. Correct it in this rule's configuration.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const forbidden: CompiledPattern[] = []
    const invalid: string[] = []

    for (const entry of options.forbid) {
      const flags = entry.ignoreCase ? 'iu' : 'u'
      const expression = compilePattern({ source: entry.pattern, flags })

      if (!expression) {
        invalid.push(entry.pattern)
        continue
      }

      forbidden.push({ expression, message: entry.message })
    }

    const reportInvalid = (program: Program): void => {
      for (const source of invalid) {
        context.report({
          node: program,
          messageId: 'invalidPattern',
          data: { source },
        })
      }
    }

    const check = (): void => {
      for (const comment of readComments(context)) {
        // A jsdoc block is read by a documentation tool, so it is not the prose block this option targets.
        // A directive like `/* global foo */` only works as a block comment, so it cannot be rewritten.
        if (options.forbidBlockComments && comment.block && !comment.text.startsWith('*') && !isDirective(comment.text)) {
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
    }

    return {
      Program: reportInvalid,
      'Program:exit': check,
    }
  },
}

export default rule
