import { readComments } from '../utils/comment.utils.ts'
import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { Literal, TemplateElement } from 'estree'

type Options = {
  allow: string[]
  strings: boolean
  comments: boolean
  identifiers: boolean
}

const defaults: Options = {
  allow: [],
  strings: true,
  comments: true,
  identifiers: true,
}

// Matches pictographs and the sequences built from them.
// A skin tone modifier, a zero width joiner run, and a flag pair each count as one emoji.
// This carries the `g` flag, so only matchAll may consume it, since test or exec would leak lastIndex across files.
const emoji = /\p{RI}\p{RI}|\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)?(‍\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)?)*/gu

const found = (text: string, allow: Set<string>): string[] => {
  const matches: string[] = []

  for (const match of text.matchAll(emoji)) {
    const [value] = match
    if (allow.has(value)) continue

    matches.push(value)
  }

  return matches
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports emoji in code, comments, and identifiers',
      url: docUrl('no-emoji'),
    },
    defaultOptions: [defaults],
    // Removing an emoji can change what a string says, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allow: { type: 'array', items: { type: 'string', minLength: 1 } },
          strings: { type: 'boolean' },
          comments: { type: 'boolean' },
          identifiers: { type: 'boolean' },
        },
      },
    ],
    messages: {
      emoji: "Emoji '{{emoji}}' is not allowed here",
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const allow = new Set(options.allow)

    const report = (node: Rule.Node, text: string): void => {
      for (const value of found(text, allow)) {
        context.report({ node, messageId: 'emoji', data: { emoji: value } })
      }
    }

    const listener: Rule.RuleListener = {}

    if (options.strings) {
      listener.Literal = (node: Literal & Rule.NodeParentExtension): void => {
        if (typeof node.value !== 'string') return

        report(node, node.value)
      }

      listener.TemplateElement = (node: TemplateElement & Rule.NodeParentExtension): void => {
        report(node, node.value.raw)
      }
    }

    if (options.identifiers) {
      listener.Identifier = (node): void => {
        report(node, node.name)
      }
    }

    if (options.comments) {
      listener['Program:exit'] = (): void => {
        for (const comment of readComments(context)) {
          for (const value of found(comment.text, allow)) {
            context.report({
              loc: { line: comment.line, column: 0 },
              messageId: 'emoji',
              data: { emoji: value },
            })
          }
        }
      }
    }

    return listener
  },
}

export default rule
