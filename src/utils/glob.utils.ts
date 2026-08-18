import { relative, resolve, SEPARATOR } from '@std/path'
import { Minimatch } from 'minimatch'

const compiled = new Map<string, Minimatch>()

// ESLint matches config globs with `dot` on and `matchBase` off, so a bare filename never matches a nested path.
const matcherFor = (pattern: string): Minimatch => {
  const cached = compiled.get(pattern)
  if (cached) return cached

  const matcher = new Minimatch(pattern, { dot: true })
  compiled.set(pattern, matcher)

  return matcher
}

// Mirrors `toRelativePath` in @eslint/config-array, which relativizes before matching.
// Leading base-path segments never reach the glob.
const toRelativePath = (filename: string, basePath: string): string => {
  if (!basePath) return filename.replaceAll(SEPARATOR, '/')

  const full = resolve(basePath, filename)

  return relative(basePath, full).replaceAll(SEPARATOR, '/')
}

export const matchesGlob = (pattern: string, filename: string, basePath?: string): boolean => {
  return matcherFor(pattern).match(toRelativePath(filename, basePath ?? ''))
}
