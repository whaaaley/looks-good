import { readComments } from './comment.utils.ts'
import type { Rule } from 'eslint'
import type { Literal, TemplateElement } from 'estree'

export type TextPositions = {
  strings: boolean
  comments: boolean
  identifiers: boolean
}

export type TextFinding = Record<string, string>

export type TextListenerOptions = {
  context: Rule.RuleContext
  positions: TextPositions
  scan: (text: string) => TextFinding[]
  messageId: string
}

// Builds the listener that visits every text position a rule cares about.
export const buildTextListener = ({ context, positions, scan, messageId }: TextListenerOptions): Rule.RuleListener => {
  const report = (node: Rule.Node, text: string): void => {
    for (const data of scan(text)) {
      context.report({ node, messageId, data })
    }
  }

  const listener: Rule.RuleListener = {}

  if (positions.strings) {
    listener.Literal = (node: Literal & Rule.NodeParentExtension): void => {
      if (typeof node.value !== 'string') return

      report(node, node.value)
    }

    listener.TemplateElement = (node: TemplateElement & Rule.NodeParentExtension): void => {
      report(node, node.value.raw)
    }
  }

  if (positions.identifiers) {
    listener.Identifier = (node): void => {
      report(node, node.name)
    }
  }

  if (positions.comments) {
    listener['Program:exit'] = (): void => {
      for (const comment of readComments(context)) {
        for (const data of scan(comment.text)) {
          // A comment has no node to attach to, so the report lands on its own line.
          context.report({ loc: { line: comment.line, column: 0 }, messageId, data })
        }
      }
    }
  }

  return listener
}
