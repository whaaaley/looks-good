import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { Node } from 'estree'

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

// A try in a module body is treated as async, since a module body can hold a top level await.
const isAsyncPosition = (ancestors: Node[]): boolean => {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index]

    if (!ancestor || !functionTypes.has(ancestor.type)) continue

    return Reflect.get(ancestor, 'async') === true
  }

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
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          module: { type: 'string' },
          sync: { type: 'string' },
          async: { type: 'string' },
        },
      },
    ],
    messages: {
      helper: 'Wrap the call in {{helper}} and guard on the returned error. A try with only a finally clause is still allowed.',
      helperFrom: 'Wrap the call in {{helper}} from {{module}} and guard on the returned error. A try with only a finally clause is still allowed.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    return {
      TryStatement(node): void {
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
      },
    }
  },
}

export default rule
