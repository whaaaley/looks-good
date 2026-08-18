import { isDirective, urlPattern } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'

type Options = {
  maxLength: number
}

const defaults: Options = {
  maxLength: 120,
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Limits how long a line holding a comment may run',
      url: docUrl('max-comment-length'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          maxLength: { type: 'integer', minimum: 1 },
        },
      },
    ],
    messages: {
      tooLong: 'This comment line runs to {{length}} characters, past the {{maxLength}} configured. Shorten the sentence.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const { sourceCode } = context

    return {
      'Program:exit': (): void => {
        // Two comments on one line would otherwise report that line twice.
        const reported = new Set<number>()

        for (const comment of sourceCode.getAllComments()) {
          if (!comment.loc) continue
          if (urlPattern.test(comment.value)) continue

          // A directive is read by a tool, so its length is not the writer's to shorten.
          if (isDirective(comment.value.trim())) continue

          for (let line = comment.loc.start.line; line <= comment.loc.end.line; line++) {
            if (reported.has(line)) continue

            const text = sourceCode.lines[line - 1]
            if (text === undefined) continue
            if (text.length <= options.maxLength) continue

            reported.add(line)
            context.report({
              loc: { line, column: 0 },
              messageId: 'tooLong',
              data: { length: String(text.length), maxLength: String(options.maxLength) },
            })
          }
        }
      },
    }
  },
}

export default rule
