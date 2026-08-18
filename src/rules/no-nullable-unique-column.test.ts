import process from 'node:process'
import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './no-nullable-unique-column.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

// ESLint relativizes an absolute path against the cwd before matching, so a tree glob is written relative to it.
const tablesFile = `${process.cwd()}/src/apps/governance/governance.tables.ts`
const otherFile = `${process.cwd()}/src/apps/governance/governance.queries.ts`

tester.run('no-nullable-unique-column', rule, {
  valid: [
    {
      name: 'every covered column carries notNull',
      filename: tablesFile,
      code: `
        export const vote = governanceSchema.table('vote', {
          proposalId: integer('proposal_id').notNull(),
          createdBy: integer('created_by').notNull(),
        }, (table) => [
          unique().on(table.proposalId, table.createdBy),
        ])
      `,
    },
    {
      name: 'a primary key column counts as not null without the builder spelling it out',
      filename: tablesFile,
      code: `
        export const profile = portalSchema.table('profile', {
          id: serial().primaryKey(),
        }, (table) => [
          unique().on(table.id),
        ])
      `,
    },
    {
      name: 'a file outside the files glob is left alone',
      filename: otherFile,
      code: `
        export const vote = governanceSchema.table('vote', {
          createdBy: integer('created_by'),
        }, (table) => [
          unique().on(table.createdBy),
        ])
      `,
    },
    {
      name: 'a single column unique on a nullable column is allowed by default',
      filename: tablesFile,
      code: `
        export const collective = governanceSchema.table('collective', {
          guildId: varchar('guild_id'),
        }, (table) => [
          unique().on(table.guildId),
        ])
      `,
    },
    {
      name: 'a table with no constraint callback is left alone',
      filename: tablesFile,
      code: `
        export const helloWorld = pgTable('hello_world', {
          message: text(),
        })
      `,
    },
    {
      name: 'a foreign key constraint is not a unique constraint',
      filename: tablesFile,
      code: `
        export const vote = governanceSchema.table('vote', {
          createdBy: integer('created_by'),
        }, (table) => [
          foreignKey({ columns: [table.createdBy], foreignColumns: [membership.id] }),
        ])
      `,
    },
  ],
  invalid: [
    {
      name: 'a composite unique covering a nullable column',
      filename: tablesFile,
      code: `
        export const vote = governanceSchema.table('vote', {
          proposalId: integer('proposal_id').notNull(),
          createdBy: integer('created_by'),
        }, (table) => [
          unique().on(table.proposalId, table.createdBy),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'vote', columns: 'createdBy' } }],
    },
    {
      name: 'a named unique covering a nullable column',
      filename: tablesFile,
      code: `
        export const event = governanceSchema.table('event', {
          recurringEventId: integer('recurring_event_id'),
          startTime: timestamp().notNull(),
        }, (table) => [
          unique('event_recurring_event_id_start_time_unique').on(table.recurringEventId, table.startTime),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'event', columns: 'recurringEventId' } }],
    },
    {
      name: 'a unique where both covered columns are nullable names both',
      filename: tablesFile,
      code: `
        export const rsvp = governanceSchema.table('rsvp', {
          eventId: integer('event_id'),
          membershipId: integer('membership_id'),
        }, (table) => [
          unique().on(table.eventId, table.membershipId),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'rsvp', columns: 'eventId, membershipId' } }],
    },
    {
      name: 'a single column unique on a nullable column when the option turns the allowance off',
      filename: tablesFile,
      options: [{ allowSingleColumn: false }],
      code: `
        export const collective = governanceSchema.table('collective', {
          guildId: varchar('guild_id'),
        }, (table) => [
          unique().on(table.guildId),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'collective', columns: 'guildId' } }],
    },
    {
      name: 'a uniqueIndex covering a nullable column',
      filename: tablesFile,
      options: [{ allowSingleColumn: false }],
      code: `
        export const vote = governanceSchema.table('vote', {
          createdBy: integer('created_by'),
        }, (table) => [
          uniqueIndex('vote_created_by_idx').on(table.createdBy),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'vote', columns: 'createdBy' } }],
    },
    {
      name: 'a constraint list returned from a block bodied callback',
      filename: tablesFile,
      options: [{ allowSingleColumn: false }],
      code: `
        export const vote = governanceSchema.table('vote', {
          createdBy: integer('created_by'),
        }, (table) => {
          return [unique().on(table.createdBy)]
        })
      `,
      errors: [{ messageId: 'nullable', data: { table: 'vote', columns: 'createdBy' } }],
    },
    {
      name: 'a bare pgTable call',
      filename: tablesFile,
      options: [{ allowSingleColumn: false }],
      code: `
        export const rsvp = pgTable('rsvp', {
          eventId: integer('event_id'),
        }, (table) => [
          unique().on(table.eventId),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'rsvp', columns: 'eventId' } }],
    },
    {
      name: 'a custom files glob replaces the default',
      filename: otherFile,
      options: [{ files: '**/*.queries.ts' }],
      code: `
        export const vote = governanceSchema.table('vote', {
          proposalId: integer('proposal_id').notNull(),
          createdBy: integer('created_by'),
        }, (table) => [
          unique().on(table.proposalId, table.createdBy),
        ])
      `,
      errors: [{ messageId: 'nullable', data: { table: 'vote', columns: 'createdBy' } }],
    },
  ],
})
