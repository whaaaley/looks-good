import { docUrl } from '../utils/docs.utils.ts'
import { buildTextListener } from '../utils/textScan.utils.ts'
import type { TextFinding, TextMatch } from '../utils/textScan.utils.ts'
import type { Rule } from 'eslint'

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

const found = (text: string, allow: Set<string>): TextMatch[] => {
  const matches: TextMatch[] = []

  for (const match of text.matchAll(emoji)) {
    const [value] = match
    if (allow.has(value)) continue

    const data: TextFinding = { emoji: value }

    matches.push({ data, index: match.index, length: value.length })
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

    const scan = (text: string): TextMatch[] => found(text, allow)

    return buildTextListener({ context, positions: options, scan, messageId: 'emoji' })
  },
}

export default rule
