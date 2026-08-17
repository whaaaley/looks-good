import { readComments } from '../utils/comment.utils.ts'
import type { Rule } from 'eslint'
import type { Literal, TemplateElement } from 'estree'

export type Restriction = {
  chars: string
  message: string
}

type Options = {
  restrict: Restriction[]
  allow: string[]
  strings: boolean
  comments: boolean
  identifiers: boolean
}

const defaults: Options = {
  restrict: [],
  allow: [],
  strings: true,
  comments: true,
  identifiers: true,
}

// A restriction lists characters rather than a pattern, so each is matched literally.
const matches = (text: string, chars: string, allow: Set<string>): string[] => {
  const restricted = new Set([...chars])
  const found: string[] = []

  for (const character of text) {
    if (!restricted.has(character)) continue
    if (allow.has(character)) continue

    found.push(character)
  }

  return found
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports characters a project does not want in source',
    },
    // A replacement depends on what the character was standing in for.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allow: { type: 'array', items: { type: 'string', minLength: 1 } },
          restrict: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['chars', 'message'],
              properties: {
                chars: { type: 'string', minLength: 1 },
                message: { type: 'string', minLength: 1 },
              },
            },
          },
          strings: { type: 'boolean' },
          comments: { type: 'boolean' },
          identifiers: { type: 'boolean' },
        },
      },
    ],
    messages: {
      restricted: "'{{character}}' is not allowed here. {{message}}",
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const allow = new Set(options.allow)

    const report = (node: Rule.Node, text: string): void => {
      for (const restriction of options.restrict) {
        for (const character of matches(text, restriction.chars, allow)) {
          context.report({
            node,
            messageId: 'restricted',
            data: { character, message: restriction.message },
          })
        }
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
          for (const restriction of options.restrict) {
            for (const character of matches(comment.text, restriction.chars, allow)) {
              context.report({
                loc: { line: comment.line, column: 0 },
                messageId: 'restricted',
                data: { character, message: restriction.message },
              })
            }
          }
        }
      }
    }

    return listener
  },
}

export default rule
