import { isAdjacent, looksUnfinished, readLineComments, startsWithLabel } from '../utils/comment.utils.ts'
import type { Rule, SourceCode } from 'eslint'
import type { Comment } from 'estree'

const defaults = {
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

// A line holding two sentences splits at the boundary between them.
const twoSentences = /^(.*?[.!?])\s+(\S.*[.!?])\s*$/

const indentOf = (source: SourceCode, comment: Comment): string => {
  const [line] = source.lines.slice((comment.loc?.start.line ?? 1) - 1)
  const [indent] = /^\s*/.exec(line ?? '') ?? ['']

  return indent
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Joins a wrapped comment sentence and splits a line holding two',
    },
    // Both transformations move text without rewriting it, so both are safe to apply.
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowUrls: { type: 'boolean' },
          allowIdentifiers: { type: 'boolean' },
          allowLabels: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
    messages: {
      join: 'This sentence continues on the next line, so the two lines join into one',
      split: 'This line holds two sentences, so it splits into two lines',
    },
  },

  create(context): Rule.RuleListener {
    const options = { ...defaults, ...context.options[0] }
    const source = context.sourceCode

    return {
      'Program:exit': (): void => {
        const comments = readLineComments(context)

        comments.forEach((comment, index) => {
          const text = comment.text
          if (startsWithLabel(text, options.allowLabels)) return

          const split = twoSentences.exec(text)

          if (split) {
            const [, first, second] = split

            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'split',
              fix: (fixer) => {
                const indent = indentOf(source, comment.node)

                return fixer.replaceText(comment.node, `// ${first}\n${indent}// ${second}`)
              },
            })

            return
          }

          const [next] = comments.slice(index + 1)
          if (!next) return
          if (!isAdjacent(comment, next)) return

          // Two trailing comments annotate their own lines rather than one continuing the other.
          if (comment.trailing || next.trailing) return

          if (startsWithLabel(next.text, options.allowLabels)) return
          if (!looksUnfinished(text, options)) return

          context.report({
            loc: { line: comment.line, column: 0 },
            messageId: 'join',
            fix: (fixer) => fixer.replaceTextRange([comment.range[0], next.range[1]], `// ${text} ${next.text}`),
          })
        })
      },
    }
  },
}

export default rule
