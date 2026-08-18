import { docUrl } from '../utils/docs.utils.ts'
import { locationOf } from '../utils/location.utils.ts'
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

    const check = (node: ObjectExpression): void => {
      const comments = sourceCode.getCommentsInside(node)

      const opening = locationOf(node)
      if (!opening) return

      // The opening-brace line is seeded so a comment trailing the brace itself counts as trailing.
      const occupied = new Set<number>([opening.start.line])

      // A property line holds the code a trailing comment would describe.
      for (const property of node.properties) {
        const location = locationOf(property)
        if (!location) continue

        // A multi-line property's closing line carries code too, so a comment there trails the property.
        occupied.add(location.start.line)
        occupied.add(location.end.line)
      }

      for (const comment of comments) {
        const range = comment.range
        const location = locationOf(comment)
        if (!location || !range) continue

        // A comment sharing a line with a property trails it, which is the form this rule wants.
        if (occupied.has(location.start.line)) continue

        // A comment inside a property belongs to whatever nests there, not to this object.
        if (node.properties.some((property) => encloses(property, range))) {
          continue
        }

        context.report({ loc: location, messageId: 'ownLine' })
      }
    }

    return { ObjectExpression: check }
  },
}

export default rule
