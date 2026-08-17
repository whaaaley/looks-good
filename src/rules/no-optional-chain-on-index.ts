import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { MemberExpression } from 'estree'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbids optional chaining on an indexed access',
      url: docUrl('no-optional-chain-on-index'),
    },
    // Naming the element is a decision about what to call it, so this reports only.
    fixable: undefined,
    schema: [],
    messages: {
      chained: 'This defers the empty case rather than deciding it, and conflates a missing element with a missing property. Destructure the element and guard the binding.',
    },
  },

  create(context): Rule.RuleListener {
    return {
      // In `items[0]?.name` the optional read sits above the computed one.
      'MemberExpression[optional=true] > MemberExpression.object[computed=true]': (node: MemberExpression): void => {
        context.report({ node, messageId: 'chained' })
      },

      // The same read written as a call is `handlers[name]?.()`.
      'CallExpression[optional=true] > MemberExpression.callee[computed=true]': (node: MemberExpression): void => {
        context.report({ node, messageId: 'chained' })
      },
    }
  },
}

export default rule
