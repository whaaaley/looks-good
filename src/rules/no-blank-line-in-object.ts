import { docUrl } from '../utils/docs.utils.ts'
import { locationOf, readerLocationOf } from '../utils/location.utils.ts'
import type { Rule } from 'eslint'
import type { ObjectExpression } from 'estree'

// This carries the `g` flag, so only replace may consume it, since test or exec would leak lastIndex across calls.
export const blankLineRunPattern = /\n\s*\n/g

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Keeps a blank line out from between the properties of an object literal',
      url: docUrl('no-blank-line-in-object'),
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      gap: 'This property is separated from the one above it by a blank line. An object literal is one paragraph, so close the gap.',
    },
  },
  create(context): Rule.RuleListener {
    const { sourceCode } = context

    return {
      ObjectExpression: (node: ObjectExpression): void => {
        for (const [index, property] of node.properties.entries()) {
          // Measuring from the previous property's last line leaves a blank line inside its value alone.
          const preceding = locationOf(node.properties[index - 1])
          if (!preceding) continue

          const following = readerLocationOf(sourceCode, property)
          if (!following) continue

          const propertyLocation = locationOf(property)
          if (!propertyLocation) continue

          // Scanning all the way to the property itself catches a blank line on either side of a comment.
          const start = sourceCode.getIndexFromLoc({ line: preceding.end.line, column: preceding.end.column })
          const end = sourceCode.getIndexFromLoc({ line: propertyLocation.start.line, column: 0 })
          if (end <= start) continue

          const between = sourceCode.getText().slice(start, end)
          const closed = between.replace(blankLineRunPattern, '\n')
          if (closed === between) continue

          context.report({
            loc: following,
            messageId: 'gap',
            fix: (fixer): Rule.Fix => fixer.replaceTextRange([start, end], closed),
          })
        }
      },
    }
  },
}

export default rule
