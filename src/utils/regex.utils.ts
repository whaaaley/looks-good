export type PatternSource = {
  source: string
  flags: string
}

// A pattern comes from user configuration, so a typo in it is a configuration problem rather than a crash.
export const compilePattern = (pattern: PatternSource): RegExp | null => {
  const { source, flags } = pattern

  try {
    return new RegExp(source, flags)
  } catch {
    return null
  }
}
