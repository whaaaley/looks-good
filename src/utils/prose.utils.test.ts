import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { endsSentence, endsWithCode, readSentences } from './prose.utils.ts'

describe('All Prose Utility Tests', () => {
  describe('readSentences', () => {
    it('reads a single sentence as one', () => {
      // Arrange
      const text = 'This one is finished.'

      // Act
      const sentences = readSentences(text)

      // Assert
      assertEquals(sentences, ['This one is finished.'])
    })

    it('splits two sentences apart', () => {
      // Arrange
      const text = 'Two here. Second one follows.'

      // Act
      const sentences = readSentences(text)

      // Assert
      assertEquals(sentences.length, 2)
    })

    it('keeps an abbreviation inside its sentence', () => {
      // Arrange
      const text = 'The name is e.g. a router.'

      // Act
      const sentences = readSentences(text)

      // Assert
      assertEquals(sentences.length, 1)
    })

    it('keeps a decimal inside its sentence', () => {
      // Arrange
      const text = 'It weighs 1.5 kg in total.'

      // Act
      const sentences = readSentences(text)

      // Assert
      assertEquals(sentences.length, 1)
    })

    it('reads empty text as no sentences', () => {
      // Arrange
      const text = ''

      // Act
      const sentences = readSentences(text)

      // Assert
      assertEquals(sentences, [])
    })
  })

  describe('endsSentence', () => {
    it('accepts a closing period', () => {
      // Arrange
      const text = 'This one is finished.'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, true)
    })

    it('accepts a closing question mark', () => {
      // Arrange
      const text = 'Is this finished?'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, true)
    })

    it('accepts a closing colon', () => {
      // Arrange
      const text = 'A label:'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, true)
    })

    it('rejects a line ending on a word', () => {
      // Arrange
      const text = 'This one is not'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, false)
    })

    it('rejects an abbreviation that only looks terminal', () => {
      // Arrange
      const text = 'The name is e.g. a router'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, false)
    })

    it('rejects a dotted identifier that only looks terminal', () => {
      // Arrange
      const text = 'See discord.js for details'

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, false)
    })

    it('rejects empty text', () => {
      // Arrange
      const text = ''

      // Act
      const finished = endsSentence(text)

      // Assert
      assertEquals(finished, false)
    })
  })

  describe('endsWithCode', () => {
    it('accepts a line closing on a code span', () => {
      // Arrange
      const text = 'Use `mdast-util-from-markdown`'

      // Act
      const code = endsWithCode(text)

      // Assert
      assertEquals(code, true)
    })

    it('rejects a line closing on prose', () => {
      // Arrange
      const text = 'Use the parser instead'

      // Act
      const code = endsWithCode(text)

      // Assert
      assertEquals(code, false)
    })

    it('rejects a code span that is not last', () => {
      // Arrange
      const text = 'The `config` value is read on start'

      // Act
      const code = endsWithCode(text)

      // Assert
      assertEquals(code, false)
    })

    it('rejects empty text', () => {
      // Arrange
      const text = ''

      // Act
      const code = endsWithCode(text)

      // Assert
      assertEquals(code, false)
    })
  })
})
