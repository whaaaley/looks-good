import { describe, it } from 'node:test'
import * as tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule from './no-try-catch-handler.ts'

// RuleTester drives its own suite, so pointing it at node:test reports each case as a step.
RuleTester.describe = describe as never
RuleTester.it = it as never

const tester = new RuleTester({
  languageOptions: { parser: tsParser },
})

const configured = [{ module: '~/utils/safe.utils.ts', sync: 'safe', async: 'safeAsync' }]

tester.run('no-try-catch-handler', rule, {
  valid: [
    // A try with only a finally clause guarantees cleanup, which a result helper has no channel for.
    { code: 'const read = (): void => { try { work() } finally { close() } }' },
    // Code that already guards on a returned error has no try at all.
    { code: 'const read = (): void => { const { error } = safe(() => work()); if (error) return }' },
    // The helper itself is exempted by config rather than by the rule.
    { code: 'const read = (): void => { work() }' },
  ],
  invalid: [
    // A sync function names the sync helper.
    {
      code: 'const read = (): void => { try { work() } catch (error) { report(error) } }',
      errors: [{ messageId: 'helper', data: { helper: 'safe' } }],
    },
    // An async function names the async helper.
    {
      code: 'const read = async (): Promise<void> => { try { await work() } catch (error) { report(error) } }',
      errors: [{ messageId: 'helper', data: { helper: 'safeAsync' } }],
    },
    // A catch with a finally clause still has a handler.
    {
      code: 'const read = (): void => { try { work() } catch (error) { report(error) } finally { close() } }',
      errors: [{ messageId: 'helper', data: { helper: 'safe' } }],
    },
    // The nearest enclosing function decides, so a sync callback inside an async one names the sync helper.
    {
      code: 'const read = async (): Promise<void> => { run(() => { try { work() } catch (error) { report(error) } }) }',
      errors: [{ messageId: 'helper', data: { helper: 'safe' } }],
    },
    // A try nested in an if still walks out to its enclosing function.
    {
      code: 'const read = async (): Promise<void> => { if (ready) { try { await work() } catch (error) { report(error) } } }',
      errors: [{ messageId: 'helper', data: { helper: 'safeAsync' } }],
    },
    // A module body can hold a top level await, so a try outside any function is treated as async.
    {
      code: 'try { await work() } catch (error) { report(error) }',
      errors: [{ messageId: 'helper', data: { helper: 'safeAsync' } }],
    },
    // A configured module puts the import path in the message.
    {
      code: 'const read = async (): Promise<void> => { try { await work() } catch (error) { report(error) } }',
      options: configured,
      errors: [{ messageId: 'helperFrom', data: { helper: 'safeAsync', module: '~/utils/safe.utils.ts' } }],
    },
    {
      code: 'const read = (): void => { try { work() } catch (error) { report(error) } }',
      options: configured,
      errors: [{ messageId: 'helperFrom', data: { helper: 'safe', module: '~/utils/safe.utils.ts' } }],
    },
    // Helper names are configurable independently of the module path.
    {
      code: 'const read = (): void => { try { work() } catch (error) { report(error) } }',
      options: [{ sync: 'attempt', async: 'attemptAsync' }],
      errors: [{ messageId: 'helper', data: { helper: 'attempt' } }],
    },
  ],
})
