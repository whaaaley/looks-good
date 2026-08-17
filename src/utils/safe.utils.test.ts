import { describe, it } from 'node:test'
import { assert, assertEquals, assertInstanceOf } from '@std/assert'
import { safe, safeAsync } from './safe.utils.ts'

describe('All Safe Tests', () => {
  describe('safe', () => {
    it('returns the value and a null error on success', () => {
      // Arrange
      const fn = (): number => 42

      // Act
      const result = safe(fn)

      // Assert
      assertEquals(result.data, 42)
      assertEquals(result.error, null)
    })

    it('returns a null data and the thrown Error on failure', () => {
      // Arrange
      const boom = new Error('boom')
      const fn = (): number => {
        throw boom
      }

      // Act
      const result = safe(fn)

      // Assert
      assertEquals(result.data, null)
      assertEquals(result.error, boom)
    })

    it('wraps a non-Error throw in an Error', () => {
      // Arrange
      const fn = (): number => {
        throw 'plain string'
      }

      // Act
      const result = safe(fn)

      // Assert
      assertInstanceOf(result.error, Error)
      assertEquals(result.error.message, 'plain string')
    })

    // Guarding on the error is what narrows data to the success branch, which is the point of the shape.
    it('narrows data to the value once the error is guarded', () => {
      // Arrange
      const fn = (): string => 'value'

      // Act
      const { data, error } = safe(fn)

      // Assert
      assert(!error)
      assertEquals(data.length, 5)
    })
  })

  describe('safeAsync', () => {
    it('returns the resolved value and a null error on success', async () => {
      // Arrange
      const fn = (): Promise<string> => Promise.resolve('ok')

      // Act
      const result = await safeAsync(fn)

      // Assert
      assertEquals(result.data, 'ok')
      assertEquals(result.error, null)
    })

    it('returns a null data and the rejection Error on failure', async () => {
      // Arrange
      const boom = new Error('async boom')
      const fn = (): Promise<string> => Promise.reject(boom)

      // Act
      const result = await safeAsync(fn)

      // Assert
      assertEquals(result.data, null)
      assertEquals(result.error, boom)
    })

    it('wraps a non-Error rejection in an Error', async () => {
      // Arrange
      const fn = (): Promise<string> => Promise.reject('plain rejection')

      // Act
      const result = await safeAsync(fn)

      // Assert
      assertInstanceOf(result.error, Error)
      assertEquals(result.error.message, 'plain rejection')
    })
  })
})
