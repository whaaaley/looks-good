import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { VariableDeclarator } from 'estree'

type Options = {
  suffix: string
  requireComment: boolean
}

const defaults: Options = {
  suffix: 'Pattern',
  requireComment: true,
}

const lowerFirst = (word: string): string => {
  return word.charAt(0).toLowerCase() + word.slice(1)
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A constant holding a regular expression literal is named with the configured suffix and explained on or above its line',
      url: docUrl('regex-const-style'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        suffix: { type: 'string', minLength: 1 },
        requireComment: { type: 'boolean' },
      },
    }],
    messages: {
      suffix: "'{{name}}' holds a regular expression, so name it with the '{{suffix}}' suffix",
      comment: 'A regular expression does not read as prose, so state what it matches in a comment on or above this line',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const { sourceCode } = context

    const hasTrailingComment = (node: VariableDeclarator & Rule.NodeParentExtension): boolean => {
      const after = sourceCode.getTokenAfter(node.parent, { includeComments: true })
      if (!after) return false
      if (after.type !== 'Line' && after.type !== 'Block') return false

      if (!after.loc) return false

      return after.loc.start.line === sourceCode.getLoc(node.parent).end.line
    }

    // An exported declaration starts at its export keyword, which is where a leading comment sits above.
    const statementOf = (node: VariableDeclarator & Rule.NodeParentExtension): Rule.Node => {
      const declaration = node.parent
      const wrapper = declaration.parent
      if (wrapper && wrapper.type === 'ExportNamedDeclaration') return wrapper

      return declaration
    }

    // A regex too wide to share its line with a sentence keeps its explanation directly above instead.
    const hasLeadingComment = (node: VariableDeclarator & Rule.NodeParentExtension): boolean => {
      const statement = statementOf(node)
      const before = sourceCode.getTokenBefore(statement, { includeComments: true })
      if (!before) return false
      if (before.type !== 'Line' && before.type !== 'Block') return false
      if (!before.loc) return false
      if (before.loc.end.line !== sourceCode.getLoc(statement).start.line - 1) return false

      // A comment trailing the previous statement describes that statement, so only an own-line comment counts.
      const beforeComment = sourceCode.getTokenBefore(before)
      if (!beforeComment) return true

      return sourceCode.getLoc(beforeComment).end.line < before.loc.start.line
    }

    const check = (node: VariableDeclarator & Rule.NodeParentExtension): void => {
      if (!node.init || !('regex' in node.init)) return
      if (node.id.type !== 'Identifier') return

      const { name } = node.id

      // A bare lowercase suffix is the generic name, which already says what it holds.
      if (!name.endsWith(options.suffix) && name !== lowerFirst(options.suffix)) {
        context.report({
          node: node.id,
          messageId: 'suffix',
          data: { name, suffix: options.suffix },
        })
      }

      if (options.requireComment && !hasTrailingComment(node) && !hasLeadingComment(node)) {
        context.report({
          node: node.id,
          messageId: 'comment',
        })
      }
    }

    return { VariableDeclarator: check }
  },
}

export default rule
