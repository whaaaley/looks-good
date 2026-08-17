import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { VariableDeclarator } from 'estree'

type Options = {
  namePattern: string
  max: number
  message: string
}

const defaults: Options = {
  namePattern: 'TIMEOUT',
  max: 5000,
  message: '',
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports a named constant holding a number above a budget',
      url: docUrl('max-timeout-value'),
    },
    defaultOptions: [defaults],
    // Lowering the number without fixing what is slow would just move the failure, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          namePattern: { type: 'string', minLength: 1 },
          max: { type: 'integer', minimum: 0 },
          message: { type: 'string' },
        },
      },
    ],
    messages: {
      above: 'The constant {{name}} holds {{value}}, which is above the {{max}} budget. Assert against what you are waiting for rather than waiting it out.',
      aboveWithMessage: 'The constant {{name}} holds {{value}}, which is above the {{max}} budget. Assert against what you are waiting for rather than waiting it out. {{message}}',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const needle = options.namePattern.toLowerCase()

    return {
      VariableDeclarator: (node: VariableDeclarator): void => {
        if (node.id.type !== 'Identifier') return
        if (!node.id.name.toLowerCase().includes(needle)) return
        if (!node.init) return
        if (node.init.type !== 'Literal') return
        if (typeof node.init.value !== 'number') return
        if (node.init.value <= options.max) return

        context.report({
          node,
          messageId: options.message ? 'aboveWithMessage' : 'above',
          data: {
            name: node.id.name,
            value: String(node.init.value),
            max: String(options.max),
            message: options.message,
          },
        })
      },
    }
  },
}

export default rule
