import process from 'node:process'
import { describe, it } from 'node:test'
import { assertEquals, assertThrows } from '@std/assert'
import { Linter, RuleTester } from 'eslint'
import rule, { titleFlags, titlePatternFor } from './describe-title-pattern.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

const domain = [{ files: '*.queries.test.ts', title: 'All * Tests' }]

// ESLint relativizes an absolute path against the cwd before matching, so a tree glob is written relative to it.
const absolute = `${process.cwd()}/src/apps/governance/event/event.queries.test.ts`

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
    // A describe inside a function declaration is nested too.
    {
      code: "function shared() { describe('shared cases', () => {}) }\ndescribe('All Event Tests', () => { shared() })",
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
    // The first top level describe wins, so a later sibling with a different title stays unchecked.
    {
      code: "describe('All Event Tests', () => {})\ndescribe('leftovers', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
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
    // An absolute path relativized against the cwd still matches a tree glob.
    {
      code: "describe('All Event Tests', () => {})",
      filename: absolute,
      options: [{ patterns: [{ files: 'src/apps/**/*.test.ts', title: 'All * Tests' }] }],
    },
  ],
  invalid: [
    // A bad title under an absolute path proves the tree glob matched rather than silently missing.
    {
      code: "describe('Event Tests', () => {})",
      filename: absolute,
      options: [{ patterns: [{ files: 'src/apps/**/*.test.ts', title: 'All * Tests' }] }],
      errors: [{ messageId: 'mismatch' }],
    },
    // A title missing the required prefix.
    {
      code: "describe('Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain }],
      errors: [{ messageId: 'mismatch', data: { function: 'describe', title: 'Event Tests', pattern: 'All * Tests', message: '' } }],
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
      errors: [{ messageId: 'mismatch', data: { function: 'describe', title: 'Event', pattern: 'All * Tests', message: '' }, line: 1 }],
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
          data: { function: 'describe', title: 'All Event Tests', pattern: '* Security Tests', message: ' A security file names the domain it defends.' },
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
    // The mismatch names the function actually called, not the first configured one.
    {
      code: "suite('Bad Title', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, testFunctions: ['describe', 'suite'] }],
      errors: [{ messageId: 'mismatch', data: { function: 'suite', title: 'Bad Title', pattern: 'All * Tests', message: '' } }],
    },
    // An allowTitles entry that does not compile reports as a configuration problem rather than crashing the run.
    {
      code: "describe('All Event Tests', () => {})",
      filename: 'event.queries.test.ts',
      options: [{ patterns: domain, allowTitles: ['(['] }],
      errors: [{ messageId: 'invalidPattern', data: { source: '([' } }],
    },
    // A file matching no files pattern still reports a configuration problem.
    {
      code: 'export const helper = 1',
      filename: 'event.utils.ts',
      options: [{ patterns: domain, allowTitles: ['(['] }],
      errors: [{ messageId: 'invalidPattern', data: { source: '([' } }],
    },
  ],
})

describe('All Describe Title Pattern Tests', () => {
  describe('titlePatternFor', () => {
    it('matches a title filling the wildcard', () => {
      // Arrange
      const expected = titlePatternFor('All * Tests')

      // Act
      const matched = expected.test('All Event Tests')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a title missing the wildcard text', () => {
      // Arrange
      const expected = titlePatternFor('All * Tests')

      // Act
      const matched = expected.test('All Tests')

      // Assert
      assertEquals(matched, false)
    })

    it('does not match a title with text past the pattern', () => {
      // Arrange
      const expected = titlePatternFor('All * Tests')

      // Act
      const matched = expected.test('All Event Tests Extra')

      // Assert
      assertEquals(matched, false)
    })

    it('treats regular expression syntax in the pattern as literal text', () => {
      // Arrange
      const expected = titlePatternFor('add(a, b) [unit]')

      // Act
      const matched = expected.test('add(a, b) [unit]')

      // Assert
      assertEquals(matched, true)
    })

    it('matches a unicode title through the wildcard', () => {
      // Arrange
      const expected = titlePatternFor('All * Tests')

      // Act
      const matched = expected.test('All Événement Tests')

      // Assert
      assertEquals(matched, true)
    })

    it('matches only an empty title when the pattern is empty', () => {
      // Arrange
      const expected = titlePatternFor('')

      // Act
      const matched = expected.test('')

      // Assert
      assertEquals(matched, true)
    })

    it('spans several wildcards in one pattern', () => {
      // Arrange
      const expected = titlePatternFor('All * * Tests')

      // Act
      const matched = expected.test('All Event Queries Tests')

      // Assert
      assertEquals(matched, true)
    })

    it('does not span a newline through a wildcard', () => {
      // Arrange
      const expected = titlePatternFor('All * Tests')

      // Act
      const matched = expected.test('All Event\nQueries Tests')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('options schema', () => {
    it('rejects an empty testFunctions list', () => {
      // Arrange
      const linter = new Linter()
      const config = {
        plugins: { local: { rules: { 'describe-title-pattern': rule } } },
        rules: { 'local/describe-title-pattern': ['error', { testFunctions: [] }] },
      } as never

      // An empty list would leave the missing message with no function name.
      // Act
      const run = (): void => void linter.verify('', config)

      // Assert
      assertThrows(run)
    })
  })

  describe('titleFlags', () => {
    it('compiles the pattern in unicode mode', () => {
      // Act
      const flags = titlePatternFor('All * Tests').flags

      // Assert
      assertEquals(flags, titleFlags)
    })
  })
})
