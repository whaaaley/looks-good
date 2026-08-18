import { describe, it } from 'node:test'
import { assert, assertEquals } from '@std/assert'
import { fromFileUrl } from '@std/path'
import tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { parsing, plugin, recommended } from './index.ts'

const linter = new Linter()

const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { 'looks-good': plugin },
    rules: { 'looks-good/comment-wrap': 'error' },
  },
]

const joinConfig = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { 'looks-good': plugin },
    rules: { 'looks-good/comment-wrap': 'error' },
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
  '// Another sentence that carries',
  '// on to a second line.',
  'export const b = 2',
].join('\n')

// The linter needs a config array whose rule severity is typed as a literal.
const lint = (code: string): Linter.LintMessage[] => {
  return linter.verify(code, config as never, 'fixture.ts')
}

describe('All Plugin Tests', () => {
  describe('rule registration', () => {
    it('names the plugin so a rule reads as looks-good slash its name', () => {
      // Act
      const name = plugin.meta?.name

      // Assert
      assertEquals(name, 'looks-good')
    })

    // Deriving the list from disk means a rule written but never registered fails here.
    it('registers every rule that exists on disk', async () => {
      // Arrange
      const directory = fromFileUrl(new URL('./rules', import.meta.url))
      const onDisk: string[] = []

      for await (const entry of Deno.readDir(directory)) {
        // A rule migrated to its own directory keeps the directory's name.
        if (entry.isDirectory) {
          onDisk.push(entry.name)
          continue
        }

        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
          continue
        }

        onDisk.push(entry.name.replace(/\.ts$/, ''))
      }

      // Act
      const registered = Object.keys(plugin.rules ?? {})

      // Assert
      assertEquals(registered.sort(), onDisk.sort())
    })

    it('gives every rule a description', () => {
      // Act
      const undocumented = Object.values(plugin.rules ?? {}).filter((rule) => {
        return !('meta' in rule) || !rule.meta?.docs?.description
      })

      // Assert
      assertEquals(undocumented, [])
    })

    it('gives every rule a documentation url', () => {
      // Act
      const unlinked = Object.values(plugin.rules ?? {}).filter((rule) => {
        return !('meta' in rule) || !rule.meta?.docs?.url
      })

      // Assert
      assertEquals(unlinked, [])
    })
  })

  describe('shipped configs', () => {
    it('exposes every config on the plugin', () => {
      // Act
      const names = Object.keys(plugin.configs ?? {}).sort()

      // Assert
      assertEquals(names, ['parsing', 'recommended'])
    })

    // The two configs partition the rules, so no rule is enabled by both.
    it('enables each rule in exactly one config', () => {
      // Arrange
      const configs = [recommended, parsing]

      // Act
      const counted = new Map<string, number>()

      for (const config of configs) {
        for (const name of Object.keys(config.rules ?? {})) {
          counted.set(name, (counted.get(name) ?? 0) + 1)
        }
      }

      // Assert
      const duplicated = [...counted.keys()].filter((name) => (counted.get(name) ?? 0) > 1)
      assertEquals(duplicated, [])
    })

    // A consumer who takes recommended alone installs eslint and nothing else.
    it('keeps the rules that parse text out of recommended', () => {
      // Arrange
      const parsingRules = Object.keys(parsing.rules ?? {})

      // Act
      const leaked = parsingRules.filter((name) => name in (recommended.rules ?? {}))

      // Assert
      assertEquals(leaked, [])
    })

    // Every opt in rule waits on something a consumer supplies.
    // That is a sibling rule, a result helper, a schema glob, or the third party rule it replaces.
    it('enables every registered rule across the two configs except the opt in rules', () => {
      // Arrange
      const registered = Object.keys(plugin.rules ?? {}).map((name) => `looks-good/${name}`)
      const optIn = ['looks-good/import-group-order', 'looks-good/no-inline-regex', 'looks-good/no-try-catch-handler', 'looks-good/require-foreign-key-index']

      // Act
      const enabled = new Set([
        ...Object.keys(recommended.rules ?? {}),
        ...Object.keys(parsing.rules ?? {}),
      ])

      // Assert
      assertEquals(registered.filter((name) => !enabled.has(name)).sort(), optIn.sort())
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
      assertEquals(first.ruleId, 'looks-good/comment-wrap')
    })

    it('reports each wrapped sentence it holds', () => {
      // Act
      const reported = lint(broken).map((message) => message.messageId)

      // Assert
      assertEquals(reported, ['join', 'join'])
    })

    // The join moves text without rewriting it, which is what lets the rule carry a fixer.
    it('joins the file into one that reports nothing', () => {
      // Act
      const fixed = linter.verifyAndFix(broken, joinConfig as never, 'fixture.ts')

      // Assert
      assert(fixed.fixed)
      assertEquals(lint(fixed.output), [])
    })
  })
})
