// Every rule is documented as a section of the rules page, so its anchor is the rule name.
const base = 'https://github.com/whaaaley/looks-good/blob/main/docs/rules.md'

export const docUrl = (name: string): string => {
  return `${base}#${name}`
}
