import { docUrl } from '../utils/docs.utils.ts'
import { locationOf } from '../utils/location.utils.ts'
import type { Rule, SourceCode } from 'eslint'
import type { IfStatement, Statement } from 'estree'

export const leadingWhitespacePattern = /^\s*/ // Matches the indentation opening a line.

type Options = {
  maxLength: number
}

const defaults: Options = {
  maxLength: 80,
}

type Trailing = {
  text: string
  end: number
}

// A comment left outside the replaced range survives after the closing brace.
// There it reads as a header for the next statement.
const trailingComment = (sourceCode: SourceCode, consequent: Statement): Trailing | undefined => {
  const after = sourceCode.getTokenAfter(consequent, { includeComments: true })
  if (!after) return undefined
  if (after.type !== 'Line' && after.type !== 'Block') return undefined

  const comment = locationOf(after)
  const body = locationOf(consequent)
  if (!comment || !body) return undefined
  if (comment.start.line !== body.start.line) return undefined
  if (!after.range) return undefined

  const [start, end] = after.range

  return { text: sourceCode.getText().slice(start, end), end }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Keeps a single line if body on one line only while that line stays short',
      url: docUrl('max-single-line-statement-length'),
    },
    defaultOptions: [defaults],
    fixable: 'whitespace',
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
      tooLong: 'This runs to {{length}} characters, past the {{maxLength}} configured. Put the body on its own line in braces.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const { sourceCode } = context

    return {
      IfStatement: (node: IfStatement & Rule.NodeParentExtension): void => {
        const { consequent } = node

        // A braced body already reads as its own paragraph, whatever its width.
        if (consequent.type === 'BlockStatement') return

        const bodyLocation = locationOf(consequent)
        const statementLocation = locationOf(node)
        if (!bodyLocation || !statementLocation) return

        // A body already on its own line is not the single line form this rule governs.
        if (bodyLocation.start.line !== statementLocation.start.line) return

        const line = sourceCode.lines[statementLocation.start.line - 1]
        if (line === undefined) return
        if (line.length <= options.maxLength) return

        context.report({
          node,
          messageId: 'tooLong',
          data: { length: String(line.length), maxLength: String(options.maxLength) },
          fix: (fixer): Rule.Fix => {
            // The body indents one step past the if, and the closing brace lines up with it.
            const [indent = ''] = line.match(leadingWhitespacePattern) ?? []
            const body = sourceCode.getText(consequent)
            const trailing = trailingComment(sourceCode, consequent)

            if (!trailing) {
              return fixer.replaceText(consequent, `{\n${indent}  ${body}\n${indent}}`)
            }

            const [start = 0] = consequent.range ?? []

            return fixer.replaceTextRange([start, trailing.end], `{\n${indent}  ${body} ${trailing.text}\n${indent}}`)
          },
        })
      },
    }
  },
}

export default rule
