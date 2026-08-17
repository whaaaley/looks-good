import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'

export type Restriction = {
  receivers: string[]
  methods: string[]
  message: string
  ignoreCase?: boolean
}

type Options = {
  restrict: Restriction[]
  allow: string[]
}

const defaults: Options = {
  restrict: [],
  allow: [],
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports a method call on an object a project does not want called directly',
      url: docUrl('no-restricted-method-calls'),
    },
    defaultOptions: [defaults],
    // Replacing a direct call with the sanctioned path is a rewrite, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allow: { type: 'array', items: { type: 'string', minLength: 1 } },
          restrict: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['receivers', 'methods', 'message'],
              properties: {
                receivers: { type: 'array', items: { type: 'string', minLength: 1 } },
                methods: { type: 'array', items: { type: 'string', minLength: 1 } },
                message: { type: 'string', minLength: 1 },
                ignoreCase: { type: 'boolean' },
              },
            },
          },
        },
      },
    ],
    messages: {
      forbidden: '{{message}}',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const allow = new Set(options.allow.map((name) => name.toLowerCase()))

    // Compiling once in create keeps a large file from rebuilding these per node.
    const restrictions = options.restrict.map((restriction) => {
      const ignoreCase = restriction.ignoreCase !== false
      const fold = (name: string): string => ignoreCase ? name.toLowerCase() : name

      return {
        receivers: new Set(restriction.receivers.map(fold)),
        methods: new Set(restriction.methods.map(fold)),
        message: restriction.message,
        fold,
      }
    })

    if (restrictions.length === 0) return {}

    return {
      CallExpression: (node): void => {
        const callee = node.callee

        if (callee.type !== 'MemberExpression') return
        if (callee.computed) return
        if (callee.object.type !== 'Identifier') return
        if (callee.property.type !== 'Identifier') return

        const receiver = callee.object.name
        const method = callee.property.name

        // An allowed receiver is exempt from every entry, so a sanctioned handle stays usable.
        if (allow.has(receiver.toLowerCase())) return

        for (const restriction of restrictions) {
          if (!restriction.receivers.has(restriction.fold(receiver))) continue
          if (!restriction.methods.has(restriction.fold(method))) continue

          context.report({
            node,
            messageId: 'forbidden',
            data: { message: restriction.message },
          })
        }
      },
    }
  },
}

export default rule
