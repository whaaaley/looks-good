import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { isLineComment } from './test-arrange-act-assert.utils.ts'

describe('All Test Arrange Act Assert Utility Tests', () => {
  describe('isLineComment', () => {
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
