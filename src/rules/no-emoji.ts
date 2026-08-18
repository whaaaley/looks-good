import { docUrl } from '../utils/docs.utils.ts'
import { buildTextListener } from '../utils/textScan.utils.ts'
import type { TextFinding, TextMatch } from '../utils/textScan.utils.ts'
import type { Rule } from 'eslint'

type Options = {
  allow: string[]
  strings: boolean
  comments: boolean
}

// Matches pictographs and the sequences built from them.
// A skin tone modifier, a zero width joiner run, and a flag pair each count as one emoji.
export const emojiPattern = /\p{RI}\p{RI}|\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)?(‍\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)?)*/gu

const defaults: Options = {
  allow: [],
  strings: true,
  comments: true,
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports emoji in strings and comments',
      url: docUrl('no-emoji'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        allow: { type: 'array', items: { type: 'string', minLength: 1 } },
        strings: { type: 'boolean' },
        comments: { type: 'boolean' },
      },
    }],
    messages: {
      emoji: "Emoji '{{emoji}}' is not allowed here",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const allow = new Set(options.allow)

    const check = (text: string): TextMatch[] => {
      const matches: TextMatch[] = []

      // The pattern carries the `g` flag, so only matchAll may consume it.
      // A test or exec call would leak lastIndex across files.
      for (const match of text.matchAll(emojiPattern)) {
        const [value] = match
        if (allow.has(value)) continue

        const data: TextFinding = { emoji: value }

        matches.push({ data, index: match.index, length: value.length })
      }

      return matches
    }

    // The emoji pattern cannot match inside an identifier, so that position is pinned off.
    return buildTextListener({
      context,
      positions: { ...options, identifiers: false },
      scan: check,
      messageId: 'emoji',
    })
  },
}

export default rule
