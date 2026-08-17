import { docUrl } from '../utils/docs.utils.ts'
import { buildTextListener } from '../utils/textScan.utils.ts'
import type { TextMatch } from '../utils/textScan.utils.ts'
import type { Rule } from 'eslint'

export type Restriction = {
  chars: string
  message: string
  replacement?: string
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

type Occurrence = {
  character: string
  index: number
}

// A restriction lists characters rather than a pattern, so each is matched literally.
// Iterating by code point advances the index by the character's own length, so an astral pair stays aligned.
const matches = (text: string, restricted: Set<string>, allow: Set<string>): Occurrence[] => {
  const found: Occurrence[] = []
  let index = 0

  for (const character of text) {
    if (restricted.has(character) && !allow.has(character)) {
      found.push({ character, index })
    }

    index += character.length
  }

  return found
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports characters a project does not want in source, and rewrites them in comments when a restriction names a replacement',
      url: docUrl('no-restricted-characters'),
    },
    defaultOptions: [defaults],
    fixable: 'code',
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
                replacement: { type: 'string', minLength: 1 },
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
      replacement: restriction.replacement,
    }))

    const scan = (text: string): TextMatch[] => {
      const findings: TextMatch[] = []

      for (const restriction of restrictions) {
        for (const { character, index } of matches(text, restriction.chars, allow)) {
          const data = { character, message: restriction.message }

          findings.push({ data, index, length: character.length, replacement: restriction.replacement })
        }
      }

      return findings
    }

    // Only a comment is rewritten, since renaming an identifier breaks its references and a string may be a pattern or a fixture asserting on the character itself.
    const fixComment = (range: [number, number], match: TextMatch): Rule.Fix | undefined => {
      const { replacement } = match
      if (replacement === undefined) return undefined

      return { range, text: replacement }
    }

    return buildTextListener({ context, positions: options, scan, messageId: 'restricted', fixComment })
  },
}

export default rule
