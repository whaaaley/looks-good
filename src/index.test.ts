import { describe, it } from 'node:test'
import { assert, assertEquals } from '@std/assert'
import { fromFileUrl } from '@std/path'
import tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { fixing, plugin, recommended, typescript } from './index.ts'

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
      // Assert
      assertEquals(plugin.meta?.name, 'looks-good')
    })

    // Deriving the list from disk means a rule written but never registered fails here.
    it('registers every rule that exists on disk', async () => {
      // Arrange
      const directory = fromFileUrl(new URL('./rules', import.meta.url))
      const onDisk: string[] = []

      for await (const entry of Deno.readDir(directory)) {
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
      // Assert
      assertEquals(Object.keys(plugin.configs ?? {}).sort(), ['fixing', 'recommended', 'typescript'])
    })

    // A rule that reads TypeScript nodes can never fire under the default parser.
    it('keeps the typescript only rules out of recommended and fixing', () => {
      // Arrange
      const tsOnly = Object.keys(typescript.rules ?? {})

      // Act
      const leaked = tsOnly.filter((name) => name in (recommended.rules ?? {}) || name in (fixing.rules ?? {}))

      // Assert
      assertEquals(leaked, [])
    })

    it('sets no parser of its own in the typescript config', () => {
      // Assert
      assertEquals(typescript.languageOptions?.parser, undefined)
    })

    // Both enabled would report one wrapped sentence twice, once per rule.
    it('enables exactly one of the two comment wrapping rules per config', () => {
      // Arrange
      const wrapping = ['looks-good/comment-one-sentence-per-line', 'looks-good/comment-reflow']

      // Act
      const inRecommended = wrapping.filter((name) => name in (recommended.rules ?? {}))
      const inFixing = wrapping.filter((name) => name in (fixing.rules ?? {}))

      // Assert
      assertEquals(inRecommended, ['looks-good/comment-one-sentence-per-line'])
      assertEquals(inFixing, ['looks-good/comment-reflow'])
    })

    it('enables every registered rule across all three configs', () => {
      // Arrange
      const registered = Object.keys(plugin.rules ?? {}).map((name) => `looks-good/${name}`)

      // Act
      const enabled = new Set([
        ...Object.keys(recommended.rules ?? {}),
        ...Object.keys(fixing.rules ?? {}),
        ...Object.keys(typescript.rules ?? {}),
      ])

      // Assert
      assertEquals(registered.filter((name) => !enabled.has(name)), [])
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

    it('reports each wrapped sentence it holds', () => {
      // Act
      const reported = lint(broken).map((message) => message.messageId)

      // Assert
      assertEquals(reported, ['wrapped', 'wrapped'])
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
