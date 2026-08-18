import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './require-foreign-key-index.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const filename = 'governance.tables.ts'

const indexed = `
export const membership = governanceSchema.table('membership', {
  id: serial().primaryKey().notNull(),
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  index().on(table.collectiveId),
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] })
    .onDelete('cascade'),
])
`

const unindexed = `
export const membership = governanceSchema.table('membership', {
  id: serial().primaryKey().notNull(),
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] })
    .onDelete('cascade'),
])
`

tester.run('require-foreign-key-index', rule, {
  valid: [
    // An index on the referencing column covers the foreign key.
    {
      code: indexed,
      filename,
    },
    // A uniqueIndex covers it just as well.
    {
      code: `
export const settings = governanceSchema.table('settings', {
  collectiveId: integer('collective_id').notNull(),
}, (table) => [
  uniqueIndex().on(table.collectiveId),
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] }),
])
`,
      filename,
    },
    // A unique constraint is backed by an index in Postgres, so it covers the foreign key too.
    {
      code: `
export const membership = governanceSchema.table('membership', {
  userId: uuid('user_id'),
}, (table) => [
  unique().on(table.userId),
  foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] }),
])
`,
      filename,
    },
    // A foreign key on the primary key column needs no separate index.
    {
      code: `
export const profile = portalSchema.table('profile', {
  userId: uuid('user_id').primaryKey().notNull(),
}, (table) => [
  foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] }),
])
`,
      filename,
    },
    // A composite index whose leading columns match the composite foreign key covers it.
    {
      code: `
export const vote = governanceSchema.table('vote', {
  proposalId: integer('proposal_id').notNull(),
  createdBy: integer('created_by'),
}, (table) => [
  index().on(table.proposalId, table.createdBy, table.updatedBy),
  foreignKey({ columns: [table.proposalId, table.createdBy], foreignColumns: [proposal.id, membership.id] }),
])
`,
      filename,
    },
    // A composite primary key declared in the config array covers a foreign key on its leading column.
    {
      code: `
export const link = governanceSchema.table('link', {
  eventId: integer('event_id').notNull(),
  taskId: integer('task_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.eventId, table.taskId] }),
  foreignKey({ columns: [table.eventId], foreignColumns: [event.id] }),
])
`,
      filename,
    },
    // The file does not match the glob, so nothing is read.
    {
      code: unindexed,
      filename: 'governance.queries.ts',
    },
    // A table with no config array declares no foreign key to check.
    {
      code: `
export const collective = governanceSchema.table('collective', {
  id: serial().primaryKey().notNull(),
})
`,
      filename,
    },
  ],
  invalid: [
    // The referencing column has no index of any kind.
    {
      code: unindexed,
      filename,
      errors: [{ messageId: 'missing' }],
    },
    // An index on a different column does not cover this foreign key.
    {
      code: `
export const task = governanceSchema.table('task', {
  collectiveId: integer('collective_id').notNull(),
  createdBy: integer('created_by'),
}, (table) => [
  index().on(table.collectiveId),
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] }),
  foreignKey({ columns: [table.createdBy], foreignColumns: [membership.id] }),
])
`,
      filename,
      errors: [{ messageId: 'missing' }],
    },
    // An index on a trailing column of a composite key does not serve it, since Postgres reads a leading prefix only.
    {
      code: `
export const vote = governanceSchema.table('vote', {
  proposalId: integer('proposal_id').notNull(),
  createdBy: integer('created_by'),
}, (table) => [
  index().on(table.createdBy, table.proposalId),
  foreignKey({ columns: [table.proposalId, table.createdBy], foreignColumns: [proposal.id, membership.id] }),
])
`,
      filename,
      errors: [{ messageId: 'missing' }],
    },
    // An index on the first column alone does not cover a composite foreign key.
    {
      code: `
export const vote = governanceSchema.table('vote', {
  proposalId: integer('proposal_id').notNull(),
  createdBy: integer('created_by'),
}, (table) => [
  index().on(table.proposalId),
  foreignKey({ columns: [table.proposalId, table.createdBy], foreignColumns: [proposal.id, membership.id] }),
])
`,
      filename,
      errors: [{ messageId: 'missing' }],
    },
    // Every uncovered foreign key in one config is reported separately.
    {
      code: `
export const attachment = governanceSchema.table('attachment', {
  collectiveId: integer('collective_id').notNull(),
  documentId: integer('document_id'),
}, (table) => [
  foreignKey({ columns: [table.collectiveId], foreignColumns: [collective.id] }),
  foreignKey({ columns: [table.documentId], foreignColumns: [document.id] }),
])
`,
      filename,
      errors: [{ messageId: 'missing' }, { messageId: 'missing' }],
    },
    // A configured glob and table function name reach a project that names them differently.
    {
      code: `
export const account = pgTable('account', {
  ownerId: integer('owner_id').notNull(),
}, (table) => [
  foreignKey({ columns: [table.ownerId], foreignColumns: [owner.id] }),
])
`,
      filename: 'db/schema.ts',
      options: [{ files: 'db/*.ts' }],
      errors: [{ messageId: 'missing' }],
    },
  ],
})
