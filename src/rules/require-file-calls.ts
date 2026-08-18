import { docUrl } from '../utils/docs.utils.ts'
import { matchesGlob } from '../utils/glob.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Identifier, Literal, MemberExpression, Program } from 'estree'

export type Matcher = {
  call?: string
  member?: string
  identifier?: string
  literal?: string
}

type Condition = { references?: string; found?: string }

export type FileRequirement = {
  id: string
  files?: string
  when?: Condition
  require?: Matcher[]
  requireAny?: Matcher[]
  message: string
}

type Options = {
  patterns: FileRequirement[]
}

type Dangling = { id: string; found: string }

const defaults: Options = {
  patterns: [],
}

// What a traversal collected from one file, which every entry is then evaluated against.
type Contents = {
  calls: string[]
  methods: string[]
  members: string[]
  identifiers: string[]
  literals: Set<string>
}

// A matcher name is literal apart from a trailing `*`, so `caller*` matches `caller` and `callerTwo`.
const nameMatches = (pattern: string, name: string): boolean => {
  if (!pattern.endsWith('*')) return pattern === name

  return name.startsWith(pattern.slice(0, -1))
}

const someMatches = (pattern: string, names: string[]): boolean => names.some((name) => nameMatches(pattern, name))

const matcherMet = (matcher: Matcher, contents: Contents): boolean => {
  if (matcher.call !== undefined) {
    // A leading `*.` asks for a method call on any receiver, so `*.parse` matches `schema.parse(...)`.
    if (matcher.call.startsWith('*.')) {
      return someMatches(matcher.call.slice(2), contents.methods)
    }

    return someMatches(matcher.call, contents.calls)
  }

  if (matcher.member !== undefined) {
    return someMatches(matcher.member, contents.members)
  }

  if (matcher.identifier !== undefined) {
    return someMatches(matcher.identifier, contents.identifiers)
  }

  if (matcher.literal !== undefined) {
    return contents.literals.has(matcher.literal)
  }

  // An empty matcher constrains nothing, so it is vacuously met.
  return true
}

const entryMet = (entry: FileRequirement, contents: Contents): boolean => {
  const all = entry.require ?? []
  const any = entry.requireAny ?? []

  return all.every((matcher) => matcherMet(matcher, contents)) &&
    (any.length === 0 || any.some((matcher) => matcherMet(matcher, contents)))
}

const matcherSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    call: { type: 'string', minLength: 1 },
    member: { type: 'string', minLength: 1 },
    identifier: { type: 'string', minLength: 1 },
    literal: { type: 'string' },
  },
} as const

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires a file to contain the calls its path or contents call for',
      url: docUrl('require-file-calls'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'message'],
            properties: {
              id: { type: 'string', minLength: 1 },
              files: { type: 'string', minLength: 1 },
              when: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  references: { type: 'string', minLength: 1 },
                  found: { type: 'string', minLength: 1 },
                },
              },
              require: { type: 'array', items: matcherSchema },
              requireAny: { type: 'array', items: matcherSchema },
              message: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    }],
    messages: {
      missing: '{{id}}: {{message}}',
      unknownFound: "The entry '{{id}}' waits on '{{found}}', which no entry defines. Name an entry that exists.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const known = new Set(options.patterns.map((entry) => entry.id))

    const dangling: Dangling[] = []
    for (const entry of options.patterns) {
      const when = entry.when ?? {}
      if (when.found === undefined) continue
      if (known.has(when.found)) continue

      dangling.push({ id: entry.id, found: when.found })
    }

    const contents: Contents = {
      calls: [],
      methods: [],
      members: [],
      identifiers: [],
      literals: new Set(),
    }

    const applicable = options.patterns.filter((entry) => {
      if (!entry.files) return true

      return matchesGlob(entry.files, context.filename, context.cwd)
    })

    const reportDangling = (program: Program): void => {
      for (const entry of dangling) {
        context.report({
          node: program,
          messageId: 'unknownFound',
          data: { id: entry.id, found: entry.found },
        })
      }
    }

    const check = (program: Program): void => {
      // Every entry is measured before any is gated, so a when.found may name an entry declared later in the list.
      const satisfied = new Set<string>()

      for (const entry of applicable) {
        if (entryMet(entry, contents)) satisfied.add(entry.id)
      }

      for (const entry of applicable) {
        const when = entry.when ?? {}
        if (when.references !== undefined && !someMatches(when.references, contents.identifiers)) {
          continue
        }

        if (when.found !== undefined && !satisfied.has(when.found)) continue

        if (satisfied.has(entry.id)) continue

        context.report({
          node: program,
          messageId: 'missing',
          data: { id: entry.id, message: entry.message },
        })
      }
    }

    // A deliberate perf guard: with nothing to report or evaluate, skip the traversal entirely.
    if (applicable.length === 0 && dangling.length === 0) return {}

    return {
      Program: reportDangling,
      CallExpression: (node: CallExpression): void => {
        const { callee } = node
        if (callee.type === 'Identifier') {
          contents.calls.push(callee.name)
        }

        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          contents.methods.push(callee.property.name)
        }
      },
      MemberExpression: (node: MemberExpression): void => {
        if (node.object.type !== 'Identifier') return

        contents.members.push(node.object.name)
      },
      Identifier: (node: Identifier): void => {
        contents.identifiers.push(node.name)
      },
      Literal: (node: Literal): void => {
        if (typeof node.value !== 'string') return

        contents.literals.add(node.value)
      },
      'Program:exit': check,
    }
  },
}

export default rule
