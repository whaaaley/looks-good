import { docUrl } from '../../utils/docs.utils.ts'
import { countBindings, isDestructured } from './max-destructured-parameters.utils.ts'
import type { Rule } from 'eslint'
import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression } from 'estree'

type Options = {
  max: number
}

const defaults: Options = {
  max: 0,
}

type FunctionNode = ArrowFunctionExpression | FunctionDeclaration | FunctionExpression

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Limits how many bindings a function parameter may destructure',
      url: docUrl('max-destructured-parameters'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        max: { type: 'integer', minimum: 0 },
      },
    }],
    messages: {
      none: 'This parameter is destructured in the signature. Name the parameter and destructure it in the body instead.',
      above: 'This parameter destructures {{count}} bindings, which is above the {{max}} allowed. Name the parameter and destructure it in the body instead.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (node: FunctionNode): void => {
      for (const parameter of node.params) {
        if (!isDestructured(parameter)) continue

        // The bound is inclusive, so a pattern reports only once its bindings go above the max.
        const count = countBindings(parameter)
        if (count <= options.max) continue

        context.report({
          node: parameter,
          messageId: options.max === 0 ? 'none' : 'above',
          data: {
            count: String(count),
            max: String(options.max),
          },
        })
      }
    }

    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
    }
  },
}

export default rule
