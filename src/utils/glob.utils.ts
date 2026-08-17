export const escapeRegExp = (source: string): string => {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A glob segment is literal apart from `*`, which stands for any run of characters.
// `**` and `*` both cross directory separators, since a path glob here is matched against a whole path.
export const globToRegExp = (glob: string): RegExp => {
  const body = glob
    .split(/\*+/)
    .map((part) => escapeRegExp(part))
    .join('.*')

  return new RegExp(`^${body}$`, 'u')
}
