import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { matchesGlob } from './glob.utils.ts'

const base = '/home/dustin/projects/looks-good'

describe('All Glob Utility Tests', () => {
  describe('single star', () => {
    it('does not cross a directory separator', () => {
      // Act
      const matched = matchesGlob('src/*/x.ts', 'src/a/b/x.ts', base)

      // Assert
      assertEquals(matched, false)
    })

    it('matches a single intervening segment', () => {
      // Act
      const matched = matchesGlob('src/*/x.ts', 'src/a/x.ts', base)

      // Assert
      assertEquals(matched, true)
    })
  })

  describe('double star', () => {
    it('crosses directory separators', () => {
      // Act
      const matched = matchesGlob('src/**/x.ts', 'src/a/b/x.ts', base)

      // Assert
      assertEquals(matched, true)
    })

    it('matches with no intervening segment', () => {
      // Act
      const matched = matchesGlob('src/**/x.ts', 'src/x.ts', base)

      // Assert
      assertEquals(matched, true)
    })
  })

  describe('relativization', () => {
    it('matches an absolute filename against a relative pattern', () => {
      // Arrange
      const filename = `${base}/src/apps/governance/event/event.queries.test.ts`

      // Act
      const matched = matchesGlob('src/apps/**/*.test.ts', filename, base)

      // Assert
      assertEquals(matched, true)
    })

    it('does not match an absolute filename whose relative path falls outside the pattern', () => {
      // Arrange
      const filename = `${base}/tools/build/build.test.ts`

      // Act
      const matched = matchesGlob('src/apps/**/*.test.ts', filename, base)

      // Assert
      assertEquals(matched, false)
    })

    it('does not match a file outside the base path', () => {
      // Act
      const matched = matchesGlob('src/**/*.ts', '/somewhere/else/src/a.ts', base)

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('dotfiles', () => {
    it('matches a dotted segment because dot is enabled', () => {
      // Act
      const matched = matchesGlob('**/*.ts', '.config/a.ts', base)

      // Assert
      assertEquals(matched, true)
    })

    it('matches a leading-dot filename', () => {
      // Act
      const matched = matchesGlob('src/*', 'src/.hidden', base)

      // Assert
      assertEquals(matched, true)
    })
  })

  describe('bare filenames', () => {
    it('matches a bare filename pattern with no base path', () => {
      // Act
      const matched = matchesGlob('*.test.ts', 'event.queries.test.ts')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a nested path against a bare filename pattern because matchBase is off', () => {
      // Act
      const matched = matchesGlob('*.test.ts', 'src/a/event.queries.test.ts')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('regex escaping', () => {
    it('matches a metacharacter string literally rather than as a pattern', () => {
      // Arrange
      const source = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o'

      // Act
      const pattern = new RegExp(`^${RegExp.escape(source)}$`, 'u')

      // Assert
      assertEquals([pattern.test(source), pattern.test('aXbYcZd')], [true, false])
    })

    // An unescaped dot would match any character, so a near miss must be rejected.
    it('does not let an escaped dot match an arbitrary character', () => {
      // Act
      const pattern = new RegExp(`^${RegExp.escape('event.queries')}$`, 'u')

      // Assert
      assertEquals([pattern.test('event.queries'), pattern.test('eventXqueries')], [true, false])
    })
  })
})
