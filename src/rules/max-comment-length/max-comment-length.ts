import { isDirective, urlPattern } from '../../utils/comment.utils.ts'
import { docUrl } from '../../utils/docs.utils.ts'
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
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        maxLength: { type: 'integer', minimum: 1 },
      },
    }],
    messages: {
      tooLong: 'This comment line runs to {{length}} characters, past the {{maxLength}} configured. Shorten the sentence.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (): void => {
      const reported = new Set<number>()

      for (const comment of context.sourceCode.getAllComments()) {
        if (!comment.loc) continue

        // A url has no natural break, so its line cannot be shortened by rewording.
        if (urlPattern.test(comment.value)) continue

        // A directive is read by a tool, so its length is not the writer's to shorten.
        if (isDirective(comment.value.trim())) continue

        // A line comment spans one line, so only a multi-line block makes this loop run more than once.
        for (let line = comment.loc.start.line; line <= comment.loc.end.line; line++) {
          if (reported.has(line)) continue

          const text = context.sourceCode.lines[line - 1]
          if (text === undefined || text.length <= options.maxLength) continue

          reported.add(line)
          context.report({
            loc: { line, column: 0 },
            messageId: 'tooLong',
            data: { length: String(text.length), maxLength: String(options.maxLength) },
          })
        }
      }
    }

    return {
      'Program:exit': check,
    }
  },
}

export default rule
