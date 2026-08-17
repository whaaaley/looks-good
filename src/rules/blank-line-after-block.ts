import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { BlockStatement, Node, Statement } from 'estree'

// A statement that owns a block, where the closing brace ends the paragraph.
const blockOwners = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
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
      return sourceCode.getLastToken(statement)?.value === '}'
    }

    const check = (body: Node[]): void => {
      body.forEach((statement, index) => {
        if (!blockOwners.has(statement.type)) return

        // A braceless guard ends in its own statement, so there is no brace to separate.
        if (!endsWithBrace(statement)) return

        const next = body[index + 1]
        if (!next) return
        if (!statement.loc) return
        if (!next.loc) return

        // A comment between the two is what the reader sees, so it is what must be separated.
        const [between] = sourceCode.getCommentsBefore(next)
        const following = between?.loc ?? next.loc

        if (following.start.line > statement.loc.end.line + 1) return

        context.report({
          node: next,
          messageId: 'touching',
          fix: (fixer): Rule.Fix => {
            return fixer.insertTextAfter(statement, '\n')
          },
        })
      })
    }

    return {
      Program: (node): void => {
        check(node.body.filter((entry): entry is Statement => entry.type !== 'ImportDeclaration'))
      },

      BlockStatement: (node: BlockStatement): void => {
        check(node.body)
      },
    }
  },
}

export default rule
