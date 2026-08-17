import { describe, it } from 'node:test'
import { assert, assertEquals } from '@std/assert'
import tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { plugin } from './index.ts'

const linter = new Linter()

const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { 'looks-good': plugin },
    rules: { 'looks-good/comment-one-sentence-per-line': 'error' },
  },
]

const reflowConfig = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { 'looks-good': plugin },
    rules: { 'looks-good/comment-reflow': 'error' },
  },
]

// A file that follows every rule, and one that breaks two of them.
const clean = [
  '// A finished sentence on one line.',
  'export const a = 1',
  '',
  '// The helper lives in `comment.utils`',
  '// which is exempt from the wrapping check.',
  'export const b = 2',
].join('\n')

const broken = [
  '// A sentence that carries on',
  '// and finishes on the next line.',
  'export const a = 1',
  '',
  '// First sentence. Second sentence.',
  'export const b = 2',
].join('\n')

// The linter needs a config array whose rule severity is typed as a literal.
const lint = (code: string): Linter.LintMessage[] => {
  return linter.verify(code, config as never, 'fixture.ts')
}

describe('All Plugin Tests', () => {
  describe('rule registration', () => {
    it('names the plugin so a rule reads as looks-good slash its name', () => {
      // Assert
      assertEquals(plugin.meta?.name, 'looks-good')
    })

    it('exposes every rule it declares', () => {
      // Act
      const names = Object.keys(plugin.rules ?? {})

      // Assert
      assertEquals(names, ['comment-one-sentence-per-line', 'comment-reflow'])
    })

    it('gives every rule a description', () => {
      // Act
      const undocumented = Object.values(plugin.rules ?? {}).filter((rule) => {
        return !('meta' in rule) || !rule.meta?.docs?.description
      })

      // Assert
      assertEquals(undocumented, [])
    })
  })

  describe('a file that follows the rules', () => {
    it('reports nothing', () => {
      // Act
      const messages = lint(clean)

      // Assert
      assertEquals(messages, [])
    })
  })

  describe('a file that breaks the rules', () => {
    it('reports every violation it holds', () => {
      // Act
      const messages = lint(broken)

      // Assert
      assertEquals(messages.length, 2)
    })

    it('names the rule that reported', () => {
      // Act
      const messages = lint(broken)
      const [first] = messages

      // Assert
      assert(first)
      assertEquals(first.ruleId, 'looks-good/comment-one-sentence-per-line')
    })

    it('reports a wrapped sentence and a doubled line', () => {
      // Act
      const reported = lint(broken).map((message) => message.messageId)

      // Assert
      assertEquals(reported, ['wrapped', 'twoSentences'])
    })

    // Reflow moves text without rewriting it, so it is the rule that carries a fixer.
    it('reflows the file into one that reports nothing', () => {
      // Act
      const fixed = linter.verifyAndFix(broken, reflowConfig as never, 'fixture.ts')

      // Assert
      assert(fixed.fixed)
      assertEquals(lint(fixed.output), [])
    })

  })
})
