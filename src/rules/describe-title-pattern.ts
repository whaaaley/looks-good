import { docUrl } from '../utils/docs.utils.ts'
import { matchesGlob } from '../utils/glob.utils.ts'
import { compilePattern } from '../utils/regex.utils.ts'
import { calleeName, readTitle } from '../utils/test.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Program } from 'estree'

export const wildcardSource = '.*'
export const titleFlags = 'u'

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

// A title pattern is literal apart from `*`, so `All * Tests` matches `All Event Tests` and nothing shorter.
export const titlePatternFor = (pattern: string): RegExp => {
  const body = pattern
    .split('*')
    .map((part) => RegExp.escape(part))
    .join(wildcardSource)

  return new RegExp(`^${body}$`, titleFlags)
}

// A call sits at the top level when nothing between it and the program is a function.
const isTopLevel = (node: Rule.Node): boolean => {
  let current: Rule.Node | null = node.parent

  while (current) {
    if (current.type === 'FunctionDeclaration') return false
    if (current.type === 'FunctionExpression') return false
    if (current.type === 'ArrowFunctionExpression') return false

    current = current.parent
  }

  return true
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Requires a test file to name its subject in a top level describe title',
      url: docUrl('describe-title-pattern'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
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
    }],
    messages: {
      mismatch: "The top level {{function}} is titled '{{title}}', which does not match '{{pattern}}'.{{message}}",
      missing: "This file has no top level {{function}} title, so nothing names what it tests. Wrap it in one titled '{{pattern}}'.{{message}}",
      invalidPattern: "The allowed title '{{source}}' is not a valid regular expression. Correct it in this rule's configuration.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }
    const exempt: RegExp[] = []
    const invalid: string[] = []

    for (const source of options.allowTitles) {
      const expression = compilePattern({ source, flags: titleFlags })

      if (!expression) {
        invalid.push(source)
        continue
      }

      exempt.push(expression)
    }

    const reportInvalid = (program: Program): void => {
      for (const source of invalid) {
        context.report({
          node: program,
          messageId: 'invalidPattern',
          data: { source },
        })
      }
    }

    // The first entry whose glob matches the path wins, so a narrow entry is listed before a broad one.
    const matched = options.patterns.find((entry) => {
      return matchesGlob(entry.files, context.filename, context.cwd)
    })

    if (!matched) {
      if (invalid.length === 0) return {}

      return { 'Program:exit': reportInvalid }
    }

    const expected = titlePatternFor(matched.title)
    const message = matched.message ? ` ${matched.message}` : ''
    const [testFunction = 'describe'] = options.testFunctions

    let outermost: (CallExpression & Rule.NodeParentExtension) | null = null

    return {
      CallExpression: (node: CallExpression & Rule.NodeParentExtension): void => {
        if (outermost) return
        if (!options.testFunctions.includes(calleeName(node))) return

        // A call inside a function is nested, even when traversal reaches it first.
        // Taking it would report a mismatch on a file whose own top level describe is correct.
        if (!isTopLevel(node)) return

        outermost = node
      },
      'Program:exit': (program: Program): void => {
        reportInvalid(program)

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
          data: { function: testFunction, title, pattern: matched.title, message },
        })
      },
    }
  },
}

export default rule
