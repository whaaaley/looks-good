import { readComments } from './comment.utils.ts'
import type { Rule } from 'eslint'
import type { Literal, TemplateElement } from 'estree'

export type TextPositions = {
  strings: boolean
  comments: boolean
  identifiers: boolean
}

export type TextFinding = Record<string, string>

export type TextMatch = {
  data: TextFinding
  index: number
  length: number
  replacement?: string
}

export type TextFixer = (range: [number, number], match: TextMatch) => Rule.Fix | undefined

export type TextListenerOptions = {
  context: Rule.RuleContext
  positions: TextPositions
  scan: (text: string) => TextMatch[]
  messageId: string
  fixComment?: TextFixer
}

// Builds the listener that visits every text position a rule cares about.
export const buildTextListener = (options: TextListenerOptions): Rule.RuleListener => {
  const { context, positions, scan, messageId, fixComment } = options

  const report = (node: Rule.Node, text: string): void => {
    for (const match of scan(text)) {
      context.report({ node, messageId, data: match.data })
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
      const source = context.sourceCode.getText()

      for (const comment of readComments(context)) {
        const [start, end] = comment.range

        // Scanning the raw slice rather than the trimmed text keeps every index aligned with the file.
        for (const match of scan(source.slice(start, end))) {
          const at = start + match.index

          // A comment has no node to attach to, so the report lands on its own line.
          const descriptor: Rule.ReportDescriptor = {
            loc: { line: comment.line, column: 0 },
            messageId,
            data: match.data,
          }

          // A rule that declares no fixable meta throws if a report carries a fix, so this is attached only when one is offered.
          if (fixComment) {
            descriptor.fix = (): Rule.Fix | null => fixComment([at, at + match.length], match) ?? null
          }

          context.report(descriptor)
        }
      }
    }
  }

  return listener
}
