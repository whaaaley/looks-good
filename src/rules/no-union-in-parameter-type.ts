import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { SourceLocation } from 'estree'

type Options = {
  allowNullable: boolean
}

const defaults: Options = {
  allowNullable: false,
}

// The estree types do not model TypeScript nodes, so this is the minimal shape the walk needs.
type TypeNode = {
  type: string
  loc?: SourceLocation | null
  parent?: TypeNode
  types?: TypeNode[]
  params?: TypeNode[]
  literal?: { type: string; value?: unknown }
}

const functionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
])

const parameterTypes = new Set([
  'ArrayPattern',
  'Identifier',
  'ObjectPattern',
  'RestElement',
])

// A default value or a parameter property wraps the binding, so the parameter slot holds the wrapper.
const wrapperTypes = new Set([
  'AssignmentPattern',
  'TSParameterProperty',
])

// The visited node arrives typed as estree, which has no TypeScript members, so this reads it back as the shape above.
const isTypeNode = (node: object): node is TypeNode => {
  return 'type' in node && typeof node.type === 'string'
}

const isNullish = (node: TypeNode): boolean => {
  if (node.type === 'TSNullKeyword') return true
  if (node.type === 'TSUndefinedKeyword') return true

  return node.type === 'TSLiteralType' && node.literal?.type === 'Literal' && node.literal.value === null
}

// A rest parameter annotates an array of the union, so the annotation sits one wrapper above.
const annotationOf = (node: TypeNode): TypeNode | undefined => {
  const parent = node.parent
  if (!parent) return undefined
  if (parent.type === 'TSTypeAnnotation') return parent
  if (parent.type === 'TSArrayType' && parent.parent?.type === 'TSTypeAnnotation') {
    return parent.parent
  }

  return undefined
}

const isParameterAnnotation = (annotation: TypeNode): boolean => {
  const binding = annotation.parent
  if (!binding) return false
  if (!parameterTypes.has(binding.type)) return false

  const wrapper = binding.parent
  if (!wrapper) return false

  const slot = wrapperTypes.has(wrapper.type) ? wrapper : binding
  const holder = slot.parent
  if (!holder) return false
  // A TSFunctionType also holds params, but those describe a type rather than a function being written.
  if (!functionTypes.has(holder.type)) return false

  return holder.params?.includes(slot) === true
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbids an inline union type in a function parameter annotation, since a named alias states what the set of values means',
      url: docUrl('no-union-in-parameter-type'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowNullable: { type: 'boolean' },
        },
      },
    ],
    messages: {
      inline: 'This parameter spells its union inline. Extract it to a named type alias and annotate the parameter with that name.',
    },
  },

  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const isExemptNullable = (node: TypeNode): boolean => {
      if (!options.allowNullable) return false
      const members = node.types
      if (!members) return false
      if (members.length !== 2) return false

      return members.some(isNullish)
    }

    return {
      TSUnionType: (node: Rule.Node): void => {
        if (!isTypeNode(node)) return
        if (!node.loc) return
        if (isExemptNullable(node)) return

        const annotation = annotationOf(node)
        if (!annotation) return
        if (!isParameterAnnotation(annotation)) return

        context.report({ loc: node.loc, messageId: 'inline' })
      },
    }
  },
}

export default rule
