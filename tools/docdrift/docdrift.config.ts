// Where the tool reads the code and the docs it compares.

// Read as one document, since the rules table and the sections it links to sit in different files.
export const docPaths = [
  'README.md',
  'docs/rules.md',
  'docs/configs.md',
  'docs/eslint-rules.md',
  'docs/result-helper.md',
]

// Headings at this depth name a rule, so a heading of any other depth is prose structure.
export const ruleHeadingDepth = 3

// Headings under a rule that open its options table.
export const optionsHeading = '#### Options'

// Prose sections written at rule depth that document no rule and must not be read as one.
// Every prose section is written at a shallower depth, so nothing is exempt today.
export const nonRuleHeadings: string[] = []
