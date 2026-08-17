import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Node } from 'estree'

type Match = 'word' | 'exact'
type Depth = 'top' | 'any'

type Options = {
  sequence: string[]
  match: Match
  ignoreCase: boolean
  requireAll: boolean
  testFunctions: string[]
  depth: Depth
}

const defaults: Options = {
  sequence: [],
  match: 'word',
  ignoreCase: true,
  requireAll: false,
  testFunctions: ['describe'],
  depth: 'any',
}

const wildcard = '*'

type Group = {
  title: string
  node: CallExpression
}

// A call written as `describe.only` or `describe.skip` is still that group function.
const calleeName = (node: CallExpression): string => {
  const { callee } = node
  if (callee.type === 'Identifier') return callee.name

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return callee.object.name
  }

  return ''
}

const readTitle = (node: CallExpression): string => {
  const [first] = node.arguments
  if (!first) return ''
  if (first.type !== 'Literal') return ''
  if (typeof first.value !== 'string') return ''

  return first.value
}

// The body is the block of the last function argument, which is where a group nests its children.
const readBody = (node: CallExpression): Node | null => {
  for (let index = node.arguments.length - 1; index >= 0; index -= 1) {
    const argument = node.arguments[index]
    if (!argument) continue
    if (argument.type !== 'FunctionExpression' && argument.type !== 'ArrowFunctionExpression') continue
    if (argument.body.type !== 'BlockStatement') return null

    return argument.body
  }

  return null
}

// A statement inside a group body is a child group only when it is a bare call to a group function.
const readChildCall = (statement: Node, testFunctions: string[]): CallExpression | null => {
  if (statement.type !== 'ExpressionStatement') return null
  if (statement.expression.type !== 'CallExpression') return null

  const call = statement.expression
  if (!testFunctions.includes(calleeName(call))) return null

  return call
}

const escapeForRegExp = (source: string): string => {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const hasWholeWord = (haystack: string, needle: string, ignoreCase: boolean): boolean => {
  const flags = ignoreCase ? 'iu' : 'u'
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeForRegExp(needle)}(?![\\p{L}\\p{N}_])`, flags)

  return pattern.test(haystack)
}

const matchesName = (title: string, name: string, options: Options): boolean => {
  if (options.match === 'exact') {
    if (!options.ignoreCase) return title === name

    return title.toLowerCase() === name.toLowerCase()
  }

  return hasWholeWord(title, name, options.ignoreCase)
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires sibling describe groups to appear in a configured order',
      url: docUrl('describe-group-order'),
    },
    defaultOptions: [defaults],
    // Reordering test groups moves code, which is not safe to automate.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          sequence: { type: 'array', items: { type: 'string', minLength: 1 } },
          match: { type: 'string', enum: ['word', 'exact'] },
          ignoreCase: { type: 'boolean' },
          requireAll: { type: 'boolean' },
          testFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
          depth: { type: 'string', enum: ['top', 'any'] },
        },
      },
    ],
    messages: {
      order: "The '{{title}}' group comes before '{{previous}}'. Move it below so these groups read {{expected}}.",
      missing: "No group here covers '{{name}}'. Add a '{{name}}' group so this file reads {{expected}}.",
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    if (options.sequence.length === 0) return {}

    const named = options.sequence.filter((name) => name !== wildcard)
    const wildcardRank = options.sequence.indexOf(wildcard)
    const expected = options.sequence.join(', then ')

    // A title matching no name sits in the wildcard slot, and is otherwise unranked.
    const rankOf = (title: string): number => {
      for (let index = 0; index < options.sequence.length; index += 1) {
        const name = options.sequence[index]
        if (!name || name === wildcard) continue
        if (matchesName(title, name, options)) return index
      }

      return wildcardRank
    }

    const checkSiblings = (groups: Group[], report: Node): void => {
      let highest = -1
      let previous = ''

      for (const group of groups) {
        const rank = rankOf(group.title)
        if (rank < 0) continue

        if (rank < highest) {
          context.report({
            node: group.node,
            messageId: 'order',
            data: { title: group.title, previous, expected },
          })

          continue
        }

        highest = rank
        previous = group.title
      }

      if (!options.requireAll) return

      // A set where no group is named at all is a set of wrappers, and has no sequence to complete.
      const isNamed = (group: Group): boolean => named.some((name) => matchesName(group.title, name, options))
      if (!groups.some(isNamed)) return

      for (const name of named) {
        if (groups.some((group) => matchesName(group.title, name, options))) continue

        context.report({
          node: report,
          messageId: 'missing',
          data: { name, expected },
        })
      }
    }

    const readGroups = (call: CallExpression): Group[] => {
      const body = readBody(call)
      if (!body || body.type !== 'BlockStatement') return []

      const groups: Group[] = []

      for (const statement of body.body) {
        const child = readChildCall(statement, options.testFunctions)
        if (!child) continue

        groups.push({ title: readTitle(child), node: child })
      }

      return groups
    }

    // A describe nested inside another describe is a sibling set of its own only when depth allows it.
    const isNested = (node: CallExpression & Rule.NodeParentExtension): boolean => {
      let current: Rule.Node | null = node.parent

      while (current) {
        if (current.type === 'CallExpression' && options.testFunctions.includes(calleeName(current))) return true

        current = current.type === 'Program' ? null : current.parent
      }

      return false
    }

    return {
      Program: (node): void => {
        const groups: Group[] = []

        for (const statement of context.sourceCode.ast.body) {
          const child = readChildCall(statement, options.testFunctions)
          if (!child) continue

          groups.push({ title: readTitle(child), node: child })
        }

        if (groups.length === 0) return

        checkSiblings(groups, node)
      },

      CallExpression: (node: CallExpression & Rule.NodeParentExtension): void => {
        if (!options.testFunctions.includes(calleeName(node))) return
        if (options.depth === 'top' && isNested(node)) return

        const groups = readGroups(node)
        if (groups.length === 0) return

        checkSiblings(groups, node)
      },
    }
  },
}

export default rule
