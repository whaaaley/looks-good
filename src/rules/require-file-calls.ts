import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Identifier, Literal, MemberExpression, Program } from 'estree'

export type Matcher = {
  call?: string
  member?: string
  identifier?: string
  literal?: string
}

export type FileRequirement = {
  id: string
  files?: string
  when?: { references?: string; found?: string }
  require?: Matcher[]
  requireAny?: Matcher[]
  message: string
}

type Options = {
  patterns: FileRequirement[]
}

const defaults: Options = {
  patterns: [],
}

// What a traversal collected from one file, which every entry is then evaluated against.
type Contents = {
  calls: Set<string>
  methods: Set<string>
  members: Set<string>
  identifiers: Set<string>
  literals: Set<string>
}

const escapeRegExp = (source: string): string => {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A glob segment is literal apart from `*`, which stands for any run of characters.
// `**` and `*` both cross directory separators, since a path glob here is matched against a whole path.
const globToRegExp = (glob: string): RegExp => {
  const body = glob
    .split(/\*+/)
    .map((part) => escapeRegExp(part))
    .join('.*')

  return new RegExp(`^${body}$`, 'u')
}

// A matcher name is literal apart from a trailing `*`, so `caller*` matches `caller` and `callerTwo`.
const nameMatches = (pattern: string, name: string): boolean => {
  if (!pattern.endsWith('*')) return pattern === name

  return name.startsWith(pattern.slice(0, -1))
}

const someMatches = (pattern: string, names: Set<string>): boolean => {
  for (const name of names) {
    if (nameMatches(pattern, name)) return true
  }

  return false
}

const satisfies = (matcher: Matcher, contents: Contents): boolean => {
  if (matcher.call !== undefined) {
    // A leading `*.` asks for a method call on any receiver, so `*.parse` matches `schema.parse(...)`.
    if (matcher.call.startsWith('*.')) {
      return someMatches(matcher.call.slice(2), contents.methods)
    }

    return someMatches(matcher.call, contents.calls)
  }

  if (matcher.member !== undefined) return someMatches(matcher.member, contents.members)
  if (matcher.identifier !== undefined) return someMatches(matcher.identifier, contents.identifiers)
  if (matcher.literal !== undefined) return contents.literals.has(matcher.literal)

  return true
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
    // Writing the missing call is a decision, so this reports only.
    fixable: undefined,
    schema: [
      {
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
      },
    ],
    messages: {
      missing: '{{id}}: {{message}}',
      unknownFound: "The entry '{{id}}' waits on '{{found}}', which no entry defines. Name an entry that exists.",
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const known = new Set(options.patterns.map((entry) => entry.id))

    // A `when.found` naming an entry that does not exist would silently never apply, so it is a configuration error.
    const dangling = options.patterns.filter((entry) => {
      const found = entry.when?.found
      if (!found) return false

      return !known.has(found)
    })

    const contents: Contents = {
      calls: new Set(),
      methods: new Set(),
      members: new Set(),
      identifiers: new Set(),
      literals: new Set(),
    }

    const applicable = options.patterns.filter((entry) => {
      if (!entry.files) return true

      return globToRegExp(entry.files).test(context.filename)
    })

    return {
      CallExpression: (node: CallExpression): void => {
        const { callee } = node
        if (callee.type === 'Identifier') {
          contents.calls.add(callee.name)
        }

        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          contents.methods.add(callee.property.name)
        }
      },

      MemberExpression: (node: MemberExpression): void => {
        if (node.object.type !== 'Identifier') return

        contents.members.add(node.object.name)
      },

      Identifier: (node: Identifier): void => {
        contents.identifiers.add(node.name)
      },

      Literal: (node: Literal): void => {
        if (typeof node.value !== 'string') return

        contents.literals.add(node.value)
      },

      'Program:exit': (program: Program): void => {
        for (const entry of dangling) {
          context.report({
            node: program,
            messageId: 'unknownFound',
            data: { id: entry.id, found: entry.when?.found ?? '' },
          })
        }

        const meets = (entry: FileRequirement): boolean => {
          const all = entry.require ?? []
          const any = entry.requireAny ?? []

          return all.every((matcher) => satisfies(matcher, contents)) &&
            (any.length === 0 || any.some((matcher) => satisfies(matcher, contents)))
        }

        // Every entry is measured before any is gated, so a when.found may name an entry declared later in the list.
        const satisfied = new Set<string>()

        for (const entry of applicable) {
          if (meets(entry)) satisfied.add(entry.id)
        }

        for (const entry of applicable) {
          const references = entry.when?.references
          if (references && !someMatches(references, contents.identifiers)) continue

          const found = entry.when?.found
          if (found && !satisfied.has(found)) continue

          if (satisfied.has(entry.id)) continue

          context.report({
            node: program,
            messageId: 'missing',
            data: { id: entry.id, message: entry.message },
          })
        }
      },
    }
  },
}

export default rule
