import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression, Pattern } from 'estree'

type Options = {
  max: number
}

const defaults: Options = {
  max: 0,
}

type FunctionNode = ArrowFunctionExpression | FunctionDeclaration | FunctionExpression

// A binding is a name the pattern introduces, so a nested pattern counts its leaves rather than itself.
const countBindings = (pattern: Pattern): number => {
  if (pattern.type === 'ObjectPattern') {
    let total = 0
    for (const property of pattern.properties) {
      if (property.type === 'RestElement') {
        total += countBindings(property.argument)
        continue
      }

      total += countBindings(property.value)
    }

    return total
  }

  if (pattern.type === 'ArrayPattern') {
    let total = 0
    for (const element of pattern.elements) {
      if (!element) continue
      total += countBindings(element)
    }

    return total
  }

  if (pattern.type === 'AssignmentPattern') return countBindings(pattern.left)
  if (pattern.type === 'RestElement') return countBindings(pattern.argument)

  return 1
}

const isDestructured = (pattern: Pattern): boolean => {
  if (pattern.type === 'ObjectPattern') return true
  if (pattern.type === 'ArrayPattern') return true
  if (pattern.type === 'AssignmentPattern') return isDestructured(pattern.left)
  if (pattern.type === 'RestElement') return isDestructured(pattern.argument)

  return false
}

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
