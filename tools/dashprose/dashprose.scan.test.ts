import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { scanMarkdown } from './dashprose.scan.ts'

const dashesIn = (markdown: string): string[] => {
  return scanMarkdown('doc.md', markdown).map((finding) => finding.dash)
}

const countIn = (markdown: string): number => {
  return scanMarkdown('doc.md', markdown).length
}

describe('All Dashprose Tests', () => {
  describe('dashes used as punctuation', () => {
    it('reports a spaced double hyphen joining two clauses', () => {
      // Arrange
      const markdown = 'The rule reports -- it never rewrites.'

      // Act
      const reported = dashesIn(markdown)

      // Assert
      assertEquals(reported, ['--'])
    })

    it('reports an em dash', () => {
      // Arrange
      const markdown = 'The rule reports — it never rewrites.'

      // Act
      const reported = dashesIn(markdown)

      // Assert
      assertEquals(reported, ['—'])
    })

    it('reports an en dash', () => {
      // Arrange
      const markdown = 'The rule reports – it never rewrites.'

      // Act
      const reported = dashesIn(markdown)

      // Assert
      assertEquals(reported, ['–'])
    })

    it('reports the dash that follows a link, which is where a docs index joins its gloss', () => {
      // Arrange
      const markdown = '- [Config](config.md) -- the thresholds and what a bad value does'

      // Act
      const reported = dashesIn(markdown)

      // Assert
      assertEquals(reported, ['--'])
    })

    it('reports each dash on a line rather than only the first', () => {
      // Arrange
      const markdown = 'One -- two -- three'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 2)
    })

    it('points at the column the dash sits in', () => {
      // Arrange
      const markdown = 'ab -- cd'

      // Act
      const [finding] = scanMarkdown('doc.md', markdown)

      // Assert
      assertEquals(finding?.column, 4)
    })
  })

  describe('dashes that are syntax rather than punctuation', () => {
    it('says nothing about a flag, whose dashes bind to the word after them', () => {
      // Arrange
      const markdown = 'Pass --dry-run to preview the plan.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about a flag written inside a code span', () => {
      // Arrange
      const markdown = 'Keep the `--allow-read` grant on the task.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about a table separator row', () => {
      // Arrange
      const markdown = '| --- | --- | --- |'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about a horizontal rule', () => {
      // Arrange
      const markdown = 'Above\n\n---\n\nBelow'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about the delimiters around frontmatter', () => {
      // Arrange
      const markdown = '---\ntitle: A doc\n---\n\nBody text.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about a dash inside a fenced block', () => {
      // Arrange
      const markdown = 'Prose above.\n\n```sh\ngit diff -- .\n```\n\nProse below.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about yaml inside a fenced block', () => {
      // Arrange
      const markdown = '```yaml\nsteps:\n  - run: deno fmt --check\n---\n```'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('resumes reporting after a fenced block closes', () => {
      // Arrange
      const markdown = '```sh\ngit log --oneline\n```\n\nThe log reads -- it never writes.'

      // Act
      const reported = dashesIn(markdown)

      // Assert
      assertEquals(reported, ['--'])
    })

    it('says nothing about a double hyphen inside a url', () => {
      // Arrange
      const markdown = 'See https://example.com/a--b for the details.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about a double hyphen inside a link target', () => {
      // Arrange
      const markdown = 'Read [the page](https://example.com/a--b) first.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about the end-of-options marker closing a command', () => {
      // Arrange
      const markdown = 'The command ends with --'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })

    it('says nothing about three or more dashes, which are never the punctuation form', () => {
      // Arrange
      const markdown = 'The row reads --- across.'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })
  })

  describe('reporting', () => {
    it('names the file it was given so a finding is addressable', () => {
      // Arrange
      const markdown = 'The rule reports -- it never rewrites.'

      // Act
      const [finding] = scanMarkdown('docs/api.md', markdown)

      // Assert
      assertEquals(finding?.file, 'docs/api.md')
    })

    it('carries the line the dash was found on', () => {
      // Arrange
      const markdown = 'First line.\n\nThe rule reports -- it never rewrites.'

      // Act
      const [finding] = scanMarkdown('doc.md', markdown)

      // Assert
      assertEquals(finding?.line, 3)
    })

    it('quotes the line so a finding reads without opening the file', () => {
      // Arrange
      const markdown = '  The rule reports -- it never rewrites.  '

      // Act
      const [finding] = scanMarkdown('doc.md', markdown)

      // Assert
      assertEquals(finding?.text, 'The rule reports -- it never rewrites.')
    })

    it('says nothing about a document that uses no dash as punctuation', () => {
      // Arrange
      const markdown = '# Title\n\nA sentence. Another sentence.\n\n| a | b |\n| --- | --- |\n'

      // Act
      const reported = countIn(markdown)

      // Assert
      assertEquals(reported, 0)
    })
  })
})
