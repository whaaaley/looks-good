// Where the tool reads the code and the docs it compares.

export const readmePath = 'README.md'

// Headings at this depth name a rule, so a heading of any other depth is prose structure.
export const ruleHeadingDepth = 3

// Headings under a rule that open its options table.
export const optionsHeading = '#### Options'

// Prose sections written at rule depth that document no rule and must not be read as one.
export const nonRuleHeadings = [
  'Rules that were removed',
  'A result helper instead of try/catch',
  'Every rule listed out',
  'The typescript config',
]
