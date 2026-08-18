import type { ArrayPattern, ObjectPattern, Pattern } from 'estree'

// A property holds its pattern behind value, and a rest property behind argument.
const countObjectBindings = (pattern: ObjectPattern): number => {
  let total = 0
  for (const property of pattern.properties) {
    total += countBindings(property.type === 'RestElement' ? property.argument : property.value)
  }

  return total
}

// An elision leaves a hole in the elements, which introduces no name.
const countArrayBindings = (pattern: ArrayPattern): number => {
  let total = 0
  for (const element of pattern.elements) {
    if (element) total += countBindings(element)
  }

  return total
}

// A binding is a name the pattern introduces, so a nested pattern counts its leaves rather than itself.
export const countBindings = (pattern: Pattern): number => {
  if (pattern.type === 'ObjectPattern') return countObjectBindings(pattern)
  if (pattern.type === 'ArrayPattern') return countArrayBindings(pattern)
  if (pattern.type === 'AssignmentPattern') return countBindings(pattern.left)
  if (pattern.type === 'RestElement') return countBindings(pattern.argument)

  return 1
}

export const isDestructured = (pattern: Pattern): boolean => {
  if (pattern.type === 'ObjectPattern') return true
  if (pattern.type === 'ArrayPattern') return true
  if (pattern.type === 'AssignmentPattern') return isDestructured(pattern.left)
  if (pattern.type === 'RestElement') return isDestructured(pattern.argument)

  return false
}
