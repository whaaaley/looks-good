// A pattern comes from user configuration, so a typo in it is a configuration problem rather than a crash.
export const compilePattern = ({ source, flags }: { source: string; flags: string }): RegExp | null => {
  try {
    return new RegExp(source, flags)
  } catch {
    return null
  }
}
