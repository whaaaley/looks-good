import { isDirective } from '../../utils/comment.utils.ts'
import { endsSentence, endsWithCode } from '../../utils/prose.utils.ts'
import type { CommentLine } from '../../utils/comment.utils.ts'

export type ExemptionOptions = {
  allowUrls: boolean
  allowIdentifiers: boolean
  allowLabels: string[]
}

export const trailingUrlPattern = /https?:\/\/\S+$/ // Matches a url closing the text.
export const trailingIdentifierPattern = /[\w$)\]]\.[\w$]+$/ // Matches a dotted symbol like `discord.js` at the end.

// A bare prefix match would exempt prose such as "Actually this sentence wraps".
export const startsWithLabel = (text: string, labels: string[]): boolean => {
  return labels.some((label) => text === label || text.startsWith(`${label} `) || text.startsWith(`${label}:`))
}

// A comment carries on to the next line when it does not close a sentence itself.
export const looksUnfinished = (text: string, options: ExemptionOptions): boolean => {
  if (text.length === 0) return false
  if (endsSentence(text)) return false

  // A line closing on a url reads as finished without a period.
  if (options.allowUrls && trailingUrlPattern.test(text)) return false

  // A line closing on a symbol like `discord.js`, or on code, reads as finished too.
  if (options.allowIdentifiers && trailingIdentifierPattern.test(text)) {
    return false
  }

  if (options.allowIdentifiers && endsWithCode(text)) {
    return false
  }

  return true
}

export type WrappedPair = {
  comment: CommentLine
  next: CommentLine
}

// A label marks structure rather than prose, and a directive instructs a tool that expects its own line.
const structural = (text: string, labels: string[]): boolean => {
  return startsWithLabel(text, labels) || isDirective(text)
}

// A pair joins when neither side is structural and the first line reads unfinished.
const pairJoins = (pair: WrappedPair, options: ExemptionOptions): boolean => {
  const { comment, next } = pair

  // A structural line neither wraps nor absorbs its neighbour, so either side blocks the join.
  if (structural(comment.text, options.allowLabels)) return false
  if (structural(next.text, options.allowLabels)) return false

  // Two trailing comments annotate their own code lines rather than one continuing the other.
  if (comment.trailing || next.trailing) return false

  return looksUnfinished(comment.text, options)
}

// One definition of a wrapped sentence, feeding the join and its too-long report alike.
export const findWrappedPairs = (comments: CommentLine[], options: ExemptionOptions): WrappedPair[] => {
  const pairs: WrappedPair[] = []

  for (const [index, comment] of comments.entries()) {
    // A pair is two comments on adjacent lines, so a comment with no direct neighbour below cannot wrap.
    const next = comments[index + 1]
    if (!next || next.line !== comment.line + 1) continue

    const pair: WrappedPair = { comment, next }
    if (pairJoins(pair, options)) pairs.push(pair)
  }

  return pairs
}
