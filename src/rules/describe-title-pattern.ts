import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Program } from 'estree'

export type TitlePattern = {
  files: string
  title: string
  message?: string
}

type Options = {
  patterns: TitlePattern[]
  testFunctions: string[]
  allowTitles: string[]
}

const defaults: Options = {
  patterns: [],
  testFunctions: ['describe'],
  allowTitles: [],
}

const escapeRegExp = (source: string): string => {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A glob segment is literal apart from `*`, which stands for any run of characters.
// `**` and `*` both cross directory separators, since a path glob here is matched against a whole path.
const globToRegExp = (glob: string): RegExp => {
  const body = glob
    .split(/\*+/)
    .map((part) => escapeRegExp(part))
    .join('.*')

  return new RegExp(`^${body}$`, 'u')
}

// A title pattern is literal apart from `*`, so `All * Tests` matches `All Event Tests` and nothing shorter.
const titleToRegExp = (pattern: string): RegExp => {
  const body = pattern
    .split('*')
    .map((part) => escapeRegExp(part))
    .join('.*')

  return new RegExp(`^${body}$`, 'u')
}

// A call written as `describe.only` or `describe.skip` is still that test function.
const calleeName = (node: CallExpression): string => {
  const { callee } = node
  if (callee.type === 'Identifier') return callee.name

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return callee.object.name
  }

  return ''
}

const readTitle = (node: CallExpression): string => {
  const [first] = node.arguments
  if (!first) return ''
  if (first.type !== 'Literal') return ''
  if (typeof first.value !== 'string') return ''

  return first.value
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires a test file to name its subject in a top level describe title',
      url: docUrl('describe-title-pattern'),
    },
    defaultOptions: [defaults],
    // Renaming a suite is a decision, so this reports only.
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['files', 'title'],
              properties: {
                files: { type: 'string', minLength: 1 },
                title: { type: 'string', minLength: 1 },
                message: { type: 'string' },
              },
            },
          },
          testFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
          allowTitles: { type: 'array', items: { type: 'string', minLength: 1 } },
        },
      },
    ],
    messages: {
      mismatch: "The top level describe is titled '{{title}}', which does not match '{{pattern}}'.{{message}}",
      missing: "This file has no top level {{function}} title, so nothing names what it tests. Wrap it in one titled '{{pattern}}'.{{message}}",
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const exempt = options.allowTitles.map((source) => new RegExp(source))

    // The first entry whose glob matches the path wins, so a narrow entry is listed before a broad one.
    const matched = options.patterns.find((entry) => {
      return globToRegExp(entry.files).test(context.filename)
    })

    if (!matched) return {}

    const expected = titleToRegExp(matched.title)
    const message = matched.message ? ` ${matched.message}` : ''
    const [testFunction = 'describe'] = options.testFunctions

    let outermost: (CallExpression & Rule.NodeParentExtension) | null = null

    return {
      CallExpression: (node: CallExpression & Rule.NodeParentExtension): void => {
        if (outermost) return
        if (!options.testFunctions.includes(calleeName(node))) return

        outermost = node
      },

      'Program:exit': (program: Program): void => {
        if (!outermost) {
          context.report({
            node: program,
            messageId: 'missing',
            data: { function: testFunction, pattern: matched.title, message },
          })

          return
        }

        const title = readTitle(outermost)
        if (exempt.some((expression) => expression.test(title))) return
        if (expected.test(title)) return

        context.report({
          node: outermost,
          messageId: 'mismatch',
          data: { title, pattern: matched.title, message },
        })
      },
    }
  },
}

export default rule
