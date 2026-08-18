import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import { countBindings, isDestructured } from './max-destructured-parameters.utils.ts'
import type { ArrayPattern, AssignmentPattern, AssignmentProperty, Identifier, ObjectPattern, Pattern, RestElement } from 'estree'

type ObjectPatternProperty = AssignmentProperty | RestElement
type ArrayPatternElement = Pattern | null

// Builders keep the estree literals short, since a property carries five flags the tests never vary.
const id = (name: string): Identifier => ({ type: 'Identifier', name })
const prop = (value: Pattern): AssignmentProperty => ({ type: 'Property', key: id('key'), value, kind: 'init', method: false, shorthand: false, computed: false })
const objectPattern = (...properties: ObjectPatternProperty[]): ObjectPattern => ({ type: 'ObjectPattern', properties })
const arrayPattern = (...elements: ArrayPatternElement[]): ArrayPattern => ({ type: 'ArrayPattern', elements })
const rest = (argument: Pattern): RestElement => ({ type: 'RestElement', argument })
const withDefault = (left: Pattern): AssignmentPattern => ({ type: 'AssignmentPattern', left, right: { type: 'ObjectExpression', properties: [] } })

describe('All Max Destructured Parameters Utility Tests', () => {
  describe('countBindings', () => {
    it('counts a plain name as one binding', () => {
      // Act
      const count = countBindings(id('a'))

      // Assert
      assertEquals(count, 1)
    })

    it('counts each property of an object pattern', () => {
      // Act
      const count = countBindings(objectPattern(prop(id('a')), prop(id('b'))))

      // Assert
      assertEquals(count, 2)
    })

    it('counts the leaves of a nested pattern rather than the pattern', () => {
      // Act
      const count = countBindings(objectPattern(prop(id('a')), prop(objectPattern(prop(id('b')), prop(id('c'))))))

      // Assert
      assertEquals(count, 3)
    })

    it('counts a rest property as one binding', () => {
      // Act
      const count = countBindings(objectPattern(prop(id('a')), rest(id('rest'))))

      // Assert
      assertEquals(count, 2)
    })

    it('skips a hole in an array pattern', () => {
      // Act
      const count = countBindings(arrayPattern(null, id('a')))

      // Assert
      assertEquals(count, 1)
    })

    it('counts through a default value to the name it wraps', () => {
      // Act
      const count = countBindings(withDefault(objectPattern(prop(id('a')), prop(id('b')))))

      // Assert
      assertEquals(count, 2)
    })

    it('counts through a rest element to the pattern it wraps', () => {
      // Act
      const count = countBindings(rest(arrayPattern(id('a'), id('b'))))

      // Assert
      assertEquals(count, 2)
    })
  })

  describe('isDestructured', () => {
    it('reads an object pattern as destructured', () => {
      // Act
      const destructured = isDestructured(objectPattern(prop(id('a'))))

      // Assert
      assertEquals(destructured, true)
    })

    it('reads an array pattern as destructured', () => {
      // Act
      const destructured = isDestructured(arrayPattern(id('a')))

      // Assert
      assertEquals(destructured, true)
    })

    it('reads a plain name as not destructured', () => {
      // Act
      const destructured = isDestructured(id('a'))

      // Assert
      assertEquals(destructured, false)
    })

    it('looks through a default value to the pattern it wraps', () => {
      // Act
      const destructured = isDestructured(withDefault(objectPattern(prop(id('a')))))

      // Assert
      assertEquals(destructured, true)
    })

    it('looks through a rest element to the pattern it wraps', () => {
      // Act
      const destructured = isDestructured(rest(arrayPattern(id('a'))))

      // Assert
      assertEquals(destructured, true)
    })

    // A member expression is a pattern only in assignment destructuring, never in a parameter, so it falls through.
    it('reads a member expression as not destructured', () => {
      // Act
      const destructured = isDestructured({ type: 'MemberExpression', object: id('target'), property: id('a'), computed: false, optional: false })

      // Assert
      assertEquals(destructured, false)
    })

    it('reads a rest of a plain name as not destructured', () => {
      // Act
      const destructured = isDestructured(rest(id('values')))

      // Assert
      assertEquals(destructured, false)
    })
  })
})
