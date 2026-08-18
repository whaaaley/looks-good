import { nonRuleHeadings, optionsHeading, ruleHeadingDepth } from './docdrift.config.ts'

// Compares what the code registers against what the README documents.
// Only structural correspondence is checked, never whether the prose is accurate.

export type Docs = {
  ruleHeadings: string[]
  tableRows: string[]
  configMentions: string[]
  optionsByRule: Record<string, string[]>
}

export type Code = {
  ruleNames: string[]
  configNames: string[]
  schemaOptionsByRule: Record<string, string[]>
}

const missingFrom = (expected: string[], found: string[]): string[] => {
  const known = new Set(found)

  return expected.filter((name) => !known.has(name))
}

const list = (names: string[]): string => {
  return names.join(', ')
}

// A rule heading names a rule only when it is not one of the prose sections written at the same depth.
export const ruleHeadingsIn = (markdown: string): string[] => {
  const prefix = `${'#'.repeat(ruleHeadingDepth)} `
  const prose = new Set(nonRuleHeadings)
  const headings: string[] = []

  for (const line of markdown.split('\n')) {
    if (!line.startsWith(prefix)) continue

    const title = line.slice(prefix.length).trim()

    if (prose.has(title)) continue

    headings.push(title)
  }

  return headings
}

// The rules table links each row to the section anchor, so the link target names the rule.
// The table and the sections sit in different files, so a link may carry a path before the anchor.
export const tableRowsIn = (markdown: string): string[] => {
  const rows: string[] = []
  const pattern = /^\| \[([a-z-]+)\]\([a-z0-9./-]*#([a-z-]+)\)/ // Captures a table row's rule name and anchor.

  for (const line of markdown.split('\n')) {
    const found = pattern.exec(line)

    if (!found) continue

    const [, name] = found

    if (!name) continue

    rows.push(name)
  }

  return rows
}

// An options table row opens with the option name in backticks, so the first cell names it.
export const optionsByRuleIn = (markdown: string): Record<string, string[]> => {
  const prefix = `${'#'.repeat(ruleHeadingDepth)} `
  const prose = new Set(nonRuleHeadings)
  const options: Record<string, string[]> = {}

  let current = ''
  let inOptions = false

  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ') && !line.startsWith(prefix)) {
      current = ''
      inOptions = false
      continue
    }

    if (line.startsWith(prefix)) {
      const title = line.slice(prefix.length).trim()

      current = prose.has(title) ? '' : title
      inOptions = false
      continue
    }

    if (line.trim() === optionsHeading) {
      inOptions = true
      continue
    }

    // A deeper heading after the options table closes it, so later tables are not read as options.
    if (line.startsWith('#### ') && line.trim() !== optionsHeading) {
      inOptions = false
      continue
    }

    if (!inOptions || !current) continue

    const found = /^\| `([A-Za-z]+)` \|/.exec(line)

    if (!found) continue

    const [, option] = found

    if (!option) continue

    const seen = options[current] ?? []

    seen.push(option)
    options[current] = seen
  }

  return options
}

export const check = (code: Code, docs: Docs): string[] => {
  const lines: string[] = []

  const undocumented = missingFrom(code.ruleNames, docs.ruleHeadings)
  const orphaned = missingFrom(docs.ruleHeadings, code.ruleNames)

  if (undocumented.length > 0) {
    lines.push(`No README section for: ${list(undocumented)}`)
  }

  if (orphaned.length > 0) {
    lines.push(`README section for a rule that no longer exists: ${list(orphaned)}`)
  }

  const unlisted = missingFrom(code.ruleNames, docs.tableRows)
  const staleRows = missingFrom(docs.tableRows, code.ruleNames)

  if (unlisted.length > 0) {
    lines.push(`Missing from the README rules table: ${list(unlisted)}`)
  }

  if (staleRows.length > 0) {
    lines.push(`README rules table lists a rule that no longer exists: ${list(staleRows)}`)
  }

  const undocumentedConfigs = missingFrom(code.configNames, docs.configMentions)
  const staleConfigs = missingFrom(docs.configMentions, code.configNames)

  if (undocumentedConfigs.length > 0) {
    lines.push(`Config not mentioned in the README: ${list(undocumentedConfigs)}`)
  }

  if (staleConfigs.length > 0) {
    lines.push(`README describes a config that no longer exists: ${list(staleConfigs)}`)
  }

  // A rule with no section at all is already reported above, so its options are not compared again.
  const documented = new Set(docs.ruleHeadings)

  for (const name of code.ruleNames) {
    if (!documented.has(name)) continue

    const inSchema = code.schemaOptionsByRule[name] ?? []
    const inDocs = docs.optionsByRule[name] ?? []

    const missingOptions = missingFrom(inSchema, inDocs)
    const staleOptions = missingFrom(inDocs, inSchema)

    if (missingOptions.length > 0) {
      lines.push(`${name} has undocumented options: ${list(missingOptions)}`)
    }

    if (staleOptions.length > 0) {
      lines.push(`${name} documents options its schema does not accept: ${list(staleOptions)}`)
    }
  }

  if (lines.length === 0) return []

  return [
    'reminder: the README has drifted from the code.',
    ...lines,
    'Update README.md so it matches what the plugin registers.',
  ]
}
