import { describe, it } from 'node:test'
import { assert, assertEquals } from '@std/assert'
import { compilePattern } from './regex.utils.ts'

describe('All Regex Tests', () => {
  describe('compilePattern', () => {
    it('compiles a valid source and flags into a usable pattern', () => {
      // Arrange
      const pattern = { source: '^a+b$', flags: 'u' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assert(compiled)
      assert(compiled.test('aaab'))
      assertEquals(compiled.test('abc'), false)
    })

    it('carries the flags it was given', () => {
      // Arrange
      const pattern = { source: 'a', flags: 'gi' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assert(compiled)
      assertEquals(compiled.flags, 'gi')
    })

    it('compiles an empty source rather than treating it as absent', () => {
      // Arrange
      const pattern = { source: '', flags: '' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assert(compiled)
      assert(compiled.test('anything'))
    })

    it('returns null for a source that cannot compile', () => {
      // Arrange
      const pattern = { source: '(unclosed', flags: 'u' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assertEquals(compiled, null)
    })

    it('returns null for a flag that is not a flag', () => {
      // Arrange
      const pattern = { source: 'a', flags: 'q' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assertEquals(compiled, null)
    })

    it('returns null for a source only unicode mode rejects', () => {
      // Arrange
      const pattern = { source: '\\p{Nope}', flags: 'u' }

      // Act
      const compiled = compilePattern(pattern)

      // Assert
      assertEquals(compiled, null)
    })
  })
})
