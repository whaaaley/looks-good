import { safe } from './safe.utils.ts'

export type PatternSource = {
  source: string
  flags: string
}

// A pattern comes from user configuration, so a typo in it is a configuration problem rather than a crash.
export const compilePattern = (pattern: PatternSource): RegExp | null => {
  const { data, error } = safe(() => new RegExp(pattern.source, pattern.flags))

  if (error) return null

  return data
}
