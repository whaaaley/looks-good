import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { IfStatement } from 'estree'

type Options = {
  maxLength: number
}

const defaults: Options = {
  maxLength: 80,
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
        if (!consequent.loc) return
        if (!node.loc) return

        // A body already on its own line is not the single line form this rule governs.
        if (consequent.loc.start.line !== node.loc.start.line) return

        const line = sourceCode.lines[node.loc.start.line - 1]
        if (line === undefined) return
        if (line.length <= options.maxLength) return

        context.report({
          node,
          messageId: 'tooLong',
          data: { length: String(line.length), maxLength: String(options.maxLength) },
          fix: (fixer): Rule.Fix => {
            // The body indents one step past the if, and the closing brace lines up with it.
            const [indent = ''] = line.match(/^\s*/) ?? []
            const body = sourceCode.getText(consequent)

            return fixer.replaceText(consequent, `{\n${indent}  ${body}\n${indent}}`)
          },
        })
      },
    }
  },
}

export default rule
