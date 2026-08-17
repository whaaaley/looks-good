import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { check, optionsByRuleIn, ruleHeadingsIn, tableRowsIn } from './docdrift.check.ts'
import type { Code, Docs } from './docdrift.check.ts'

const code = (over: Partial<Code>): Code => {
  return { ruleNames: [], configNames: [], schemaOptionsByRule: {}, ...over }
}

const docs = (over: Partial<Docs>): Docs => {
  return { ruleHeadings: [], tableRows: [], configMentions: [], optionsByRule: {}, ...over }
}

// The subject line and the closing instruction are fixed, so a test reads only the findings between them.
const findings = (registered: Code, written: Docs): string[] => {
  return check(registered, written).slice(1, -1)
}

describe('All Docdrift Tests', () => {
  describe('rule sections', () => {
    it('says nothing when every rule has a section, a row, and matching options', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji'], configNames: ['recommended'] })
      const written = docs({ ruleHeadings: ['no-emoji'], tableRows: ['no-emoji'], configMentions: ['recommended'] })

      // Act
      const reminder = check(registered, written)

      // Assert
      assertEquals(reminder, [])
    })

    it('names a rule that has no README section', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji', 'comment-reflow'] })
      const written = docs({ ruleHeadings: ['no-emoji'], tableRows: ['no-emoji', 'comment-reflow'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['No README section for: comment-reflow'])
    })

    it('names every rule that has no README section rather than counting them', () => {
      // Arrange
      const registered = code({ ruleNames: ['blank-line-after-block', 'object-comments-trailing'] })
      const written = docs({ tableRows: ['blank-line-after-block', 'object-comments-trailing'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['No README section for: blank-line-after-block, object-comments-trailing'])
    })

    it('names a section left behind by a deleted rule', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji'] })
      const written = docs({ ruleHeadings: ['no-emoji', 'max-timeout-value'], tableRows: ['no-emoji'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['README section for a rule that no longer exists: max-timeout-value'])
    })
  })

  describe('rules table', () => {
    it('names a rule missing from the table', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji'] })
      const written = docs({ ruleHeadings: ['no-emoji'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['Missing from the README rules table: no-emoji'])
    })

    it('names a table row left behind by a deleted rule', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji'] })
      const written = docs({ ruleHeadings: ['no-emoji'], tableRows: ['no-emoji', 'max-timeout-value'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['README rules table lists a rule that no longer exists: max-timeout-value'])
    })
  })

  describe('configs', () => {
    it('names a config the README never mentions', () => {
      // Arrange
      const registered = code({ configNames: ['recommended', 'typescript'] })
      const written = docs({ configMentions: ['recommended'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['Config not mentioned in the README: typescript'])
    })

    it('names a removed config the README still describes', () => {
      // Arrange
      const registered = code({ configNames: ['recommended'] })
      const written = docs({ configMentions: ['recommended', 'fixing'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['README describes a config that no longer exists: fixing'])
    })
  })

  describe('options', () => {
    it('names an option the schema accepts that the README omits', () => {
      // Arrange
      const registered = code({
        ruleNames: ['no-emoji'],
        schemaOptionsByRule: { 'no-emoji': ['allow', 'strings'] },
      })

      const written = docs({
        ruleHeadings: ['no-emoji'],
        tableRows: ['no-emoji'],
        optionsByRule: { 'no-emoji': ['allow'] },
      })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['no-emoji has undocumented options: strings'])
    })

    it('names an option the README documents that the schema dropped', () => {
      // Arrange
      const registered = code({
        ruleNames: ['no-emoji'],
        schemaOptionsByRule: { 'no-emoji': ['allow'] },
      })

      const written = docs({
        ruleHeadings: ['no-emoji'],
        tableRows: ['no-emoji'],
        optionsByRule: { 'no-emoji': ['allow', 'removed'] },
      })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['no-emoji documents options its schema does not accept: removed'])
    })

    it('leaves options alone for a rule that has no section at all', () => {
      // Arrange
      const registered = code({
        ruleNames: ['no-emoji'],
        schemaOptionsByRule: { 'no-emoji': ['allow'] },
      })

      const written = docs({ tableRows: ['no-emoji'] })

      // Act
      const reported = findings(registered, written)

      // Assert
      assertEquals(reported, ['No README section for: no-emoji'])
    })
  })

  describe('reminder shape', () => {
    it('wraps the findings in a subject line and a closing instruction', () => {
      // Arrange
      const registered = code({ ruleNames: ['no-emoji'] })
      const written = docs({ tableRows: ['no-emoji'] })

      // Act
      const reminder = check(registered, written)

      // Assert
      assertEquals(reminder[0], 'reminder: the README has drifted from the code.')
      assertEquals(reminder.at(-1), 'Update README.md so it matches what the plugin registers.')
    })
  })

  describe('reading the README', () => {
    it('reads a rule heading and skips a prose section written at the same depth', () => {
      // Arrange
      const markdown = ['### no-emoji', '', '### Rules that were removed', '', '### comment-reflow'].join('\n')

      // Act
      const headings = ruleHeadingsIn(markdown)

      // Assert
      assertEquals(headings, ['no-emoji', 'comment-reflow'])
    })

    it('reads the rule name out of a table row link', () => {
      // Arrange
      const markdown = ['| [no-emoji](#no-emoji) | Reports emoji | recommended | |', '| not a row |'].join('\n')

      // Act
      const rows = tableRowsIn(markdown)

      // Assert
      assertEquals(rows, ['no-emoji'])
    })

    it('reads an options table and attributes it to the rule above it', () => {
      // Arrange
      const markdown = [
        '### no-emoji',
        '',
        '#### Options',
        '',
        '| Option | Default | Description |',
        '| --- | --- | --- |',
        '| `allow` | `[]` | Characters permitted anywhere. |',
        '| `strings` | `true` | Reports in string literals. |',
      ].join('\n')

      // Act
      const options = optionsByRuleIn(markdown)

      // Assert
      assertEquals(options, { 'no-emoji': ['allow', 'strings'] })
    })

    it('stops reading options at the next rule heading', () => {
      // Arrange
      const markdown = ['### no-emoji', '#### Options', '| `allow` | `[]` | text |', '### comment-reflow', '| `width` | `120` | text |'].join('\n')

      // Act
      const options = optionsByRuleIn(markdown)

      // Assert
      assertEquals(options, { 'no-emoji': ['allow'] })
    })
  })
})
