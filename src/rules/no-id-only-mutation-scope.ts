import { docUrl } from '../utils/docs.utils.ts'
import { matchesGlob } from '../utils/glob.utils.ts'
import type { Rule } from 'eslint'
import type { CallExpression, Node } from 'estree'

export type ScopeEntry = {
  files: string
  tenantColumns: string[]
  idColumns?: string[]
}

type Options = {
  patterns: ScopeEntry[]
}

const defaults: Options = {
  patterns: [],
}

type Suspect = {
  node: CallExpression
  method: string
  transaction: Rule.Node | null
}

// Query builders write eq(column, value), so the first argument of each comparator names the column.
const collectColumns = (node: Node, into: Set<string>): void => {
  if (node.type !== 'CallExpression') return

  const [first] = node.arguments
  if (first && first.type === 'MemberExpression' && first.property.type === 'Identifier') {
    into.add(first.property.name)
  }

  for (const argument of node.arguments) {
    collectColumns(argument, into)
  }
}

const columnsIn = (whereCall: CallExpression): Set<string> => {
  const columns = new Set<string>()
  collectColumns(whereCall, columns)

  return columns
}

// A where clause belongs to a mutation when update or delete appears below it in the builder chain.
const mutationMethod = (whereCall: CallExpression): string | null => {
  let current: Node = whereCall.callee

  while (current.type === 'MemberExpression' || current.type === 'CallExpression') {
    if (current.type === 'MemberExpression') {
      current = current.object
      continue
    }

    const callee: Node = current.callee
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      const { name } = callee.property
      if (name === 'update' || name === 'delete') return name
    }

    current = callee
  }

  return null
}

const transactionParamName = (transaction: Rule.Node): string | null => {
  if (transaction.type !== 'CallExpression') return null

  const [callback] = transaction.arguments
  if (!callback) return null
  if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
    return null
  }

  const [param] = callback.params
  if (!param || param.type !== 'Identifier') return null

  return param.name
}

const enclosingTransaction = (node: Rule.Node): Rule.Node | null => {
  let current: Rule.Node | null = node.parent

  while (current) {
    if (current.type === 'CallExpression' && current.callee.type === 'MemberExpression' && current.callee.property.type === 'Identifier' && current.callee.property.name === 'transaction') {
      return current
    }

    current = current.parent
  }

  return null
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reports a mutation scoped only by id in a file that scopes other queries by tenant',
      url: docUrl('no-id-only-mutation-scope'),
    },
    defaultOptions: [defaults],
    fixable: undefined,
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['files', 'tenantColumns'],
            properties: {
              files: { type: 'string', minLength: 1 },
              tenantColumns: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
              idColumns: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
            },
          },
        },
      },
    }],
    messages: {
      idOnly: 'This {{method}} filters by id alone, while this file scopes other queries by {{columns}}. Add the tenant condition to the where clause, or run the scoped check and the mutation in one transaction.',
    },
  },
  create(context): Rule.RuleListener {
    const options: Options = { ...defaults, ...context.options[0] }

    // The first entry whose glob matches the path wins, so a narrow entry is listed before a broad one.
    const matched = options.patterns.find((entry) => {
      return matchesGlob(entry.files, context.filename, context.cwd)
    })

    if (!matched) return {}

    const tenantColumns = new Set(matched.tenantColumns)
    const idColumns = new Set(matched.idColumns ?? ['id'])
    const columnList = matched.tenantColumns.map((name) => `'${name}'`).join(', ')

    const verifiedTransactions = new Set<Rule.Node>()
    const suspects: Suspect[] = []
    let fileScopesByTenant = false

    return {
      CallExpression: (node: CallExpression & Rule.NodeParentExtension): void => {
        const { callee } = node

        // A helper handed the transaction handle participates in the transaction, so it is trusted as the verify.
        if (callee.type === 'Identifier') {
          const transaction = enclosingTransaction(node)
          if (!transaction) return

          const param = transactionParamName(transaction)
          if (!param) return

          if (node.arguments.some((argument) => argument.type === 'Identifier' && argument.name === param)) {
            verifiedTransactions.add(transaction)
          }

          return
        }

        if (callee.type !== 'MemberExpression') return
        if (callee.property.type !== 'Identifier') return
        if (callee.property.name !== 'where') return

        const columns = columnsIn(node)

        if ([...columns].some((name) => tenantColumns.has(name))) {
          fileScopesByTenant = true

          const transaction = enclosingTransaction(node)
          if (transaction) verifiedTransactions.add(transaction)

          return
        }

        const method = mutationMethod(node)
        if (!method) return

        // A where naming no column, or one scoped by another column such as a foreign key, is out of scope.
        if (columns.size === 0) return
        if (![...columns].every((name) => idColumns.has(name))) return

        suspects.push({ node, method, transaction: enclosingTransaction(node) })
      },
      'Program:exit': (): void => {
        if (!fileScopesByTenant) return

        for (const suspect of suspects) {
          // A tenant scoped read in the same transaction holds the mutation to the check it just made.
          if (suspect.transaction && verifiedTransactions.has(suspect.transaction)) {
            continue
          }

          context.report({
            node: suspect.node,
            messageId: 'idOnly',
            data: { method: suspect.method, columns: columnList },
          })
        }
      },
    }
  },
}

export default rule
