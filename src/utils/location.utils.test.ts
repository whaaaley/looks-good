import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { isSingleLine, locationOf, readerLocationOf } from './location.utils.ts'
import type { Comment, SourceLocation } from 'estree'

const at = (startLine: number, endLine: number): SourceLocation => ({
  start: { line: startLine, column: 0 },
  end: { line: endLine, column: 0 },
})

type MaybeLocation = SourceLocation | null

const commentAt = (loc: MaybeLocation): Comment => ({
  type: 'Line',
  value: ' note',
  loc,
})

// Only `getCommentsBefore` is read, so the helper takes the narrow reader shape rather than a whole SourceCode.
const readerOf = (comments: Comment[]) => ({
  getCommentsBefore: (): Comment[] => comments,
})

describe('All Location Utility Tests', () => {
  describe('locationOf', () => {
    it('returns the location a parsed node carries', () => {
      // Arrange
      const loc = at(3, 3)

      // Act
      const location = locationOf({ loc })

      // Assert
      assertEquals(location, loc)
    })

    it('returns null for a node parsed without a location', () => {
      // Act
      const location = locationOf({ loc: null })

      // Assert
      assertEquals(location, null)
    })

    it('returns null rather than throwing when the node itself is missing', () => {
      // Act
      const location = locationOf(undefined)

      // Assert
      assertEquals(location, null)
    })
  })

  describe('isSingleLine', () => {
    it('reads a node opening and closing on one line as single line', () => {
      // Act
      const single = isSingleLine({ loc: at(7, 7) })

      // Assert
      assertEquals(single, true)
    })

    it('reads a node spanning lines as not single line', () => {
      // Act
      const single = isSingleLine({ loc: at(7, 9) })

      // Assert
      assertEquals(single, false)
    })

    it('reads an unlocatable node as not single line', () => {
      // Act
      const single = isSingleLine({ loc: null })

      // Assert
      assertEquals(single, false)
    })
  })

  describe('readerLocationOf', () => {
    it('returns a leading comment location, since that is what the reader meets first', () => {
      // Arrange
      const leading = at(4, 4)
      const reader = readerOf([commentAt(leading)])

      // Act
      const location = readerLocationOf(reader, { type: 'Identifier', name: 'value', loc: at(5, 5) })

      // Assert
      assertEquals(location, leading)
    })

    it('returns the node location when no comment precedes it', () => {
      // Arrange
      const own = at(5, 5)
      const reader = readerOf([])

      // Act
      const location = readerLocationOf(reader, { type: 'Identifier', name: 'value', loc: own })

      // Assert
      assertEquals(location, own)
    })

    it('uses the first comment when several stack above the node', () => {
      // Arrange
      const first = at(2, 2)
      const reader = readerOf([commentAt(first), commentAt(at(3, 3))])

      // Act
      const location = readerLocationOf(reader, { type: 'Identifier', name: 'value', loc: at(4, 4) })

      // Assert
      assertEquals(location, first)
    })

    it('falls back to the node when a leading comment carries no location', () => {
      // Arrange
      const own = at(6, 6)
      const reader = readerOf([commentAt(null)])

      // Act
      const location = readerLocationOf(reader, { type: 'Identifier', name: 'value', loc: own })

      // Assert
      assertEquals(location, own)
    })

    it('returns null when neither the comment nor the node can be located', () => {
      // Arrange
      const reader = readerOf([])

      // Act
      const location = readerLocationOf(reader, { type: 'Identifier', name: 'value', loc: null })

      // Assert
      assertEquals(location, null)
    })
  })
})
