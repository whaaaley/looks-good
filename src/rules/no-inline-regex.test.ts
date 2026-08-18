import { describe, it } from 'node:test'
import * as tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule from './no-inline-regex.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('no-inline-regex', rule, {
  valid: [
    // The shape the rule asks for.
    { code: 'const trailing = /\\s+$/u' },
    // Exported the same way, since the export wraps the declaration it still reads as module level.
    { code: 'export const trailing = /\\s+$/u' },
    // A static RegExp construction hoisted the same way.
    { code: "const trailing = new RegExp('\\\\s+$', 'u')" },
    // A pattern built from a runtime value cannot be hoisted, so it is left alone wherever it sits.
    { code: 'const match = (body) => new RegExp(`^${body}$`, "u")' },
    // A pattern read from a variable is dynamic for the same reason.
    { code: 'const match = (source) => new RegExp(source, "u")' },
    // A member expression argument is dynamic too.
    { code: 'const match = (options) => new RegExp(options.pattern)' },
    // A call named something other than RegExp is not this rule to judge.
    { code: 'const value = () => new Matcher("^a$")' },
    // A pattern declared below a function is scattered, which the default position does not judge.
    { code: 'const read = () => 1\nconst trailing = /\\s+$/u' },
    // Under 'top' a pattern above everything else is what the option asks for.
    {
      code: 'const trailing = /\\s+$/u\nconst read = () => trailing',
      options: [{ position: 'top' }],
    },
    // Imports sit above the patterns, since the option does not ask for patterns above imports.
    {
      code: "import { docUrl } from './docs.ts'\nconst trailing = /\\s+$/u\nconst read = () => trailing",
      options: [{ position: 'top' }],
    },
    // A run of patterns is unbroken by the patterns beside it.
    {
      code: 'const bare = /^\\w/u\nconst scoped = /^@/u\nconst read = () => bare',
      options: [{ position: 'top' }],
    },
    // An exported pattern reads at Program level through its export.
    {
      code: 'export const trailing = /\\s+$/u\nconst read = () => trailing',
      options: [{ position: 'top' }],
    },
  ],
  invalid: [
    // A regex in a function body is compiled on every call and reads as an unnamed constant.
    {
      code: 'const indent = (line) => line.match(/^\\s*/u)',
      errors: [{ messageId: 'inline' }],
    },
    // A call argument is the most common inline position.
    {
      code: "const collapse = (text) => text.replace(/\\n\\s*\\n/gu, '\\n')",
      errors: [{ messageId: 'inline' }],
    },
    // A static RegExp construction inline is the same defect written the long way.
    {
      code: "const check = (text) => new RegExp('^a$', 'u').test(text)",
      errors: [{ messageId: 'inline' }],
    },
    // A conditional is not a declaration.
    {
      code: 'const check = (text) => { if (/^a$/u.test(text)) return true; return false }',
      errors: [{ messageId: 'inline' }],
    },
    // A nested block does not make the declaration module level.
    {
      code: 'const run = () => { const trailing = /\\s+$/u; return trailing }',
      errors: [{ messageId: 'inline' }],
    },
    // A module-level let is not a const, so the binding can be reassigned and the name stops meaning one pattern.
    {
      code: 'let trailing = /\\s+$/u',
      errors: [{ messageId: 'inline' }],
    },
    // A module-level var carries the same reassignment problem.
    {
      code: 'var trailing = /\\s+$/u',
      errors: [{ messageId: 'inline' }],
    },
    // A regex inside an object literal has no name of its own, so the collection is hoisted but the pattern is not.
    {
      code: 'const patterns = { a: /x/u, b: /y/u }',
      errors: [{ messageId: 'inline' }, { messageId: 'inline' }],
    },
    // An array literal holds patterns the same anonymous way.
    {
      code: 'const patterns = [/x/u, /y/u]',
      errors: [{ messageId: 'inline' }, { messageId: 'inline' }],
    },
    // A class field is not a module-level declaration.
    {
      code: 'class Reader { trailing = /\\s+$/u }',
      errors: [{ messageId: 'inline' }],
    },
    // The case that passes under the default position and fails under 'top'.
    {
      code: 'const read = () => 1\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
      errors: [{ messageId: 'scattered' }],
    },
    // A non-pattern const breaks the run the same way a function does.
    {
      code: "const groupNames = ['builtin']\nconst trailing = /\\s+$/u",
      options: [{ position: 'top' }],
      errors: [{ messageId: 'scattered' }],
    },
    // Only the pattern below the break is reported, since the one above it still opens the file.
    {
      code: 'const bare = /^\\w/u\nconst read = () => 1\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
      errors: [{ messageId: 'scattered' }],
    },
    // A collection reports the pattern inside it as inline.
    // It still counts as a pattern declaration for the run below it.
    {
      code: 'const grouped = { a: /x/u }\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
      errors: [{ messageId: 'inline' }],
    },
    // An inline pattern is still inline under 'top', which reports the position it is in rather than the run.
    {
      code: 'const indent = (line) => line.match(/^\\s*/u)',
      options: [{ position: 'top' }],
      errors: [{ messageId: 'inline' }],
    },
  ],
})

// A type declaration is a TypeScript node the default parser never produces.
const typedTester = new RuleTester({
  languageOptions: { parser: tsParser },
})

typedTester.run('no-inline-regex', rule, {
  valid: [
    // The types then patterns layout the codebase already uses.
    {
      code: 'type Mode = "a" | "b"\nconst trailing = /\\s+$/u\nconst read = () => trailing',
      options: [{ position: 'top' }],
    },
    // An interface sits in the same band as a type alias.
    {
      code: 'interface Options { mode: string }\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
    },
    // An exported type does not break the run either.
    {
      code: 'export type Mode = "a"\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
    },
  ],
  invalid: [
    // A type below a function does not rescue the pattern under it.
    {
      code: 'const read = () => 1\ntype Mode = "a"\nconst trailing = /\\s+$/u',
      options: [{ position: 'top' }],
      errors: [{ messageId: 'scattered' }],
    },
  ],
})
