import type { Rule } from 'eslint'
import type { Comment } from 'estree'

export type CommentLine = {
  text: string
  line: number
  column: number
  node: Comment
  range: [number, number]
  trailing: boolean
  block: boolean
}

export const whitespacePattern = /\s/ // Matches one whitespace character.

// Reads every comment, block ones included, for checks that inspect text rather than flow.
export const readComments = (context: Rule.RuleContext): CommentLine[] => {
  const collected: CommentLine[] = []

  for (const comment of context.sourceCode.getAllComments()) {
    if (!comment.loc || !comment.range) continue

    // A comment with code before it on the same line annotates that line rather than continuing the one above.
    const before = context.sourceCode.getTokenBefore(comment, { includeComments: false })

    collected.push({
      text: comment.value.trim(),
      line: comment.loc.start.line,
      column: comment.loc.start.column, // The source indentation of the comment, not a report position.
      node: comment,
      range: comment.range,
      trailing: before !== null && before.loc.end.line === comment.loc.start.line,
      block: comment.type !== 'Line',
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
