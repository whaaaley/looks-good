import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { validate } from './commit.validator.ts'

const rulesFor = (message: string): string[] => {
  return validate(message).map((failure) => failure.rule)
}

describe('All Commit Message Tests', () => {
  describe('accepted subjects', () => {
    it('accepts a type and description', () => {
      // Assert
      assertEquals(rulesFor('feat: add a comment rule'), [])
    })

    it('accepts a scope between the type and description', () => {
      // Assert
      assertEquals(rulesFor('fix(rules): report the configured limit'), [])
    })

    it('accepts a merge subject that git generated', () => {
      // Assert
      assertEquals(rulesFor('Merge branch main into working'), [])
    })

    it('reads only the subject, ignoring the body below it', () => {
      // Assert
      assertEquals(rulesFor('feat: add a rule\n\nA body sentence. Another one.'), [])
    })
  })

  describe('shape', () => {
    it('rejects a subject with no type', () => {
      // Assert
      assertEquals(rulesFor('add a comment rule'), ['format'])
    })

    it('rejects a type the vocabulary does not hold', () => {
      // Assert
      assertEquals(rulesFor('wip: add a comment rule'), ['type'])
    })

    it('rejects a scope the vocabulary does not hold', () => {
      // Assert
      assertEquals(rulesFor('feat(banana): add a comment rule'), ['scope'])
    })
  })

  describe('description', () => {
    it('rejects a description starting with a capital', () => {
      // Assert
      assertEquals(rulesFor('feat: Add a comment rule'), ['case'])
    })

    it('rejects a description ending in punctuation', () => {
      // Assert
      assertEquals(rulesFor('feat: add a comment rule.'), ['punctuation'])
    })

    it('rejects a subject past the length limit', () => {
      // Arrange
      const subject = `feat: ${'x'.repeat(80)}`

      // Assert
      assertEquals(rulesFor(subject), ['length'])
    })
  })

  describe('breaking changes', () => {
    it('rejects the breaking change marker', () => {
      // Assert
      assertEquals(rulesFor('feat!: drop the old option'), ['format'])
    })
  })
})
