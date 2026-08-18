import { docUrl } from '../utils/docs.utils.ts'
import type { Rule } from 'eslint'
import type { Expression, Literal, NewExpression, Node, Program, SpreadElement } from 'estree'

type Options = {
  position: 'module' | 'top'
}

const defaults: Options = {
  position: 'module',
}

// The Program level statement the declaration reads as, which is the export when the const is exported.
const statementOf = (node: Node & Rule.NodeParentExtension): Node | null => {
  const declarator = node.parent
  if (declarator.type !== 'VariableDeclarator') return null
  if (declarator.init !== node) return null

  const declaration = declarator.parent
  if (declaration.type !== 'VariableDeclaration') return null
  if (declaration.kind !== 'const') return null

  const owner = declaration.parent
  if (owner.type === 'ExportNamedDeclaration') {
    return owner.parent.type === 'Program' ? owner : null
  }

  return owner.type === 'Program' ? declaration : null
}

const unwrapExport = (statement: Node): Node => {
  if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
    return statement.declaration
  }

  return statement
}

// A collection of patterns is still a pattern declaration, so it does not break the opening run for the ones beside it.
const holdsRegex = (node: Node): boolean => {
  if (node.type === 'Literal') return 'regex' in node

  if (node.type === 'NewExpression') {
    return node.callee.type === 'Identifier' && node.callee.name === 'RegExp'
  }

  if (node.type === 'VariableDeclaration') {
    return node.declarations.some((entry) => entry.init !== null && entry.init !== undefined && holdsRegex(entry.init))
  }

  if (node.type === 'ArrayExpression') {
    return node.elements.some((entry) => entry !== null && entry.type !== 'SpreadElement' && holdsRegex(entry))
  }

  if (node.type === 'ObjectExpression') {
    return node.properties.some((entry) => entry.type === 'Property' && holdsRegex(entry.value))
  }

  return false
}

// A type declaration parses as an unknown node type under the default parser, so the names are compared as strings.
const isTypeDeclaration = (node: Node): boolean => {
  const names: string[] = ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration']

  return names.includes(node.type)
}

// A pattern opens the file when every statement above it is an import, a type, or another pattern.
const opensTheFile = (program: Program, statement: Node): boolean => {
  for (const above of program.body) {
    if (above === statement) return true

    const declaration = unwrapExport(above)
    if (declaration.type === 'ImportDeclaration') continue
    if (isTypeDeclaration(declaration)) continue
    if (holdsRegex(declaration)) continue

    return false
  }

  return false
}

type Argument = Expression | SpreadElement

// A template literal holding an expression is built from runtime values, so only a bare one counts as static.
const isStatic = (argument: Argument): boolean => {
  if (argument.type === 'Literal') return true

  return argument.type === 'TemplateLiteral' && argument.expressions.length === 0
}

const isStaticRegExp = (node: NewExpression): boolean => {
  if (node.callee.type !== 'Identifier') return false
  if (node.callee.name !== 'RegExp') return false

  return node.arguments.every(isStatic)
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Keeps a regular expression as the initializer of a module-level const',
      url: docUrl('no-inline-regex'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          position: { enum: ['module', 'top'] },
        },
      },
    ],
    messages: {
      inline: 'This regular expression is written inline. Hoist it to a named module-level const, so it is compiled once and reads by name at the call site.',
      scattered: 'This regular expression is declared below other code. Group the patterns at the top of the file, after the imports and types, so every pattern the file uses reads in one place.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    const check = (node: Node & Rule.NodeParentExtension): void => {
      const statement = statementOf(node)
      if (!statement) {
        context.report({ node, messageId: 'inline' })

        return
      }

      if (options.position !== 'top') return
      if (opensTheFile(context.sourceCode.ast, statement)) return

      context.report({ node, messageId: 'scattered' })
    }

    return {
      Literal: (node: Literal & Rule.NodeParentExtension): void => {
        if (!('regex' in node)) return

        check(node)
      },
      NewExpression: (node: NewExpression & Rule.NodeParentExtension): void => {
        if (!isStaticRegExp(node)) return

        check(node)
      },
    }
  },
}

export default rule
