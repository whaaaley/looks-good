// Every rule is documented as a README section, so its anchor is the rule name.
const base = 'https://github.com/whaaaley/looks-good/blob/main/README.md'

export const docUrl = (name: string): string => {
  return `${base}#${name}`
}
