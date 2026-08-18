import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-id-only-mutation-scope.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const governance = [{ files: '*.queries.ts', tenantColumns: ['collectiveId'] }]

const scopedList = [
  'export const list = async () => {',
  '  return await db.select().from(doc).where(eq(doc.collectiveId, ctx.membership.collectiveId))',
  '}',
].join('\n')

tester.run('no-id-only-mutation-scope', rule, {
  valid: [
    // A file matching no entry is not checked.
    {
      code: 'await db.update(doc).set(data).where(eq(doc.id, input.id))',
      filename: 'doc.repository.ts',
      options: [{ patterns: governance }],
    },
    // No patterns configured leaves every file alone.
    {
      code: 'await db.update(doc).set(data).where(eq(doc.id, input.id))',
      filename: 'doc.queries.ts',
    },
    // A file with no tenant scoped where anywhere shows no tenant intent, so an id only mutation stands.
    {
      code: 'await db.delete(doc).where(eq(doc.id, input.id))',
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A mutation carrying the tenant condition is what the rule asks for.
    {
      code: [
        scopedList,
        'await db.update(doc).set(data).where(and(eq(doc.collectiveId, ctx.membership.collectiveId), eq(doc.id, input.id)))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // An id only select is a read, and reads are out of scope.
    {
      code: [
        scopedList,
        'await db.select().from(doc).where(eq(doc.id, input.id))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A delete scoped by another column, such as a foreign key, is not an id only mutation.
    {
      code: [
        scopedList,
        'await db.delete(attachment).where(eq(attachment.documentId, doc.id))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A tenant scoped read in the same transaction holds the mutation to the check it just made.
    {
      code: [
        scopedList,
        'await db.transaction(async (tx) => {',
        '  const rows = await tx.select().from(doc).where(and(eq(doc.id, input.id), eq(doc.collectiveId, ctx.membership.collectiveId)))',
        '  await tx.delete(doc).where(eq(doc.id, input.id))',
        '})',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A helper handed the transaction handle is trusted as the verify for mutations in that transaction.
    {
      code: [
        scopedList,
        'await db.transaction(async (tx) => {',
        '  await getUserEvent(input.id, tx)',
        '  await tx.update(doc).set(data).where(eq(doc.id, input.id))',
        '})',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A where naming no member-expression column has no columns to judge, so it is out of scope.
    {
      code: [
        scopedList,
        'await db.delete(doc).where(condition)',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A transaction callback built by a call has no parameter to trust, and that must not crash the rule.
    {
      code: [
        scopedList,
        'await db.transaction(buildHandler(input))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A transaction call with no callback at all has nothing to inspect, and that must not crash the rule.
    {
      code: [
        scopedList,
        'await getDb(input).transaction()',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A helper call inside a parameterless transaction callback has no handle to match and must not crash the rule.
    {
      code: [
        scopedList,
        'await db.transaction(async () => { await helper(input) })',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
    },
    // A configured id column widens what counts as id only, and here the mutation is tenant scoped anyway.
    {
      code: [
        'await db.select().from(doc).where(eq(doc.orgId, ctx.orgId))',
        'await db.update(doc).set(data).where(and(eq(doc.orgId, ctx.orgId), eq(doc.uuid, input.uuid)))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: [{ files: '*.queries.ts', tenantColumns: ['orgId'], idColumns: ['uuid'] }] }],
    },
  ],
  invalid: [
    // An update by id alone in a file whose list query scopes by tenant is the defect this rule exists for.
    {
      code: [
        scopedList,
        'await db.update(doc).set(data).where(eq(doc.id, input.id))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
      errors: [{ messageId: 'idOnly', data: { method: 'update', columns: "'collectiveId'" }, line: 4 }],
    },
    // A delete by id alone reports the same way.
    {
      code: [
        scopedList,
        'await db.delete(doc).where(eq(doc.id, input.id))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
      errors: [{ messageId: 'idOnly', data: { method: 'delete', columns: "'collectiveId'" } }],
    },
    // inArray over ids is still id only when the id column is the only column named.
    {
      code: [
        'const rows = await db.select().from(doc).where(and(eq(doc.collectiveId, ctx.membership.collectiveId), inArray(doc.id, input.ids)))',
        'await db.delete(doc).where(inArray(doc.id, input.ids))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
      errors: [{ messageId: 'idOnly' }],
    },
    // A verify before the mutation outside any transaction leaves the mutation itself open, so it still reports.
    {
      code: [
        'const rows = await db.select().from(doc).where(and(eq(doc.id, input.id), eq(doc.collectiveId, ctx.membership.collectiveId)))',
        'await db.transaction(async (tx) => {',
        '  await tx.delete(doc).where(eq(doc.id, input.id))',
        '})',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: governance }],
      errors: [{ messageId: 'idOnly' }],
    },
    // The tenant column name comes from the matched entry.
    {
      code: [
        'await db.select().from(doc).where(eq(doc.orgId, ctx.orgId))',
        'await db.update(doc).set(data).where(eq(doc.id, input.id))',
      ].join('\n'),
      filename: 'doc.queries.ts',
      options: [{ patterns: [{ files: '*.queries.ts', tenantColumns: ['orgId'] }] }],
      errors: [{ messageId: 'idOnly', data: { method: 'update', columns: "'orgId'" } }],
    },
  ],
})
