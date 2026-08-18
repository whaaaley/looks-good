import { docUrl } from '../utils/docs.utils.ts'
import { matchesGlob } from '../utils/glob.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Expression, Node, ObjectExpression, Property, SpreadElement, Super } from 'estree'

type Options = {
  files: string
  allowSingleColumn: boolean
}

// A single nullable column under a unique is usually deliberate, at most one row per value and any number with none.
// Only a composite constraint reports by default.
// Set allowSingleColumn to false when a schema means every unique column to be present.
const defaults: Options = {
  files: '**/*.tables.ts',
  allowSingleColumn: true,
}

// The callee of a member or call expression, which is where a builder chain is walked back through.
type ChainNode = Expression | Super

// An element of a constraint array, which estree types as an expression or a spread.
type ArrayItem = Expression | SpreadElement

// A column builder is a call chain, so the base identifier is whatever sits at the end of the member accesses.
const chainMethods = (node: ChainNode): Set<string> => {
  const methods = new Set<string>()
  let current: ChainNode = node

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'MemberExpression') {
      if (current.property.type === 'Identifier') {
        methods.add(current.property.name)
      }

      current = current.object
      continue
    }

    current = current.callee
  }

  return methods
}

const propertyName = (property: Property): string | null => {
  if (property.key.type === 'Identifier' && !property.computed) {
    return property.key.name
  }

  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value
  }

  return null
}

// Collects which columns the table declares and which of them a reader can leave null.
const readColumns = (object: ObjectExpression): Map<string, boolean> => {
  const nullable = new Map<string, boolean>()

  for (const property of object.properties) {
    if (property.type !== 'Property') continue

    const name = propertyName(property)
    if (!name) continue

    const value = property.value
    if (value.type !== 'CallExpression' && value.type !== 'MemberExpression') {
      continue
    }

    const methods = chainMethods(value)

    // A primary key column is not null in Postgres whether or not the builder spells it out.
    const isNotNull = methods.has('notNull') || methods.has('primaryKey')

    nullable.set(name, !isNotNull)
  }

  return nullable
}

// Reads `table.columnName` out of a constraint argument, ignoring anything more elaborate.
const referencedColumn = (argument: ArrayItem): string | null => {
  if (argument.type !== 'MemberExpression') return null
  if (argument.computed) return null
  if (argument.property.type !== 'Identifier') return null

  return argument.property.name
}

type Constraint = {
  node: CallExpression
  columns: string[]
}

// Matches `unique().on(a, b)` and `uniqueIndex('name').on(a, b)`, returning the columns the constraint covers.
const readOnConstraint = (node: CallExpression): Constraint | null => {
  const { callee } = node
  if (callee.type !== 'MemberExpression') return null
  if (callee.property.type !== 'Identifier' || callee.property.name !== 'on') {
    return null
  }

  const inner = callee.object
  if (inner.type !== 'CallExpression') return null
  if (inner.callee.type !== 'Identifier') return null

  const form = inner.callee.name
  if (form !== 'unique' && form !== 'uniqueIndex') return null

  const columns: string[] = []

  for (const argument of node.arguments) {
    const name = referencedColumn(argument)
    if (!name) return null

    columns.push(name)
  }

  if (columns.length === 0) return null

  return { node, columns }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports a Drizzle unique constraint that covers a column a row may leave null',
      url: docUrl('no-nullable-unique-column'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          files: { type: 'string', minLength: 1 },
          allowSingleColumn: { type: 'boolean' },
        },
      },
    ],
    messages: {
      nullable:
        "The unique constraint on '{{table}}' covers {{columns}}, which a row may leave null, and Postgres treats every null as distinct from every other. Duplicate rows are accepted whenever {{columns}} is null. Add .notNull(), or write the constraint as a unique index with NULLS NOT DISTINCT.",
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    if (!matchesGlob(options.files, context.filename, context.cwd)) return {}

    // A table call is `schema.table('name', { columns }, (table) => [ constraints ])` or the bare `pgTable` form.
    const tableCall = (node: CallExpression): void => {
      const { callee } = node

      let name = ''

      if (callee.type === 'Identifier') {
        name = callee.name
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        name = callee.property.name
      }

      if (name !== 'table' && name !== 'pgTable') return

      const [first, second, third] = node.arguments

      if (!first || first.type !== 'Literal' || typeof first.value !== 'string') {
        return
      }

      if (!second || second.type !== 'ObjectExpression') return
      if (!third) return
      if (third.type !== 'ArrowFunctionExpression' && third.type !== 'FunctionExpression') {
        return
      }

      const tableName = first.value
      const nullable = readColumns(second)
      const constraints: Constraint[] = []

      // The constraint list is the array the callback returns, either as an expression body or after a return.
      const collect = (candidate: Node): void => {
        if (candidate.type !== 'CallExpression') return

        const constraint = readOnConstraint(candidate)
        if (constraint) constraints.push(constraint)
      }

      const body = third.body

      if (body.type === 'ArrayExpression') {
        for (const element of body.elements) {
          if (element) collect(element)
        }
      }

      if (body.type === 'BlockStatement') {
        for (const statement of body.body) {
          if (statement.type !== 'ReturnStatement') continue
          if (!statement.argument || statement.argument.type !== 'ArrayExpression') {
            continue
          }

          for (const element of statement.argument.elements) {
            if (element) collect(element)
          }
        }
      }

      for (const constraint of constraints) {
        if (options.allowSingleColumn && constraint.columns.length === 1) {
          continue
        }

        const offenders = constraint.columns.filter((column) => nullable.get(column) === true)
        if (offenders.length === 0) continue

        context.report({
          node: constraint.node,
          messageId: 'nullable',
          data: { table: tableName, columns: offenders.join(', ') },
        })
      }
    }

    return {
      CallExpression: tableCall,
    }
  },
}

export default rule
