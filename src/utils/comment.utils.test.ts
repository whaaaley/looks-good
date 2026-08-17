import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { isAdjacent, isLineComment, looksUnfinished, startsWithLabel } from './comment.utils.ts'
import type { CommentLine } from './comment.utils.ts'

const at = (line: number): CommentLine => ({
  text: 'text',
  line,
  node: { type: 'Line', value: 'text' },
  range: [0, 0],
  trailing: false,
})

const options = {
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

describe('All Comment Utility Tests', () => {
  describe('unfinished lines', () => {
    it('reads a line closing on a period as finished', () => {
      // Act
      const unfinished = looksUnfinished('A whole sentence.', options)

      // Assert
      assertEquals(unfinished, false)
    })

    it('reads a line closing on a colon as finished', () => {
      // Act
      const unfinished = looksUnfinished('Consider the following:', options)

      // Assert
      assertEquals(unfinished, false)
    })

    it('reads a line with no terminal punctuation as unfinished', () => {
      // Act
      const unfinished = looksUnfinished('A thought that carries on', options)

      // Assert
      assertEquals(unfinished, true)
    })

    it('reads an empty line as finished, since it continues nothing', () => {
      // Act
      const unfinished = looksUnfinished('', options)

      // Assert
      assertEquals(unfinished, false)
    })
  })

  describe('exemptions', () => {
    it('exempts a line closing on a url when urls are allowed', () => {
      // Act
      const unfinished = looksUnfinished('See https://example.com/path', options)

      // Assert
      assertEquals(unfinished, false)
    })

    it('flags a line closing on a url when urls are not allowed', () => {
      // Act
      const unfinished = looksUnfinished('See https://example.com/path', { ...options, allowUrls: false })

      // Assert
      assertEquals(unfinished, true)
    })

    it('exempts a line closing on a backticked identifier', () => {
      // Act
      const unfinished = looksUnfinished('The helper lives in `comment.utils`', options)

      // Assert
      assertEquals(unfinished, false)
    })

    it('exempts a line closing on a dotted identifier', () => {
      // Act
      const unfinished = looksUnfinished('Configured through discord.js', options)

      // Assert
      assertEquals(unfinished, false)
    })

    it('flags a dotted identifier when identifiers are not allowed', () => {
      // Act
      const unfinished = looksUnfinished('Configured through discord.js', { ...options, allowIdentifiers: false })

      // Assert
      assertEquals(unfinished, true)
    })
  })

  describe('labels', () => {
    it('recognises a configured label', () => {
      // Act
      const labelled = startsWithLabel('Arrange', options.allowLabels)

      // Assert
      assertEquals(labelled, true)
    })

    it('does not recognise prose that merely resembles one', () => {
      // Act
      const labelled = startsWithLabel('Consider the arrangement', options.allowLabels)

      // Assert
      assertEquals(labelled, false)
    })

    it('recognises nothing when no labels are configured', () => {
      // Act
      const labelled = startsWithLabel('Arrange', [])

      // Assert
      assertEquals(labelled, false)
    })
  })

  describe('adjacency', () => {
    it('reads consecutive lines as adjacent', () => {
      // Act
      const adjacent = isAdjacent(at(4), at(5))

      // Assert
      assertEquals(adjacent, true)
    })

    it('reads a gap between lines as not adjacent', () => {
      // Act
      const adjacent = isAdjacent(at(4), at(6))

      // Assert
      assertEquals(adjacent, false)
    })
  })

  describe('comment kinds', () => {
    it('recognises a line comment', () => {
      // Act
      const recognised = isLineComment({ type: 'Line' })

      // Assert
      assertEquals(recognised, true)
    })

    it('does not recognise a block comment', () => {
      // Act
      const recognised = isLineComment({ type: 'Block' })

      // Assert
      assertEquals(recognised, false)
    })
  })
})
