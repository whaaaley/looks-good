import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { urlPattern } from './max-comment-length.utils.ts'

describe('All Max Comment Length Utility Tests', () => {
  describe('urlPattern', () => {
    it('matches a url anywhere in the text', () => {
      // Act
      const matched = urlPattern.test('See https://example.com/docs for the details.')

      // Assert
      assertEquals(matched, true)
    })

    it('matches a plain http url', () => {
      // Act
      const matched = urlPattern.test('http://example.com')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a scheme with no address after it', () => {
      // Act
      const matched = urlPattern.test('the https: scheme')

      // Assert
      assertEquals(matched, false)
    })

    it('does not match text with no url', () => {
      // Act
      const matched = urlPattern.test('a sentence about nothing')

      // Assert
      assertEquals(matched, false)
    })
  })
})
