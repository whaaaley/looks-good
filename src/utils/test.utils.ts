import type { CallExpression, Node } from 'estree'

// A call written as `describe.only` or `it.skip` is still that test function.
export const calleeName = (node: CallExpression): string => {
  const { callee } = node
  if (callee.type === 'Identifier') return callee.name

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return callee.object.name
  }

  return ''
}

// The title is the first argument, and only when it is a plain string.
export const readTitle = (node: CallExpression): string => {
  const [first] = node.arguments
  if (!first) return ''
  if (first.type !== 'Literal') return ''
  if (typeof first.value !== 'string') return ''

  return first.value
}

// The body is the block of the last function argument, which is where a call does its work.
export const readBody = (node: CallExpression): Node | null => {
  for (let index = node.arguments.length - 1; index >= 0; index -= 1) {
    const argument = node.arguments[index]
    if (!argument) continue
    if (argument.type !== 'FunctionExpression' && argument.type !== 'ArrowFunctionExpression') continue
    if (argument.body.type !== 'BlockStatement') return null

    return argument.body
  }

  return null
}
