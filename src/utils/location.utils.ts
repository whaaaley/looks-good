import type { AST } from 'eslint'
import type { Comment, Node, SourceLocation } from 'estree'

// The estree types mark `loc` optional, but ESLint fills it in for every node it parses from real source.
// A node without one cannot be pointed at, so a rule that cannot resolve a location skips the node instead of reporting.
type Located = {
  loc?: SourceLocation | null
}

// A caller may hold a node that is absent, so the helper takes that case rather than making every call site guard first.
type MaybeLocated = Located | null | undefined

export type Locatable = Node | AST.Token

export const locationOf = (node: MaybeLocated): SourceLocation | null => {
  if (!node) return null

  return node.loc ?? null
}

export const isSingleLine = (node: MaybeLocated): boolean => {
  const location = locationOf(node)
  if (!location) return false

  return location.start.line === location.end.line
}

type CommentReader = {
  getCommentsBefore: (node: Locatable) => Comment[]
}

// A comment above a node is what the reader sees first, so it is what a blank line sits against.
export const readerLocationOf = (sourceCode: CommentReader, node: Locatable): SourceLocation | null => {
  const [leading] = sourceCode.getCommentsBefore(node)

  const leadingLocation = locationOf(leading)
  if (leadingLocation) return leadingLocation

  return locationOf(node)
}
