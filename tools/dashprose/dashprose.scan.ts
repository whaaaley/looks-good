import { remedy } from './dashprose.config.ts'

// Finds a dash used as sentence punctuation in markdown prose.
// Syntax that merely contains a dash is not punctuation, so a fence, a code span, a flag, and a rule line are all skipped.

export type Finding = {
  file: string
  line: number
  column: number
  dash: string
  text: string
  message: string
}

// An em dash and an en dash are punctuation wherever they appear, since neither has a syntactic use in markdown.
const unicodeDash = /[—–]/g

// Two hyphens are the ASCII stand-in, and only the spaced form is punctuation.
// A flag binds its dashes to the word after it, and a table separator or a rule runs three or more.
const asciiDash = /(?<=\s)--(?=\s)/g

// A fence opens and closes with the same marker, so the tool tracks which side of one it is on.
const fenceMarker = /^\s*(```|~~~)/

// A row of pipes and dashes separates a table header from its body.
const tableSeparator = /^\s*\|[\s|:-]+\|\s*$/

// Three or more dashes alone on a line are a horizontal rule, or the delimiter around frontmatter.
const ruleOrDelimiter = /^\s*-{3,}\s*$/

// A code span is syntax rather than prose, so its contents are blanked before the line is scanned.
// The replacement keeps the line's length so every reported column still points at the real character.
const withoutCodeSpans = (line: string): string => {
  return line.replace(/`[^`]*`/g, (span) => ' '.repeat(span.length))
}

// A link target is syntax, and a path or query string may legitimately hold a double hyphen.
const withoutLinkTargets = (line: string): string => {
  return line.replace(/\]\([^)]*\)/g, (target) => ' '.repeat(target.length))
}

// A bare url outside a link is still a target rather than prose.
const withoutUrls = (line: string): string => {
  return line.replace(/https?:\/\/\S+/g, (url) => ' '.repeat(url.length))
}

const isSyntaxLine = (line: string): boolean => {
  return tableSeparator.test(line) || ruleOrDelimiter.test(line)
}

const findingsIn = (file: string, line: string, number: number): Finding[] => {
  const found: Finding[] = []

  if (isSyntaxLine(line)) return found

  const prose = withoutUrls(withoutLinkTargets(withoutCodeSpans(line)))

  for (const pattern of [unicodeDash, asciiDash]) {
    for (const match of prose.matchAll(pattern)) {
      const [dash] = match

      found.push({ file, line: number, column: match.index + 1, dash, text: line.trim(), message: remedy })
    }
  }

  return found
}

export const scanMarkdown = (file: string, text: string): Finding[] => {
  const found: Finding[] = []
  let fenced = false

  text.split('\n').forEach((line, index) => {
    // A fence line toggles the block and is never prose itself, on either side.
    if (fenceMarker.test(line)) {
      fenced = !fenced
      return
    }

    if (fenced) return

    found.push(...findingsIn(file, line, index + 1))
  })

  return found
}

export const formatFinding = (finding: Finding): string => {
  return `${finding.file}:${finding.line}:${finding.column} ${finding.message}`
}
