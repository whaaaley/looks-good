import { describe, it } from 'node:test'
import { assertEquals } from '@std/assert'
import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule, { bareNamePattern, blankTextPattern, parentSpecifierPattern, scopedNamePattern, siblingSpecifierPattern } from './import-group-order.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
})

// The configuration this rule was ported to serve, pinned so every case reads against the same options.
const options = [{
  newlinesBetween: 'never',
  alphabetize: { order: 'asc', caseInsensitive: true, orderImportKind: 'asc' },
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
}]

tester.run('import-group-order', rule, {
  valid: [
    // The group order the options name, walked from builtin down to type.
    { code: "import fs from 'node:fs'\nimport { z } from 'zod'\nimport a from '../a.ts'\nimport b from './b.ts'\nimport type { C } from './c.ts'", options },
    // A single import has nothing to sit out of order against.
    { code: "import { z } from 'zod'", options },
    // A file with no imports at all.
    { code: 'const value = 1', options },
    // Alphabetical order within one group.
    { code: "import { a } from 'aaa'\nimport { b } from 'bbb'\nimport { c } from 'ccc'", options },
    // Case is folded before comparing, so an uppercase name sorts by its lowercase spelling.
    { code: "import { a } from 'Alpha'\nimport { b } from 'beta'", options },
    // A shallower path sorts above a deeper one sharing its prefix.
    { code: "import a from './a.ts'\nimport b from './nested/b.ts'", options },
    // Deno's registry schemes name a supplier, so they sort as external.
    { code: "import { a } from 'npm:aaa'\nimport { b } from './b.ts'", options },
    // A node: builtin sorts above every package.
    { code: "import fs from 'node:fs'\nimport { z } from 'zod'", options },
    // A bare builtin name is a builtin too.
    { code: "import path from 'path'\nimport { z } from 'zod'", options },
    // A value import sorts above a type import of the same path.
    { code: "import { a } from './a.ts'\nimport type { A } from './a.ts'", options },
    // An unassigned import carries no specifier, so the rule leaves it where it is.
    { code: "import './side-effect.ts'\nimport { a } from 'aaa'", options },
    // Imports written against each other carry no gap to report.
    { code: "import { a } from 'aaa'\nimport { b } from './b.ts'", options },
    // A comment line between two imports holds text, so it is not the blank line this rule closes.
    { code: "import { a } from 'aaa'\n// Names the sibling.\nimport { b } from './b.ts'", options },
  ],
  invalid: [
    // The shape that prompted this rule, with a sibling written above a package.
    {
      code: "import b from './b.ts'\nimport { z } from 'zod'",
      output: "import { z } from 'zod'\nimport b from './b.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // One import above two it should follow reports once, from the shorter direction.
    {
      code: "import a from './a.ts'\nimport { x } from 'xxx'\nimport { y } from 'yyy'",
      output: "import { x } from 'xxx'\nimport { y } from 'yyy'\nimport a from './a.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // Two packages out of alphabetical order inside one group.
    {
      code: "import { b } from 'bbb'\nimport { a } from 'aaa'",
      output: "import { a } from 'aaa'\nimport { b } from 'bbb'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A builtin written below a package.
    {
      code: "import { z } from 'zod'\nimport fs from 'node:fs'",
      output: "import fs from 'node:fs'\nimport { z } from 'zod'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A type import belongs to the type group, so it sorts below every value import.
    {
      code: "import type { A } from './a.ts'\nimport { b } from './b.ts'",
      output: "import { b } from './b.ts'\nimport type { A } from './a.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A blank line between imports closes under newlines-between never.
    {
      code: "import { a } from 'aaa'\n\nimport b from './b.ts'",
      output: "import { a } from 'aaa'\nimport b from './b.ts'",
      options,
      errors: [{ messageId: 'gap' }],
    },
    // A comment written on its own line stays where it is, so it does not follow the import below it.
    {
      code: "// Names the sibling.\nimport b from './b.ts'\nimport { z } from 'zod'",
      output: "// Names the sibling.\nimport { z } from 'zod'\nimport b from './b.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A comment written on the same line as an import travels with it too.
    {
      code: "import b from './b.ts' // Names the sibling.\nimport { z } from 'zod'",
      output: "import { z } from 'zod'\nimport b from './b.ts' // Names the sibling.\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A parent import written below a sibling.
    {
      code: "import b from './b.ts'\nimport a from '../a.ts'",
      output: "import a from '../a.ts'\nimport b from './b.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // An index import sorts below a sibling.
    {
      code: "import i from '.'\nimport b from './b.ts'",
      output: "import b from './b.ts'\nimport i from '.'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A './index' specifier is index rather than sibling, so it sorts below a sibling it would alphabetize above.
    {
      code: "import i from './index'\nimport z from './z.ts'",
      output: "import z from './z.ts'\nimport i from './index'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A comment on the line after an import stays behind when the import above it moves.
    {
      code: "import b from './b.ts'\nimport { z } from 'zod'\n// note",
      output: "import { z } from 'zod'\nimport b from './b.ts'\n// note",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A block comment ending on the import's own line spans lines, so it does not travel with the import.
    {
      code: "/* a\nb */ import b from './b.ts'\nimport { z } from 'zod'",
      output: "/* a\nb */import { z } from 'zod'\n import b from './b.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // A gap holding a comment line still reports, but the fix is withheld since the text is not ours to remove.
    {
      code: "import { a } from 'aaa'\n\n// note\nimport b from './b.ts'",
      output: null,
      options,
      errors: [{ messageId: 'gap' }],
    },
    // A deeper parent path sorts below a sibling, which the depth tiebreak settles.
    {
      code: "import type { A } from '../../core/a.ts'\nimport type { B } from './b.ts'",
      output: "import type { B } from './b.ts'\nimport type { A } from '../../core/a.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // An alias opening on a symbol matches no group, so it lands in the unknown group below every named one.
    {
      code: "import { a } from '$shared/a.ts'\nimport { b } from './b.ts'",
      output: "import { b } from './b.ts'\nimport { a } from '$shared/a.ts'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
    // Alphabetical order is compared case insensitively under this option.
    {
      code: "import { b } from 'Beta'\nimport { a } from 'alpha'",
      output: "import { a } from 'alpha'\nimport { b } from 'Beta'\n",
      options,
      errors: [{ messageId: 'order' }],
    },
  ],
})

describe('All Import Group Order Pattern Tests', () => {
  describe('bareNamePattern', () => {
    it('matches a plain package name', () => {
      // Act
      const matched = bareNamePattern.test('eslint')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a relative specifier', () => {
      // Act
      const matched = bareNamePattern.test('./sibling.ts')

      // Assert
      assertEquals(matched, false)
    })

    it('does not match an empty specifier', () => {
      // Act
      const matched = bareNamePattern.test('')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('scopedNamePattern', () => {
    it('matches a scoped package name', () => {
      // Act
      const matched = scopedNamePattern.test('@std/assert')

      // Assert
      assertEquals(matched, true)
    })

    it('matches a scope written without a subpath', () => {
      // Act
      const matched = scopedNamePattern.test('@std')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a scope sigil on its own', () => {
      // Act
      const matched = scopedNamePattern.test('@')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('parentSpecifierPattern', () => {
    it('matches a bare parent specifier', () => {
      // Act
      const matched = parentSpecifierPattern.test('..')

      // Assert
      assertEquals(matched, true)
    })

    it('matches a parent path with a forward slash', () => {
      // Act
      const matched = parentSpecifierPattern.test('../utils/docs.utils.ts')

      // Assert
      assertEquals(matched, true)
    })

    it('matches a parent path with a backslash', () => {
      // Act
      const matched = parentSpecifierPattern.test('..\\utils\\docs.utils.ts')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a sibling specifier', () => {
      // Act
      const matched = parentSpecifierPattern.test('./sibling.ts')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('siblingSpecifierPattern', () => {
    it('matches a sibling path', () => {
      // Act
      const matched = siblingSpecifierPattern.test('./sibling.ts')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match a bare dot', () => {
      // Act
      const matched = siblingSpecifierPattern.test('.')

      // Assert
      assertEquals(matched, false)
    })
  })

  describe('blankTextPattern', () => {
    it('matches an empty string', () => {
      // Act
      const matched = blankTextPattern.test('')

      // Assert
      assertEquals(matched, true)
    })

    it('matches newlines and spaces', () => {
      // Act
      const matched = blankTextPattern.test('\n  \n')

      // Assert
      assertEquals(matched, true)
    })

    it('does not match text holding a comment', () => {
      // Act
      const matched = blankTextPattern.test('\n// a note\n')

      // Assert
      assertEquals(matched, false)
    })
  })
})
