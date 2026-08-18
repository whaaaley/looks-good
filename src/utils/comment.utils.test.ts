import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { isDirective, whitespacePattern } from './comment.utils.ts'

describe('All Comment Utility Tests', () => {
  describe('directives', () => {
    it('recognises a directive that carries its argument in a later word', () => {
      // Act
      const recognised = ['eslint-disable-next-line no-console', 'deno-lint-ignore no-explicit-any', 'biome-ignore lint: a reason'].map(isDirective)

      // Assert
      assertEquals(recognised, [true, true, true])
    })

    it('recognises a directive that carries its argument in the same token', () => {
      // Act
      const recognised = ['@ts-expect-error the shape is wrong', 'ts-ignore'].map(isDirective)

      // Assert
      assertEquals(recognised, [true, true])
    })

    // A prefix match would exempt any prose beginning with a directive name.
    it('does not recognise prose that merely begins with a directive name', () => {
      // Act
      const recognised = ['Biometrics are cool', 'V8intrinsic tuning notes', 'globally speaking this is fine'].map(isDirective)

      // Assert
      assertEquals(recognised, [false, false, false])
    })

    it('does not recognise ordinary prose', () => {
      // Act
      const recognised = isDirective('A normal comment.')

      // Assert
      assertEquals(recognised, false)
    })
  })

  describe('patterns', () => {
    it('splits a line on its first space', () => {
      // Act
      const [first = ''] = 'ts-expect-error a reason'.split(whitespacePattern)

      // Assert
      assertEquals(first, 'ts-expect-error')
    })

    it('splits a line on a tab as well as a space', () => {
      // Act
      const [first = ''] = 'eslint-disable\tno-console'.split(whitespacePattern)

      // Assert
      assertEquals(first, 'eslint-disable')
    })
  })
})
