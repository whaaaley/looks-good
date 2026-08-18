import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { looksUnfinished, startsWithLabel, trailingIdentifierPattern, trailingUrlPattern } from './comment-wrap.utils.ts'

const options = {
  allowUrls: true,
  allowIdentifiers: true,
  allowLabels: ['Arrange', 'Act', 'Assert'],
}

describe('All Comment Wrap Utility Tests', () => {
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

    // The dot belongs to the abbreviation, so it does not close the sentence the way a period would.
    it('reads a line trailing off after an abbreviation as unfinished', () => {
      // Act
      const unfinished = looksUnfinished('Pick a shorter name, e.g.', options)

      // Assert
      assertEquals(unfinished, true)
    })

    it('reads a line closing on a code span as finished', () => {
      // Act
      const unfinished = looksUnfinished('Format it with `deno fmt`', options)

      // Assert
      assertEquals(unfinished, false)
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

    it('flags a code span when identifiers are not allowed', () => {
      // Act
      const unfinished = looksUnfinished('Format it with `deno fmt`', { ...options, allowIdentifiers: false })

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

    // A bare prefix match would exempt any sentence starting with a label word.
    it('does not recognise prose that begins with a label word', () => {
      // Act
      const labelled = startsWithLabel('Actually this sentence wraps', options.allowLabels)

      // Assert
      assertEquals(labelled, false)
    })

    it('recognises a label followed by a colon', () => {
      // Act
      const labelled = startsWithLabel('Act: call the thing', options.allowLabels)

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

  describe('patterns', () => {
    it('matches a line closing on a url', () => {
      // Act
      const matched = trailingUrlPattern.test('See https://example.com/docs')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a url with prose after it', () => {
      // Act
      const matched = trailingUrlPattern.test('See https://example.com/docs for more')

      // Assert
      assertEquals(matched, false)
    })

    it('matches a line closing on a dotted identifier', () => {
      // Act
      const matched = trailingIdentifierPattern.test('Handled by discord.js')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a line closing on a period', () => {
      // Act
      const matched = trailingIdentifierPattern.test('A whole sentence.')

      // Assert
      assertEquals(matched, false)
    })

    it('does not match an empty line', () => {
      // Act
      const matched = trailingIdentifierPattern.test('')

      // Assert
      assertEquals(matched, false)
    })
  })
})
