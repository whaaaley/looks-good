import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { ObjectExpression, Property, SpreadElement } from 'estree'

type ObjectMember = Property | SpreadElement

const encloses = (member: ObjectMember, range: [number, number]): boolean => {
  if (!member.range) return false

  return member.range[0] <= range[0] && range[1] <= member.range[1]
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Keeps a comment inside an object literal on the line it describes',
      url: docUrl('object-comments-trailing'),
    },
    fixable: undefined,
    schema: [],
    messages: {
      ownLine: 'This comment sits on its own line inside an object literal. Put it after the property it describes, or cut it.',
    },
  },

  create(context): Rule.RuleListener {
    const { sourceCode } = context

    return {
      ObjectExpression: (node: ObjectExpression): void => {
        const comments = sourceCode.getCommentsInside(node)
        if (comments.length === 0) return
        if (!node.loc) return

        // A property line holds the code a trailing comment would describe.
        const occupied = new Set<number>([node.loc.start.line])

        for (const property of node.properties) {
          if (property.loc) occupied.add(property.loc.start.line)
        }

        for (const comment of comments) {
          const range = comment.range
          if (!comment.loc || !range) continue

          // A comment sharing a line with a property trails it, which is the form this rule wants.
          if (occupied.has(comment.loc.start.line)) continue

          // A comment inside a property belongs to whatever nests there, not to this object.
          if (node.properties.some((property) => encloses(property, range))) {
            continue
          }

          context.report({ loc: comment.loc, messageId: 'ownLine' })
        }
      },
    }
  },
}

export default rule
