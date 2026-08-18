import { isDirective, readComments } from '../../utils/comment.utils.ts'
import { endsSentence, endsWithCode } from '../../utils/prose.utils.ts'
import type { CommentLine } from '../../utils/comment.utils.ts'
import type { Rule } from 'eslint'

export type ExemptionOptions = {
  allowUrls: boolean
  allowIdentifiers: boolean
  allowLabels: string[]
}

export const trailingUrlPattern = /https?:\/\/\S+$/ // Matches a url closing the text.
export const trailingIdentifierPattern = /[\w$)\]]\.[\w$]+$/ // Matches a dotted symbol like `discord.js` at the end.

// The wrap check joins lines, which only line comments do, so block comments drop out here.
export const readLineComments = (context: Rule.RuleContext): CommentLine[] => {
  return readComments(context).filter((comment) => !comment.block)
}

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

// A pair joins when neither side is structural and the first line reads unfinished.
const pairJoins = (pair: WrappedPair, options: ExemptionOptions): boolean => {
  const { comment, next } = pair

  // A label is a structural marker rather than prose, so it neither wraps nor absorbs the line below it.
  if (startsWithLabel(comment.text, options.allowLabels)) return false
  if (startsWithLabel(next.text, options.allowLabels)) return false

  // A directive is an instruction to a tool that expects it on its own line, so joining either side would break it.
  if (isDirective(comment.text) || isDirective(next.text)) return false

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

    if (pairJoins({ comment, next }, options)) pairs.push({ comment, next })
  }

  return pairs
}
