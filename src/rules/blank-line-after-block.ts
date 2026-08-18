import { docUrl } from '../utils/docs.utils.ts'
import { locationOf, readerLocationOf } from '../utils/location.utils.ts'
import type { Rule } from 'eslint'
import type { BlockStatement, Node } from 'estree'

// A statement that owns a block, where the closing brace ends the paragraph.
const blockOwners = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'TryStatement',
  'SwitchStatement',
])

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Separates a closing brace from the statement that follows it',
      url: docUrl('blank-line-after-block'),
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      touching: 'This statement sits against the brace above it. Put a blank line between them.',
    },
  },
  create(context): Rule.RuleListener {
    const { sourceCode } = context

    const endsWithBrace = (statement: Node): boolean => {
      const token = sourceCode.getLastToken(statement)
      if (!token) return false

      return token.value === '}'
    }

    const check = (body: Node[]): void => {
      for (const [index, statement] of body.entries()) {
        if (!blockOwners.has(statement.type)) continue

        // A braceless guard ends in its own statement, so there is no brace to separate.
        if (!endsWithBrace(statement)) continue

        const next = body[index + 1]
        if (!next) continue

        const preceding = locationOf(statement)
        if (!preceding) continue

        const following = readerLocationOf(sourceCode, next)
        if (!following) continue

        if (following.start.line > preceding.end.line + 1) continue

        const sameLine = following.start.line === preceding.end.line

        context.report({
          node: next,
          messageId: 'touching',
          fix: (fixer): Rule.Fix => {
            return fixer.insertTextAfter(statement, sameLine ? '\n\n' : '\n')
          },
        })
      }
    }

    return {
      Program: (node): void => {
        check(node.body.filter((entry) => entry.type !== 'ImportDeclaration'))
      },
      BlockStatement: (node: BlockStatement): void => {
        check(node.body)
      },
    }
  },
}

export default rule
