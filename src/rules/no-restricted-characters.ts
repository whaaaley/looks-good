import { docUrl } from '../utils/docs.utils.ts'
import { buildTextListener } from '../utils/textScan.utils.ts'
import type { TextFinding } from '../utils/textScan.utils.ts'
import type { Rule } from 'eslint'

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
const matches = (text: string, restricted: Set<string>, allow: Set<string>): string[] => {
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
      url: docUrl('no-restricted-characters'),
    },
    defaultOptions: [defaults],
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

    // Compiling once in create keeps a large file from rebuilding these per node.
    const restrictions = options.restrict.map((restriction) => ({
      chars: new Set([...restriction.chars]),
      message: restriction.message,
    }))

    const scan = (text: string): TextFinding[] => {
      const findings: TextFinding[] = []

      for (const restriction of restrictions) {
        for (const character of matches(text, restriction.chars, allow)) {
          findings.push({ character, message: restriction.message })
        }
      }

      return findings
    }

    return buildTextListener({ context, positions: options, scan, messageId: 'restricted' })
  },
}

export default rule
