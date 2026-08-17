import { describe, it } from 'node:test'
import * as tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule from './max-destructured-parameters.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester({ languageOptions: { parser: tsParser } })

tester.run('max-destructured-parameters', rule, {
  valid: [
    // Destructuring in the body is the form the rule asks for.
    { code: 'const read = (options: Options): void => { const { a, b } = options }' },
    // Named parameters introduce no destructuring.
    { code: 'const read = (a: string, b: string): void => {}' },
    { code: 'const read = (): void => {}' },
    // A default value on a named parameter is not a destructure.
    { code: 'const read = (a: string = "x"): void => {}' },
    // A rest parameter that is a plain name is not a destructure.
    { code: 'const read = (...values: string[]): void => {}' },
    // A raised max admits a pattern with that many bindings.
    {
      code: 'const read = ({ a, b }: Options): void => {}',
      options: [{ max: 2 }],
    },
    // The bound is inclusive, so a single binding passes at a max of one.
    {
      code: 'const read = ({ a }: Options): void => {}',
      options: [{ max: 1 }],
    },
    // A nested pattern counts the names it introduces, which is one here.
    {
      code: 'const read = ({ a: { b } }: Options): void => {}',
      options: [{ max: 1 }],
    },
  ],
  invalid: [
    // Any destructuring reports at the default max of zero.
    {
      code: 'const read = ({ a }: Options): void => {}',
      errors: [{ messageId: 'none' }],
    },
    {
      code: 'const read = ({ a, b, c }: Options): void => {}',
      errors: [{ messageId: 'none' }],
    },
    // An array pattern destructures as much as an object pattern does.
    {
      code: 'const read = ([first]: string[]): void => {}',
      errors: [{ messageId: 'none' }],
    },
    // A raised max reports the count and the bound once the pattern goes over.
    {
      code: 'const read = ({ a, b, c }: Options): void => {}',
      options: [{ max: 2 }],
      errors: [{ messageId: 'above', data: { count: '3', max: '2' } }],
    },
    // A nested pattern counts its leaves, so this introduces two names.
    {
      code: 'const read = ({ a, b: { c } }: Options): void => {}',
      options: [{ max: 1 }],
      errors: [{ messageId: 'above', data: { count: '2', max: '1' } }],
    },
    // A rest element is a binding like any other.
    {
      code: 'const read = ({ a, ...rest }: Options): void => {}',
      options: [{ max: 1 }],
      errors: [{ messageId: 'above', data: { count: '2', max: '1' } }],
    },
    // A default value inside the pattern still introduces one name.
    {
      code: 'const read = ({ a = 1 }: Options): void => {}',
      errors: [{ messageId: 'none' }],
    },
    // A destructured parameter carrying its own default is still a destructure.
    {
      code: 'const read = ({ a }: Options = {}): void => {}',
      errors: [{ messageId: 'none' }],
    },
    // Each destructured parameter is reported on its own.
    {
      code: 'const read = ({ a }: A, { b }: B): void => {}',
      errors: [{ messageId: 'none' }, { messageId: 'none' }],
    },
    // A function declaration and a function expression hold parameters the same way.
    {
      code: 'function read({ a }: Options): void {}',
      errors: [{ messageId: 'none' }],
    },
    {
      code: 'const read = function ({ a }: Options): void {}',
      errors: [{ messageId: 'none' }],
    },
    // A class method parameter is a parameter.
    {
      code: 'class Reader { read({ a }: Options): void {} }',
      errors: [{ messageId: 'none' }],
    },
    // An object method parameter is a parameter.
    {
      code: 'const reader = { read({ a }: Options): void {} }',
      errors: [{ messageId: 'none' }],
    },
  ],
})
