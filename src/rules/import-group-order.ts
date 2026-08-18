// Ported from the `order` rule of eslint-plugin-import-x, MIT licensed.
// Copyright (c) 2015 Ben Mosher and eslint-plugin-import-x contributors.
// Source: https://github.com/un-ts/eslint-plugin-import-x/blob/v4.17.1/src/rules/order.ts
// The original permission notice is reproduced in LICENSE.
// This port classifies a specifier by its text alone, where the original resolves it against the filesystem.

import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { Comment, ImportDeclaration, Node, Program } from 'estree'

type GroupName = 'builtin' | 'external' | 'internal' | 'parent' | 'sibling' | 'index' | 'object' | 'type' | 'unknown'

type Alphabetize = {
  order: 'asc' | 'desc' | 'ignore'
  orderImportKind: 'asc' | 'desc' | 'ignore'
  caseInsensitive: boolean
}

type Options = {
  groups: GroupName[]
  alphabetize: Alphabetize
  newlinesBetween: 'never' | 'ignore'
  internalPrefixes: string[]
}

// The estree types do not model a type-only import, so this names the field TypeScript parsers add.
type TypedImport = ImportDeclaration & { importKind?: string }

type Order = 'before' | 'after'

type Entry = {
  node: ImportDeclaration
  value: string
  isType: boolean
  rank: number
}

export const bareNamePattern = /^\w/ // A bare package name opens with a word character.
export const scopedNamePattern = /^@[^/]+\/?[^/]+/ // A scoped package name is a scope segment plus a name.
export const parentSpecifierPattern = /^\.\.$|^\.\.[/\\]/ // A parent specifier is two dots alone or opening a path.
export const siblingSpecifierPattern = /^\.[/\\]/ // A sibling specifier opens with one dot and a separator.
export const blankTextPattern = /^\s*$/ // Blank text is whitespace alone.

const groupNames: GroupName[] = ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type', 'unknown']

const defaults: Options = {
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
  alphabetize: { order: 'ignore', orderImportKind: 'ignore', caseInsensitive: false },
  newlinesBetween: 'ignore',
  internalPrefixes: [],
}

// Node's own module set, so `node:` and the bare spellings both land in the builtin group.
const builtins = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
])

const indexSpecifiers = new Set(['.', './', './index', './index.js'])

// The scope and package name, so a subpath sorts under the package it belongs to.
const baseModule = (name: string): string => {
  const parts = name.split('/')
  if (name.startsWith('@')) return parts.slice(0, 2).join('/')

  const [first] = parts
  return first ?? name
}

// A bare name looks like a package, which is what the original falls back to when resolution finds nothing.
const isExternalLooking = (name: string): boolean => {
  return bareNamePattern.test(name) || scopedNamePattern.test(name)
}

const classify = (name: string, internalPrefixes: string[]): GroupName => {
  if (internalPrefixes.some((prefix) => name.startsWith(prefix))) {
    return 'internal'
  }

  // Deno's registry schemes name the supplier rather than a path, so they carry their group in the scheme.
  if (name.startsWith('node:')) return 'builtin'
  if (name.startsWith('jsr:') || name.startsWith('npm:')) return 'external'
  if (name.startsWith('http:') || name.startsWith('https:')) return 'external'

  if (name.startsWith('/')) return 'unknown'
  if (builtins.has(baseModule(name))) return 'builtin'
  if (parentSpecifierPattern.test(name)) return 'parent'
  if (indexSpecifiers.has(name)) return 'index'
  if (siblingSpecifierPattern.test(name)) return 'sibling'
  if (isExternalLooking(name)) return 'external'

  return 'unknown'
}

const compareString = (a: string, b: string): number => {
  if (a < b) return -1
  if (a > b) return 1

  return 0
}

const relativeDots = new Set(['.', '..'])

// Segment-wise comparison, so a shorter path sorts above a longer one sharing its prefix.
const comparePath = (a: string, b: string): number => {
  if (!a.includes('/') && !b.includes('/')) return compareString(a, b)

  const left = a.split('/')
  const right = b.split('/')
  let result = 0

  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const x = left[index] ?? ''
    const y = right[index] ?? ''

    // A leading dot run only says which group the import is in, which the rank already decided.
    if (index === 0 && relativeDots.has(x) && relativeDots.has(y)) {
      // A sibling against a parent shares no path to walk, so the depth tiebreak below settles it.
      if (x !== y) break

      continue
    }

    result = compareString(x, y)
    if (result) break
  }

  // A shallower path sorts above a deeper one that it shares a prefix with.
  if (!result && left.length !== right.length) {
    return left.length < right.length ? -1 : 1
  }

  return result
}

const makeSorter = (alphabetize: Alphabetize) => {
  const multiplier = alphabetize.order === 'desc' ? -1 : 1
  const kindMultiplier = alphabetize.orderImportKind === 'desc' ? -1 : 1

  return (a: Entry, b: Entry): number => {
    const left = alphabetize.caseInsensitive ? a.value.toLowerCase() : a.value
    const right = alphabetize.caseInsensitive ? b.value.toLowerCase() : b.value

    const result = comparePath(left, right) * multiplier
    if (result) return result

    if (alphabetize.orderImportKind === 'ignore') return 0

    return kindMultiplier * compareString(a.isType ? 'type' : 'value', b.isType ? 'type' : 'value')
  }
}

// The rank a group sits at, with an omitted group parked past every named one.
const rankOf = (group: GroupName, groups: GroupName[]): number => {
  const index = groups.indexOf(group)
  if (index === -1) return groups.length * 2

  return index * 2
}

// Sorting inside each group turns a group rank into a rank unique to the import.
const alphabetizeRanks = (entries: Entry[], alphabetize: Alphabetize): void => {
  const byRank = new Map<number, Entry[]>()

  for (const entry of entries) {
    const bucket = byRank.get(entry.rank)
    if (bucket) {
      bucket.push(entry)
      continue
    }

    byRank.set(entry.rank, [entry])
  }

  const sorter = makeSorter(alphabetize)
  const ranks = [...byRank.keys()].sort((a, b) => a - b)

  let offset = 0
  for (const rank of ranks) {
    const bucket = byRank.get(rank) ?? []
    bucket.sort(sorter)

    for (const entry of bucket) {
      entry.rank = rank + offset
      offset += 1
    }
  }
}

// Every import that sits below one ranked above it, which is the set the original reports.
const findOutOfOrder = (entries: Entry[]): Entry[] => {
  const [first] = entries
  if (!first) return []

  let highest = first
  return entries.filter((entry) => {
    const isBelow = entry.rank < highest.rank
    if (highest.rank < entry.rank) highest = entry

    return isBelow
  })
}

const reversed = (entries: Entry[]): Entry[] => {
  return entries.map((entry) => ({ ...entry, rank: -entry.rank })).reverse()
}

const describe = (entry: Entry): string => {
  return entry.isType ? 'type import' : 'import'
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforces a group order and an alphabetical order among the imports of a file',
      url: docUrl('import-group-order'),
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          groups: { type: 'array', items: { enum: groupNames } },
          alphabetize: {
            type: 'object',
            additionalProperties: false,
            properties: {
              order: { enum: ['asc', 'desc', 'ignore'] },
              orderImportKind: { enum: ['asc', 'desc', 'ignore'] },
              caseInsensitive: { type: 'boolean' },
            },
          },
          newlinesBetween: { enum: ['never', 'ignore'] },
          internalPrefixes: { type: 'array', items: { type: 'string', minLength: 1 } },
        },
      },
    ],
    messages: {
      order: '{{second}} should occur {{order}} {{first}}',
      gap: 'There should be no empty line between import groups',
    },
  },
  create(context): Rule.RuleListener {
    const raw: Record<string, unknown> = context.options[0] ?? {}
    const { sourceCode } = context

    const options: Options = {
      groups: Array.isArray(raw.groups) ? raw.groups : defaults.groups,
      alphabetize: { ...defaults.alphabetize, ...(typeof raw.alphabetize === 'object' && raw.alphabetize ? raw.alphabetize : {}) },
      newlinesBetween: raw.newlinesBetween === 'never' ? 'never' : 'ignore',
      internalPrefixes: Array.isArray(raw.internalPrefixes) ? raw.internalPrefixes : defaults.internalPrefixes,
    }

    // A comment written on the same line as the import travels with it.
    const trailingCommentEnd = (node: Node): number => {
      const [, nodeEnd] = node.range ?? [0, 0]
      let end = nodeEnd

      for (const comment of sourceCode.getCommentsAfter(node)) {
        if (comment.loc?.start.line !== node.loc?.end.line) break

        const [, commentEnd] = comment.range ?? [0, end]
        end = commentEnd
      }

      return end
    }

    // Only a comment sharing the import's own line moves with it, which leaves a comment written above in place.
    const leadingCommentStart = (node: Node): number => {
      const [nodeStart] = node.range ?? [0, 0]
      const before: Comment[] = sourceCode.getCommentsBefore(node)

      let start = nodeStart
      for (let index = before.length - 1; index >= 0; index -= 1) {
        const comment = before[index]
        if (!comment) break
        if (comment.loc?.start.line !== comment.loc?.end.line) break
        if (comment.loc?.end.line !== node.loc?.start.line) break

        const [commentStart] = comment.range ?? [start, 0]
        start = commentStart
      }

      return start
    }

    // The whole line an import occupies, comments included, which is the unit a fix moves.
    const lineRange = (node: Node): [number, number] => {
      const text = sourceCode.getText()
      let start = leadingCommentStart(node)
      while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) start -= 1

      let end = trailingCommentEnd(node)
      while (end < text.length && (text[end] === ' ' || text[end] === '\t' || text[end] === '\r')) end += 1
      if (text[end] === '\n') end += 1

      return [start, end]
    }

    const reportPair = (first: Entry, second: Entry, order: Order): void => {
      const text = sourceCode.getText()
      const [firstStart, firstEnd] = lineRange(first.node)
      const [secondStart, secondEnd] = lineRange(second.node)

      let moved = text.slice(secondStart, secondEnd)
      if (!moved.endsWith('\n')) moved = `${moved}\n`

      const data = {
        first: `${describe(first)} of \`${first.value}\``,
        second: `\`${second.value}\` ${describe(second)}`,
        order,
      }

      context.report({
        node: second.node,
        messageId: 'order',
        data,
        fix: (fixer): Rule.Fix => {
          if (order === 'before') {
            return fixer.replaceTextRange([firstStart, secondEnd], moved + text.slice(firstStart, secondStart))
          }

          return fixer.replaceTextRange([secondStart, firstEnd], text.slice(secondEnd, firstEnd) + moved)
        },
      })
    }

    // Reporting from whichever direction names fewer imports is what keeps the report short.
    const reportOrder = (entries: Entry[]): void => {
      const forward = findOutOfOrder(entries)
      if (forward.length === 0) return

      const backwardEntries = reversed(entries)
      const backward = findOutOfOrder(backwardEntries)

      if (backward.length < forward.length) {
        for (const entry of backward) {
          const partner = backwardEntries.find((candidate) => candidate.rank > entry.rank)
          if (partner) reportPair(partner, entry, 'after')
        }

        return
      }

      for (const entry of forward) {
        const partner = entries.find((candidate) => candidate.rank > entry.rank)
        if (partner) reportPair(partner, entry, 'before')
      }
    }

    // The gap is reported against the import above it, which is where the blank line was written.
    const reportGaps = (entries: Entry[]): void => {
      const text = sourceCode.getText()

      for (let index = 1; index < entries.length; index += 1) {
        const previous = entries[index - 1]
        const current = entries[index]
        if (!previous || !current) continue

        // Only a line holding nothing counts as a gap, so a comment written between two imports is not one.
        const above = previous.node.loc?.end.line ?? 0
        const below = current.node.loc?.start.line ?? 0
        const empty = sourceCode.lines.slice(above, below - 1).filter((line) => line.trim().length === 0).length
        if (empty === 0) continue

        const [, previousEnd] = lineRange(previous.node)
        const currentStart = leadingCommentStart(current.node)
        const between = text.slice(previousEnd, currentStart)

        // Anything other than whitespace between the two lines is not this rule's to remove.
        const isBlank = blankTextPattern.test(between)

        context.report({
          node: previous.node,
          messageId: 'gap',
          fix: isBlank ? (fixer): Rule.Fix => fixer.removeRange([previousEnd, currentStart]) : null,
        })
      }
    }

    return {
      'Program:exit': (program: Program): void => {
        const entries: Entry[] = []

        for (const statement of program.body) {
          if (statement.type !== 'ImportDeclaration') continue
          if (statement.specifiers.length === 0) continue

          const declaration: TypedImport = statement
          const value = String(statement.source.value)
          const isType = declaration.importKind === 'type'
          const group: GroupName = isType && options.groups.includes('type') ? 'type' : classify(value, options.internalPrefixes)

          entries.push({ node: statement, value, isType, rank: rankOf(group, options.groups) })
        }

        if (entries.length < 2) return

        if (options.alphabetize.order !== 'ignore') {
          alphabetizeRanks(entries, options.alphabetize)
        }

        reportOrder(entries)
        if (options.newlinesBetween === 'never') reportGaps(entries)
      },
    }
  },
}

export default rule
