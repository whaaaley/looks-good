import { describe, it } from 'node:test'
import { RuleTester } from 'eslint'
import rule from './test-arrange-act-assert.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester()

tester.run('test-arrange-act-assert', rule, {
  valid: [
    // A required label outside the order is recognized wherever it sits.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '',
        '  // Teardown',
        '  reset()',
        '})',
      ].join('\n'),
      options: [{ require: ['Act', 'Assert', 'Teardown'] }],
    },
    // All three labels in order.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Arrange',
        '  const a = 1',
        '  const b = 2',
        '',
        '  // Act',
        '  const total = add(a, b)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
    },
    // Arrange is optional, so Act and Assert alone pass.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
    },
    // An async body is checked the same way.
    {
      code: [
        "it('loads the record', async () => {",
        '  // Act',
        '  const record = await load(1)',
        '',
        '  // Assert',
        '  assertEquals(record.id, 1)',
        '})',
      ].join('\n'),
    },
    // A test declared with test() is a test body too.
    {
      code: [
        "test('adds two numbers', () => {",
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
    },
    // A body inside a describe is reached the same way as one at the top level.
    {
      code: [
        "describe('add', () => {",
        "  it('adds two numbers', () => {",
        '    // Act',
        '    const total = add(1, 2)',
        '',
        '    // Assert',
        '    assertEquals(total, 3)',
        '  })',
        '})',
      ].join('\n'),
    },
    // An empty body has nothing to label.
    { code: "it('is pending', () => {})" },
    // A title on the allow list is exempt entirely.
    {
      code: [
        "it('smoke: the page renders', () => {",
        '  const page = render()',
        '  assertExists(page)',
        '})',
      ].join('\n'),
      options: [{ allowTitles: ['^smoke:'] }],
    },
    // Prose beginning with a label word is not a label.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act on the parsed input rather than the raw text.',
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
    },
    // A call that is not a test function is left alone.
    {
      code: [
        'run(() => {',
        '  const a = 1',
        '  use(a)',
        '})',
      ].join('\n'),
    },
  ],
  invalid: [
    // Arrange and Act with no Assert.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Arrange',
        '  const a = 1',
        '',
        '  // Act',
        '  const total = add(a, 2)',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'missing', data: { label: 'Assert' } }],
    },
    // Arrange and Assert with no Act.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Arrange',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'missing', data: { label: 'Act' } }],
    },
    // A body with no labels at all is missing both required ones.
    {
      code: [
        "it('adds two numbers', () => {",
        '  const total = add(1, 2)',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // Assert placed above Act reads backwards.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Assert',
        '  const expected = 3',
        '',
        '  // Act',
        '  assertEquals(add(1, 2), expected)',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'order', data: { label: 'Act', previous: 'Assert', expected: 'Arrange, then Act, then Assert' }, line: 5 }],
    },
    // Arrange after Act is out of order even though every label is present.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Arrange',
        '  const expected = 3',
        '',
        '  // Assert',
        '  assertEquals(total, expected)',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'order', data: { label: 'Arrange', previous: 'Act', expected: 'Arrange, then Act, then Assert' }, line: 5 }],
    },
    // The same label twice splits one phase in two.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act',
        '  const first = add(1, 2)',
        '',
        '  // Act',
        '  const second = add(2, 3)',
        '',
        '  // Assert',
        '  assertEquals(first + second, 8)',
        '})',
      ].join('\n'),
      errors: [{ messageId: 'duplicate', data: { label: 'Act' }, line: 5 }],
    },
    // A nested body is reported at its own location.
    {
      code: [
        "describe('add', () => {",
        "  it('adds two numbers', () => {",
        '    const total = add(1, 2)',
        '    assertEquals(total, 3)',
        '  })',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' }, line: 2 },
        { messageId: 'missing', data: { label: 'Assert' }, line: 2 },
      ],
    },
    // An async body is held to the same requirement.
    {
      code: [
        "it('loads the record', async () => {",
        '  const record = await load(1)',
        '  assertEquals(record.id, 1)',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // test() is checked alongside it().
    {
      code: [
        "test('adds two numbers', () => {",
        '  const total = add(1, 2)',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // A title off the allow list still reports.
    {
      code: [
        "it('adds two numbers', () => {",
        '  const total = add(1, 2)',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      options: [{ allowTitles: ['^smoke:'] }],
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // A block comment is not a phase label, so it satisfies nothing.
    {
      code: [
        "it('adds two numbers', () => {",
        '  /* Act */',
        '  const total = add(1, 2)',
        '',
        '  /* Assert */',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // A one statement body is a test like any other, so it is labelled like any other.
    {
      code: [
        "it('adds two numbers', () => {",
        '  assertEquals(add(1, 2), 3)',
        '})',
      ].join('\n'),
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // Requiring Arrange as well reports the body that omits it.
    {
      code: [
        "it('adds two numbers', () => {",
        '  // Act',
        '  const total = add(1, 2)',
        '',
        '  // Assert',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      options: [{ require: ['Arrange', 'Act', 'Assert'] }],
      errors: [{ messageId: 'missing', data: { label: 'Arrange' } }],
    },
    // A custom test function is checked once it is named.
    {
      code: [
        "scenario('adds two numbers', () => {",
        '  const total = add(1, 2)',
        '  assertEquals(total, 3)',
        '})',
      ].join('\n'),
      options: [{ testFunctions: ['scenario'] }],
      errors: [
        { messageId: 'missing', data: { label: 'Act' } },
        { messageId: 'missing', data: { label: 'Assert' } },
      ],
    },
    // An allowTitles entry that does not compile reports as a configuration problem rather than crashing the run.
    {
      code: 'export const helper = 1',
      options: [{ allowTitles: ['(['] }],
      errors: [{ messageId: 'invalidPattern', data: { source: '([' } }],
    },
  ],
})
