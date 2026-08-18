import { endsSentence, endsWithCode } from './prose.utils.ts'
import type { Rule } from 'eslint'
import type { Comment } from 'estree'

export type CommentLine = {
  text: string
  line: number
  node: Comment
  range: [number, number]
  trailing: boolean
  block: boolean
}

export type ExemptionOptions = {
  allowUrls: boolean
  allowIdentifiers: boolean
  allowLabels: string[]
}

export const urlPattern = /https?:\/\/\S+/ // Matches a url anywhere in the text.
export const trailingUrlPattern = /https?:\/\/\S+$/ // Matches a url closing the text.
export const trailingIdentifierPattern = /[\w$)\]]\.[\w$]+$/ // Matches a dotted symbol like `discord.js` at the end.
export const whitespacePattern = /\s/ // Matches one whitespace character.

export const isLineComment = (comment: { type: string }): boolean => {
  return comment.type === 'Line'
}

// A comment with code before it annotates that line rather than continuing the one above.
const hasCodeBefore = (context: Rule.RuleContext, comment: Comment): boolean => {
  const before = context.sourceCode.getTokenBefore(comment, { includeComments: false })
  if (!before) return false

  return before.loc.end.line === comment.loc?.start.line
}

export const readLineComments = (context: Rule.RuleContext): CommentLine[] => {
  const comments = context.sourceCode.getAllComments()
  const collected: CommentLine[] = []

  for (const comment of comments) {
    if (!isLineComment(comment)) continue
    if (!comment.loc || !comment.range) continue

    collected.push({
      text: comment.value.trim(),
      line: comment.loc.start.line,
      node: comment,
      range: comment.range,
      trailing: hasCodeBefore(context, comment),
      block: false,
    })
  }

  return collected
}

// Reads every comment, block ones included, for checks that inspect text rather than flow.
export const readComments = (context: Rule.RuleContext): CommentLine[] => {
  const collected: CommentLine[] = []

  for (const comment of context.sourceCode.getAllComments()) {
    if (!comment.loc || !comment.range) continue

    collected.push({
      text: comment.value.trim(),
      line: comment.loc.start.line,
      node: comment,
      range: comment.range,
      trailing: hasCodeBefore(context, comment),
      block: !isLineComment(comment),
    })
  }

  return collected
}

// A directive like `eslint-disable-next-line no-console` is read by a tool, so rewriting one breaks it.
// Each name matches as a whole word, since a prefix would exempt prose like "Biometrics are cool".
const directives = [
  'eslint',
  'global',
  'globals',
  'exported',
  'jshint',
  'jslint',
  'istanbul',
  'c8',
  'v8',
  'deno-lint',
  'deno-fmt',
  'deno-cov',
  'prettier',
  'biome',
]

// These carry their argument in the same token, so they match as a prefix rather than a word.
const directivePrefixes = ['ts-', '@ts-', '@type', 'type-coverage:']

export const isDirective = (text: string): boolean => {
  if (directivePrefixes.some((prefix) => text.startsWith(prefix))) return true

  const [first = ''] = text.split(whitespacePattern)

  return directives.some((name) => first === name || first.startsWith(`${name}-`))
}

// A bare prefix match would exempt prose such as "Actually this sentence wraps".
export const startsWithLabel = (text: string, labels: string[]): boolean => {
  return labels.some((label) => text === label || text.startsWith(`${label} `) || text.startsWith(`${label}:`))
}

// A comment carries on to the next line when it does not close a sentence itself.
export const looksUnfinished = (text: string, options: ExemptionOptions): boolean => {
  const { allowUrls, allowIdentifiers } = options

  if (text.length === 0) return false
  if (endsSentence(text)) return false
  // A line closing on a url or a symbol like `discord.js` reads as finished without a period.
  if (allowUrls && trailingUrlPattern.test(text)) return false
  if (allowIdentifiers && trailingIdentifierPattern.test(text)) return false
  if (allowIdentifiers && endsWithCode(text)) return false

  return true
}

export const isAdjacent = (first: CommentLine, second: CommentLine): boolean => {
  return second.line === first.line + 1
}

export type WrappedPair = {
  comment: CommentLine
  next: CommentLine
}

// One definition of a wrapped sentence, shared by both of the remedies onWrap selects between.
export const findWrappedPairs = (comments: CommentLine[], options: ExemptionOptions): WrappedPair[] => {
  const pairs: WrappedPair[] = []

  comments.forEach((comment, index) => {
    const text = comment.text
    if (startsWithLabel(text, options.allowLabels)) return

    // Joining a directive into the next line changes what the tool reading it sees.
    if (isDirective(text)) return

    const next = comments[index + 1]
    if (!next) return
    if (isDirective(next.text)) return
    if (!isAdjacent(comment, next)) return

    // Two trailing comments annotate their own lines rather than one continuing the other.
    if (comment.trailing || next.trailing) return

    if (startsWithLabel(next.text, options.allowLabels)) return
    if (!looksUnfinished(text, options)) return

    pairs.push({ comment, next })
  })

  return pairs
}
