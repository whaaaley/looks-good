import { fromMarkdown } from 'mdast-util-from-markdown'
import { toString } from 'nlcst-to-string'
import { ParseEnglish } from 'parse-english'
import type { Nodes as MdastNode } from 'mdast'
import type { Nodes as NlcstNode, Sentence } from 'nlcst'

const parser = new ParseEnglish()

const collectSentences = (node: NlcstNode, found: Sentence[]): void => {
  if (node.type === 'SentenceNode') {
    found.push(node)
    return
  }

  if (!('children' in node)) return

  for (const child of node.children) {
    collectSentences(child, found)
  }
}

export const readSentences = (text: string): string[] => {
  const found: Sentence[] = []
  collectSentences(parser.parse(text), found)

  return found.map((sentence) => toString(sentence))
}

// A sentence is closed by its own punctuation, so `e.g.` and `discord.js` read as unfinished rather than as a period.
export const endsSentence = (text: string): boolean => {
  const found: Sentence[] = []
  collectSentences(parser.parse(text), found)

  const [last] = found.slice(-1)
  if (!last) return false

  const [tail] = last.children.slice(-1)
  if (!tail) return false

  return tail.type === 'PunctuationNode'
}

// A trailing code span is a name rather than a fragment, so the line reads as finished without punctuation.
export const endsWithCode = (text: string): boolean => {
  const tree: MdastNode = fromMarkdown(text)

  const [paragraph] = tree.children.slice(-1)
  if (!paragraph) return false
  if (paragraph.type !== 'paragraph') return false

  const [tail] = paragraph.children.slice(-1)
  if (!tail) return false

  return tail.type === 'inlineCode'
}
