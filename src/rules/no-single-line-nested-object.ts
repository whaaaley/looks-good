import { docUrl } from '../utils/docs.utils.ts'
import { isSingleLine } from '../utils/location.utils.ts'
import type { Rule } from 'eslint'
import type { ObjectExpression } from 'estree'

type Options = {
  minNestedProperties: number
}

const defaults: Options = {
  minNestedProperties: 1,
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Keeps a nested object out of a call or construction argument written on one line',
      url: docUrl('no-single-line-nested-object'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        minNestedProperties: { type: 'integer', minimum: 0 },
      },
    }],
    messages: {
      nested: 'This argument nests an object inside an object written on one line. Put the outer object properties on their own lines.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (node: ObjectExpression & Rule.NodeParentExtension): void => {
      if (node.properties.length < options.minNestedProperties) return

      const property = node.parent
      if (property.type !== 'Property') return
      if (property.value !== node) return

      const outer = property.parent
      if (outer.type !== 'ObjectExpression') return

      const call = outer.parent
      if (call.type !== 'CallExpression' && call.type !== 'NewExpression') {
        return
      }

      // An outer object in the callee position is not a crowded argument.
      if (!call.arguments.includes(outer)) return
      if (!isSingleLine(outer)) return

      context.report({ node, messageId: 'nested' })
    }

    return { ObjectExpression: check }
  },
}

export default rule
