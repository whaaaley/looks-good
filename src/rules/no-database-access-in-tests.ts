import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'

type Options = {
  handles: string[]
  methods: string[]
  allow: string[]
  ignoreCase: boolean
  message?: string
}

const defaults: Options = {
  handles: ['db', 'tx', 'client', 'database'],
  methods: ['insert', 'select', 'update', 'delete'],
  allow: [],
  ignoreCase: true,
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports a test that queries the database directly rather than through the interface under test',
      url: docUrl('no-database-access-in-tests'),
    },
    defaultOptions: [defaults],
    // Routing a query through the interface under test is a rewrite of the test, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          handles: { type: 'array', items: { type: 'string', minLength: 1 } },
          methods: { type: 'array', items: { type: 'string', minLength: 1 } },
          allow: { type: 'array', items: { type: 'string', minLength: 1 } },
          ignoreCase: { type: 'boolean' },
          message: { type: 'string', minLength: 1 },
        },
      },
    ],
    messages: {
      direct: 'This test queries the database directly through {{handle}}.{{method}}. Exercise the interface under test instead, so the test fails when that interface breaks.',
      custom: '{{message}}',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const fold = (name: string): string => options.ignoreCase ? name.toLowerCase() : name

    // Compiling once in create keeps a large file from rebuilding these per node.
    const handles = new Set(options.handles.map(fold))
    const methods = new Set(options.methods.map(fold))
    const allow = new Set(options.allow.map((name) => name.toLowerCase()))

    if (handles.size === 0) return {}
    if (methods.size === 0) return {}

    return {
      CallExpression: (node): void => {
        const callee = node.callee

        if (callee.type !== 'MemberExpression') return
        if (callee.computed) return
        if (callee.object.type !== 'Identifier') return
        if (callee.property.type !== 'Identifier') return

        const handle = callee.object.name
        const method = callee.property.name

        // An allowed handle is exempt, so a test that must seed directly stays usable.
        if (allow.has(handle.toLowerCase())) return
        if (!handles.has(fold(handle))) return
        if (!methods.has(fold(method))) return

        if (options.message) {
          context.report({
            node,
            messageId: 'custom',
            data: { message: options.message },
          })

          return
        }

        context.report({
          node,
          messageId: 'direct',
          data: { handle, method },
        })
      },
    }
  },
}

export default rule
