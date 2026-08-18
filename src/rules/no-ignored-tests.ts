import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

type Options = {
  modifiers: string[]
  testFunctions: string[]
}

const defaults: Options = {
  modifiers: ['ignore', 'skip', 'todo', 'failing'],
  testFunctions: ['it', 'test', 'describe'],
}

type Found = {
  modifier: string
}

// A skipped test is written either as `it.skip(...)` or as the prefixed `xit(...)`.
const readModifier = (node: CallExpression, options: Options): Found | null => {
  const { callee } = node

  if (callee.type === 'MemberExpression' && !callee.computed) {
    if (callee.object.type !== 'Identifier') return null
    if (callee.property.type !== 'Identifier') return null
    if (!options.testFunctions.includes(callee.object.name)) return null
    if (!options.modifiers.includes(callee.property.name)) return null

    return { modifier: callee.property.name }
  }

  if (callee.type === 'Identifier') {
    // The x prefix is shorthand for skipping, so it follows whether skip is configured.
    if (!options.modifiers.includes('skip')) return null
    if (!callee.name.startsWith('x')) return null

    const base = callee.name.slice(1)
    if (!options.testFunctions.includes(base)) return null

    // The reported name is the one written in the source, so a reader can find it.
    return { modifier: callee.name }
  }

  return null
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports a skipped or ignored test',
      url: docUrl('no-ignored-tests'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        modifiers: { type: 'array', items: { type: 'string', minLength: 1 } },
        testFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
      },
    }],
    messages: {
      ignored: "This test is marked '{{modifier}}', so it proves nothing while it sits here. Land the work it covers and un-skip it, rather than leaving it skipped.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    return {
      CallExpression: (node: CallExpression): void => {
        const found = readModifier(node, options)
        if (!found) return

        context.report({
          node,
          messageId: 'ignored',
          data: { modifier: found.modifier },
        })
      },
    }
  },
}

export default rule
