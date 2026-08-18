import { docUrl } from '../utils/docs.utils.ts'
import { calleeName, readBody, readTitle } from '../utils/test.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Node } from 'estree'

// A word character here is any letter, digit, or underscore, so a needle sitting inside a longer word is not a match.
const wordCharacterSource = '\\p{L}\\p{N}_'
export const wordPrefixSource = `(?<![${wordCharacterSource}])`
export const wordSuffixSource = `(?![${wordCharacterSource}])`
export const sensitiveWordFlags = 'u'
export const insensitiveWordFlags = 'iu'

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

// A statement inside a group body is a child group only when it is a bare call to a group function.
const readChildCall = (statement: Node, testFunctions: string[]): CallExpression | null => {
  if (statement.type !== 'ExpressionStatement') return null
  if (statement.expression.type !== 'CallExpression') return null

  const call = statement.expression
  if (!testFunctions.includes(calleeName(call))) return null

  return call
}

export const wholeWordPatternFor = (name: string, ignoreCase: boolean): RegExp => {
  const flags = ignoreCase ? insensitiveWordFlags : sensitiveWordFlags

  return new RegExp(`${wordPrefixSource}${RegExp.escape(name)}${wordSuffixSource}`, flags)
}

// The needles come from the configured sequence, so each whole word pattern is built once per rule run.
const compileWholeWords = (names: string[], ignoreCase: boolean): Map<string, RegExp> => {
  const compiled = new Map<string, RegExp>()

  for (const name of names) {
    compiled.set(name, wholeWordPatternFor(name, ignoreCase))
  }

  return compiled
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires sibling describe groups to appear in a configured order',
      url: docUrl('describe-group-order'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
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
    }],
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
    const wholeWords = compileWholeWords(named, options.ignoreCase)

    const matchesName = (title: string, name: string): boolean => {
      if (options.match === 'exact') {
        if (!options.ignoreCase) return title === name

        return title.toLowerCase() === name.toLowerCase()
      }

      const pattern = wholeWords.get(name)
      if (!pattern) return false

      return pattern.test(title)
    }

    // A title matching no name sits in the wildcard slot, and is otherwise unranked.
    const rankOf = (title: string): number => {
      for (let index = 0; index < options.sequence.length; index += 1) {
        const name = options.sequence[index]
        if (!name || name === wildcard) continue
        if (matchesName(title, name)) return index
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
      const isNamed = (group: Group): boolean => named.some((name) => matchesName(group.title, name))
      if (!groups.some(isNamed)) return

      for (const name of named) {
        if (groups.some((group) => matchesName(group.title, name))) continue

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
        if (current.type === 'CallExpression' && options.testFunctions.includes(calleeName(current))) {
          return true
        }

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
