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

// The text and end offset of a comment sitting on the same line as the body.
const trailingComment = (sourceCode: SourceCode, body: Statement): Trailing | undefined => {
  const after = sourceCode.getTokenAfter(body, { includeComments: true })
  if (!after) return undefined
  if (after.type !== 'Line' && after.type !== 'Block') return undefined

  const comment = locationOf(after)
  const bodyLocation = locationOf(body)
  if (!comment || !bodyLocation) return undefined
  if (comment.start.line !== bodyLocation.start.line) return undefined
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
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        maxLength: { type: 'integer', minimum: 1 },
      },
    }],
    messages: {
      tooLong: 'This runs to {{length}} characters, past the {{maxLength}} configured. Put the body on its own line in braces.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const { sourceCode } = context

    const checkBody = (body: Statement, keywordLine: number): void => {
      // A braced body already reads as its own paragraph, whatever its width.
      if (body.type === 'BlockStatement') return

      const bodyLocation = locationOf(body)
      if (!bodyLocation) return

      // A body already on its own line is not the single line form this rule governs.
      if (bodyLocation.start.line !== keywordLine) return

      const line = sourceCode.lines[keywordLine - 1]
      if (line === undefined) return
      if (line.length <= options.maxLength) return

      context.report({
        node: body,
        messageId: 'tooLong',
        data: { length: String(line.length), maxLength: String(options.maxLength) },
        fix: (fixer): Rule.Fix => {
          // The body indents one step past the if, and the closing brace lines up with it.
          const [indent = ''] = line.match(leadingWhitespacePattern) ?? []
          const text = sourceCode.getText(body)
          const trailing = trailingComment(sourceCode, body)

          if (!trailing) {
            return fixer.replaceText(body, `{\n${indent}  ${text}\n${indent}}`)
          }

          const [start = 0] = body.range ?? []

          // A comment left outside the replaced range would survive after the closing brace,
          // where it reads as a header for the next statement, so the fix carries it inside.
          return fixer.replaceTextRange([start, trailing.end], `{\n${indent}  ${text} ${trailing.text}\n${indent}}`)
        },
      })
    }

    const check = (node: IfStatement & Rule.NodeParentExtension): void => {
      const statementLocation = locationOf(node)
      if (!statementLocation) return

      checkBody(node.consequent, statementLocation.start.line)

      const { alternate } = node

      // An else if is its own IfStatement, so the walk reaches it on its own.
      if (!alternate || alternate.type === 'IfStatement') return

      const elseToken = sourceCode.getTokenBefore(alternate)
      if (!elseToken || !elseToken.loc) return

      checkBody(alternate, elseToken.loc.start.line)
    }

    return { IfStatement: check }
  },
}

export default rule
