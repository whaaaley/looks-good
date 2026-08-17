import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { ObjectExpression } from 'estree'

type Options = {
  minNestedProperties: number
}

const defaults: Options = {
  minNestedProperties: 1,
}

const isSingleLine = (node: ObjectExpression): boolean => {
  if (!node.loc) return false

  return node.loc.start.line === node.loc.end.line
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Keeps a nested object out of a call argument written on one line',
      url: docUrl('no-single-line-nested-object'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          minNestedProperties: { type: 'integer', minimum: 0 },
        },
      },
    ],
    messages: {
      nested: 'This call nests an object inside an argument written on one line. Put the outer object properties on their own lines.',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    return {
      ObjectExpression: (node: ObjectExpression & Rule.NodeParentExtension): void => {
        if (node.properties.length < options.minNestedProperties) return

        const property = node.parent
        if (property.type !== 'Property') return
        if (property.value !== node) return

        const outer = property.parent
        if (outer.type !== 'ObjectExpression') return

        // The outer object has to be a direct call argument, which is where the crowding happens.
        const call = outer.parent
        if (call.type !== 'CallExpression') return
        if (!call.arguments.includes(outer)) return
        if (!isSingleLine(outer)) return

        context.report({ node, messageId: 'nested' })
      },
    }
  },
}

export default rule
