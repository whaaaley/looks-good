import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { Node, TryStatement } from 'estree'

type Options = {
  module: string
  sync: string
  async: string
}

const defaults: Options = {
  module: '',
  sync: 'safe',
  async: 'safeAsync',
}

const functionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
])

// Answers whether an await could be written where the node sits.
const isAsyncPosition = (ancestors: Node[]): boolean => {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index]

    if (!ancestor) continue

    // await is a syntax error inside a static block, so it is always a sync position.
    if (ancestor.type === 'StaticBlock') return false

    if (!functionTypes.has(ancestor.type)) continue

    return Reflect.get(ancestor, 'async') === true
  }

  // A try in a module body is treated as async, since a module body can hold a top level await.
  return true
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports a try statement with a catch clause in favour of a result helper',
      url: docUrl('no-try-catch-handler'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        module: { type: 'string' },
        sync: { type: 'string' },
        async: { type: 'string' },
      },
    }],
    messages: {
      helper: 'Wrap the call in {{helper}} and guard on the returned error. A try with only a finally clause is still allowed.',
      helperFrom: 'Wrap the call in {{helper}} from {{module}} and guard on the returned error. A try with only a finally clause is still allowed.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (node: TryStatement): void => {
      if (!node.handler) return

      const helper = isAsyncPosition(context.sourceCode.getAncestors(node)) ? options.async : options.sync

      context.report({
        node,
        messageId: options.module ? 'helperFrom' : 'helper',
        data: {
          helper,
          module: options.module,
        },
      })
    }

    return {
      TryStatement: check,
    }
  },
}

export default rule
