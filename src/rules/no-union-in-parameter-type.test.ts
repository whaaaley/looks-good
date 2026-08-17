import { describe, it } from 'node:test'
import * as tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule from './no-union-in-parameter-type.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester({ languageOptions: { parser: tsParser } })

tester.run('no-union-in-parameter-type', rule, {
  valid: [
    // A named alias is the form the rule asks for.
    { code: 'const read = (mode: Mode): void => {}' },
    // A single type is not a union.
    { code: 'const read = (value: string): void => {}' },
    // A union in a type alias is where the rule wants unions to live.
    { code: "type Mode = 'a' | 'b'" },
    // A variable annotation is not a parameter.
    { code: 'const value: string | number = 1' },
    // The rule is about parameters, so a return type union is left alone.
    { code: 'const read = (): string | number => 1' },
    { code: 'function read(): string | number { return 1 }' },
    // A union inside a type argument annotates the type reference, not the parameter itself.
    { code: 'const read = (values: Array<string | number>): void => {}' },
    // The parameter of a callback type belongs to a type rather than a function being written.
    { code: 'const read = (cb: (value: string | number) => void): void => {}' },
    // A union in a property of an inline object type is not the parameter annotation.
    { code: 'const read = (options: { mode: string | number }): void => {}' },
    // A body level destructure is not a parameter annotation.
    { code: 'const read = (options: Options): void => { const { a }: { a: string } | { a: number } = options }' },
    // The nullable exemption is opt in and covers a two member union with null.
    {
      code: 'const read = (value: string | null): void => {}',
      options: [{ allowNullable: true }],
    },
    {
      code: 'const read = (value: string | undefined): void => {}',
      options: [{ allowNullable: true }],
    },
  ],
  invalid: [
    // A literal union in a parameter is the case the rule exists for.
    {
      code: "const read = (mode: 'a' | 'b'): void => {}",
      errors: [{ messageId: 'inline' }],
    },
    // A union of primitives reads no better than a union of literals.
    {
      code: 'const read = (value: string | number): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // A destructured parameter still carries its annotation on the pattern.
    {
      code: 'const read = ({ a }: { x: string } | { y: number }): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // An array pattern annotates the same way.
    {
      code: 'const read = ([first]: string[] | number[]): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // An optional parameter is still a parameter.
    {
      code: 'const read = (value?: string | number): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // A default value wraps the binding in an assignment pattern, which still sits in the parameter slot.
    {
      code: 'const read = (value: string | number = 1): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // A rest parameter annotates an array of the union.
    {
      code: 'const read = (...values: (string | number)[]): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // A function declaration and a function expression hold parameters the same way.
    {
      code: 'function read(value: string | number): void {}',
      errors: [{ messageId: 'inline' }],
    },
    {
      code: 'const read = function (value: string | number): void {}',
      errors: [{ messageId: 'inline' }],
    },
    // A class method parameter is a parameter.
    {
      code: 'class Reader { read(value: string | number): void {} }',
      errors: [{ messageId: 'inline' }],
    },
    // A constructor parameter property wraps the binding and still reports.
    {
      code: 'class Reader { constructor(private value: string | number) {} }',
      errors: [{ messageId: 'inline' }],
    },
    // An object method parameter is a parameter.
    {
      code: 'const reader = { read(value: string | number): void {} }',
      errors: [{ messageId: 'inline' }],
    },
    // Each parameter is checked on its own.
    {
      code: 'const read = (mode: string | number, other: string | boolean): void => {}',
      errors: [{ messageId: 'inline' }, { messageId: 'inline' }],
    },
    // The nullable exemption is off by default.
    {
      code: 'const read = (value: string | null): void => {}',
      errors: [{ messageId: 'inline' }],
    },
    // The exemption covers only a two member union, so a wider union still reports.
    {
      code: 'const read = (value: string | number | null): void => {}',
      options: [{ allowNullable: true }],
      errors: [{ messageId: 'inline' }],
    },
  ],
})
