type SafeSuccess<T> = {
  data: T
  error: null
}

type SafeError = {
  data: null
  error: Error
}

export type SafeResult<T> = SafeSuccess<T> | SafeError

// A thrown value is not always an Error, so a non Error is wrapped rather than passed through.
const toError = (thrown: unknown): Error => {
  return thrown instanceof Error ? thrown : new Error(String(thrown))
}

export const safe = <T>(fn: () => T): SafeResult<T> => {
  try {
    return {
      data: fn(),
      error: null,
    }
  } catch (thrown) {
    return {
      data: null,
      error: toError(thrown),
    }
  }
}

export const safeAsync = async <T>(fn: () => Promise<T>): Promise<SafeResult<T>> => {
  try {
    return {
      data: await fn(),
      error: null,
    }
  } catch (thrown) {
    return {
      data: null,
      error: toError(thrown),
    }
  }
}
