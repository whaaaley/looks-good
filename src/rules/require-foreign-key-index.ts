import { docUrl } from '../utils/docs.utils.ts'
import { matchesGlob } from '../utils/glob.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Expression, Node, ObjectExpression, Property, SpreadElement } from 'estree'

type Options = {
  files: string
  tableFunctions: string[]
  indexFunctions: string[]
  uniqueFunctions: string[]
  foreignKeyFunction: string
}

const defaults: Options = {
  files: '**/*.tables.ts',
  tableFunctions: ['table', 'pgTable'],
  indexFunctions: ['index', 'uniqueIndex'],
  uniqueFunctions: ['unique'],
  foreignKeyFunction: 'foreignKey',
}

// A foreign key found in one table config, kept with the node so the report lands on the call.
type ForeignKey = {
  node: CallExpression
  columns: string[]
}

// The name a callee ends in, so `pgSchema(...).table(...)` and a bare `table(...)` both read as `table`.
const calleeName = (node: CallExpression): string => {
  const { callee } = node
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name
  }

  return ''
}

// A builder chain such as `index().on(a, b)` or `unique('n').on(a)` hides the base call under member calls.
const chainBase = (node: CallExpression): CallExpression => {
  const { callee } = node
  if (callee.type !== 'MemberExpression') return node
  if (callee.object.type !== 'CallExpression') return node

  return chainBase(callee.object)
}

const propertyNamed = (object: ObjectExpression, name: string): Property | undefined => {
  for (const property of object.properties) {
    if (property.type !== 'Property') continue
    if (property.key.type === 'Identifier' && property.key.name === name) {
      return property
    }

    if (property.key.type === 'Literal' && property.key.value === name) {
      return property
    }
  }

  return undefined
}

// A column reads as `table.collectiveId`, so the property name is the identity the rule compares on.
const columnName = (node: Node): string => {
  if (node.type !== 'MemberExpression') return ''
  if (node.property.type !== 'Identifier') return ''

  return node.property.name
}

const columnsOf = (elements: Array<Expression | SpreadElement | null>): string[] => {
  const names: string[] = []

  for (const element of elements) {
    if (!element) continue

    const name = columnName(element)
    if (name) names.push(name)
  }

  return names
}

// Postgres can use a leading prefix of a composite index, so an index on (a, b, c) serves a foreign key on (a, b).
const coversPrefix = (covering: string[], required: string[]): boolean => {
  if (covering.length < required.length) return false

  return required.every((name, position) => covering[position] === name)
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Requires a Drizzle foreign key to have an index covering its referencing columns',
      url: docUrl('require-foreign-key-index'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          files: { type: 'string', minLength: 1 },
          tableFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
          indexFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
          uniqueFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
          foreignKeyFunction: { type: 'string', minLength: 1 },
        },
      },
    ],
    messages: {
      missing: 'The foreign key on {{columns}} has no index covering it, so every lookup and every cascading delete through it scans the whole table. Add index().on({{suggestion}}).',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    if (!matchesGlob(options.files, context.filename, context.cwd)) return {}

    const tableNames = new Set(options.tableFunctions)
    const indexNames = new Set(options.indexFunctions)
    const uniqueNames = new Set(options.uniqueFunctions)

    // A column declared `.primaryKey()` is already indexed by Postgres, so it needs nothing further.
    const primaryKeyColumns = (columns: ObjectExpression): string[] => {
      const names: string[] = []

      for (const property of columns.properties) {
        if (property.type !== 'Property') continue
        if (property.key.type !== 'Identifier') continue

        const text = context.sourceCode.getText(property.value)
        if (text.includes('.primaryKey(')) names.push(property.key.name)
      }

      return names
    }

    // Every column list an index, a unique constraint, or a composite primary key already covers in this config.
    const collectCovering = (entries: Array<Expression | SpreadElement | null>, columns: ObjectExpression): string[][] => {
      const covering: string[][] = []

      for (const name of primaryKeyColumns(columns)) {
        covering.push([name])
      }

      for (const entry of entries) {
        if (!entry || entry.type !== 'CallExpression') continue

        const base = calleeName(chainBase(entry))

        // A unique constraint is enforced by a backing btree index in Postgres, so it serves a foreign key lookup too.
        const builds = indexNames.has(base) || uniqueNames.has(base) || base === 'primaryKey'
        if (!builds) continue

        if (entry.callee.type === 'MemberExpression' && entry.callee.property.type === 'Identifier' && entry.callee.property.name === 'on') {
          covering.push(columnsOf(entry.arguments))
          continue
        }

        // `primaryKey({ columns: [...] })` names its columns in an option object rather than through `.on`.
        const [first] = entry.arguments
        if (first && first.type === 'ObjectExpression') {
          const property = propertyNamed(first, 'columns')

          if (property && property.value.type === 'ArrayExpression') {
            covering.push(columnsOf(property.value.elements))
          }
        }
      }

      return covering
    }

    const collectForeignKeys = (entries: Array<Expression | SpreadElement | null>): ForeignKey[] => {
      const keys: ForeignKey[] = []

      for (const entry of entries) {
        if (!entry || entry.type !== 'CallExpression') continue

        const base = chainBase(entry)
        if (calleeName(base) !== options.foreignKeyFunction) continue

        const [first] = base.arguments
        if (!first || first.type !== 'ObjectExpression') continue

        const property = propertyNamed(first, 'columns')
        if (!property || property.value.type !== 'ArrayExpression') continue

        const columns = columnsOf(property.value.elements)
        if (columns.length > 0) keys.push({ node: base, columns })
      }

      return keys
    }

    return {
      CallExpression: (node: CallExpression): void => {
        if (!tableNames.has(calleeName(node))) return

        const [, columns, config] = node.arguments
        if (!columns || columns.type !== 'ObjectExpression') return
        if (!config) return

        // A table config is an arrow returning an array of constraints, which is the only shape the rule reads.
        if (config.type !== 'ArrowFunctionExpression') return
        if (config.body.type !== 'ArrayExpression') return

        const entries = config.body.elements
        const covering = collectCovering(entries, columns)

        for (const key of collectForeignKeys(entries)) {
          const covered = covering.some((candidate) => coversPrefix(candidate, key.columns))
          if (covered) continue

          context.report({
            node: key.node,
            messageId: 'missing',
            data: {
              columns: key.columns.join(', '),
              suggestion: key.columns.map((name) => `table.${name}`).join(', '),
            },
          })
        }
      },
    }
  },
}

export default rule
