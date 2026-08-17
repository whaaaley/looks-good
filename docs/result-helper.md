# Result Helper

This house style goes with a go-style result helper, which keeps the happy path unindented and names the failure at the call site.
`no-try-catch-handler` enforces it, and it is in no shipped config because it points at a helper you have to write first.
Write the helper, then enable the rule with the module path it lives at.

```js
'looks-good/no-try-catch-handler': ['error', { module: '~/utils/safe.utils.ts', sync: 'safe', async: 'safeAsync' }],
```

## The Helper

The rule expects a helper of this shape.

```ts
type SafeSuccess<T> = {
  data: T
  error: null
}

type SafeError = {
  data: null
  error: Error
}

export type SafeResult<T> = SafeSuccess<T> | SafeError

export const safe = <T>(fn: () => T): SafeResult<T> => {
  try {
    const data = fn()
    return {
      data,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

export const safeAsync = async <T>(fn: () => Promise<T>): Promise<SafeResult<T>> => {
  try {
    const data = await fn()
    return {
      data,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
```

## Exempting The Helper

The helper is the one boundary that turns a throw into a returned error, so it holds the `try/catch` the rule forbids.
Exempt the file that defines it.

```js
{
  files: ['src/utils/safe.utils.ts'],
  rules: {
    'looks-good/no-try-catch-handler': 0,
  },
}
```

## Related Docs

- [Rules](rules.md#no-try-catch-handler) - what the rule reports and the options it takes
- [Configs](configs.md) - the shipped configs, none of which enable this rule
