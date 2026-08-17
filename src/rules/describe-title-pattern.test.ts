import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './describe-title-pattern.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const domain = [{ files: '*.queries.test.ts', title: 'All * Tests' }]

const layered = [
  { files: '*.security.test.ts', title: '* Security Tests', message: 'A security file names the domain it defends.' },
  { files: '*.test.ts', title: 'All * Tests' },
]

tester.run('describe-title-pattern', rule, {
  valid: [
    // A title matching the pattern for its path.
    {
      code: "describe('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // A describe inside a helper is nested, even though traversal reaches it first.
    {
      code: "const shared = () => describe('shared cases', () => {})\ndescribe('All Event Tests', () => { shared() })",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // A wildcard standing in for several words.
    {
      code: "describe('All Recurring Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // A file matching no files pattern is not checked, so it needs no describe at all.
    {
      code: 'export const helper = 1',
      filename: 'event.utils.ts',
      options: [{ patterns: domain }],
    },
    // No patterns configured leaves every file alone.
    {
      code: 'export const helper = 1',
      filename: 'event.queries.test.ts',
    },
    // A nested describe carries no title requirement of its own.
    {
      code: [
        "describe('All Event Tests', () => {",
        "  describe('create', () => {})",
        '})',
      ].join('\n'),
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // describe.only is still the top level describe.
    {
      code: "describe.only('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // describe.skip is too.
    {
      code: "describe.skip('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
    },
    // A title on the allow list is exempt from the pattern.
    {
      code: "describe('slugify', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, allowTitles: ['^[a-z]'] }],
    },
    // A wildcard at the start of the pattern.
    {
      code: "describe('Event Security Tests', () => {})",
      filename: 'event.security.test.ts',
      options: [{ patterns: [{ files: '*.security.test.ts', title: '* Security Tests' }] }],
    },
    // A wildcard at the end of the pattern.
    {
      code: "describe('Tests for the event router', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: [{ files: '*.queries.test.ts', title: 'Tests for *' }] }],
    },
    // The first matching entry wins, so the security file is held to the security pattern.
    {
      code: "describe('Event Security Tests', () => {})",
      filename: 'event.security.test.ts',
      options: [{ patterns: layered }],
    },
    // The later entry still governs a file the first does not match.
    {
      code: "describe('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: layered }],
    },
    // A custom describe name is checked once it is named.
    {
      code: "suite('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, testFunctions: ['suite'] }],
    },
    // A pattern holding regex metacharacters matches them literally.
    {
      code: "describe('add(a, b) [unit]', () => {})",
      filename: 'add.queries.test.ts',
      options: [{ patterns: [{ files: '*.queries.test.ts', title: 'add(a, b) [unit]' }] }],
    },
    // A directory glob scopes the pattern to one tree.
    {
      code: "describe('All Event Tests', () => {})",
      filename: 'src/apps/governance/event/event.queries.test.ts',
      options: [{ patterns: [{ files: 'src/apps/**/*.test.ts', title: 'All * Tests' }] }],
    },
  ],
  invalid: [
    // A title missing the required prefix.
    {
      code: "describe('Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch', data: { title: 'Event Tests', pattern: 'All * Tests', message: '' } }],
    },
    // A title missing the required suffix.
    {
      code: "describe('All Event', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch' }],
    },
    // The pattern is anchored, so extra text around a match still reports.
    {
      code: "describe('Really All Event Tests Here', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch' }],
    },
    // A file with no describe at all names nothing.
    {
      code: [
        "it('adds two numbers', () => {",
        '  assertEquals(add(1, 2), 3)',
        '})',
      ].join('\n'),
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'missing', data: { function: 'describe', pattern: 'All * Tests', message: '' }, line: 1 }],
    },
    // An empty file names nothing either.
    {
      code: '',
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'missing' }],
    },
    // Only the outermost describe is checked, so a correct nested title does not rescue the outer one.
    {
      code: [
        "describe('Event', () => {",
        "  describe('All Event Tests', () => {})",
        '})',
      ].join('\n'),
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch', data: { title: 'Event', pattern: 'All * Tests', message: '' }, line: 1 }],
    },
    // describe.only is held to the pattern like any other.
    {
      code: "describe.only('Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch' }],
    },
    // A title off the allow list still reports.
    {
      code: "describe('Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, allowTitles: ['^[a-z]'] }],
      errors: [{ messageId: 'mismatch' }],
    },
    // The first matching entry wins, so the security file is not judged by the broader pattern.
    {
      code: "describe('All Event Tests', () => {})",
      filename: 'event.security.test.ts',
      options: [{ patterns: layered }],
      errors: [
        {
          messageId: 'mismatch',
          data: { title: 'All Event Tests', pattern: '* Security Tests', message: ' A security file names the domain it defends.' },
        },
      ],
    },
    // The wildcard is not raw regex, so a dot in the pattern matches only a dot.
    {
      code: "describe('addXb', () => {})",
      filename: 'add.queries.test.ts',
      options: [{ patterns: [{ files: '*.queries.test.ts', title: 'add.b' }] }],
      errors: [{ messageId: 'mismatch' }],
    },
    // A pattern holding regex metacharacters reports a title that does not hold them.
    {
      code: "describe('add a b unit', () => {})",
      filename: 'add.queries.test.ts',
      options: [{ patterns: [{ files: '*.queries.test.ts', title: 'add(a, b) [unit]' }] }],
      errors: [{ messageId: 'mismatch' }],
    },
    // A custom describe name reports under its own label when the file has none.
    {
      code: 'export const helper = 1',
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, testFunctions: ['suite'] }],
      errors: [{ messageId: 'missing', data: { function: 'suite', pattern: 'All * Tests', message: '' } }],
    },
  ],
})
