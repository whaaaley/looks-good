import { parseArgs } from '@std/cli/parse-args'
import { fromFileUrl, join, relative } from '@std/path'
import { excludeDirectories } from './dashprose.config.ts'
import { formatFinding, scanMarkdown } from './dashprose.scan.ts'
import type { Finding } from './dashprose.scan.ts'

const printHelp = (): void => {
  console.log([
    'usage: deno task dashprose [paths...]',
    '',
    'Reports a dash used as sentence punctuation in markdown. An em dash and a',
    'spaced double hyphen are punctuation, so both are reported. A flag, a table',
    'separator, a horizontal rule, a code span, a fenced block, and a url are',
    'syntax, so none of them are.',
    '',
    'The remedy is to start a new sentence, which is a judgement about where the',
    'sentence breaks, so nothing is rewritten.',
    '',
    'options:',
    '  -h, --help  print this message',
  ].join('\n'))
}

const repoRoot = fromFileUrl(new URL('../..', import.meta.url))

const skipped = new Set(excludeDirectories)

const markdownUnder = async (directory: string, found: string[]): Promise<void> => {
  for await (const entry of Deno.readDir(directory)) {
    if (skipped.has(entry.name)) continue

    const path = join(directory, entry.name)

    if (entry.isDirectory) {
      await markdownUnder(path, found)
      continue
    }

    if (entry.name.endsWith('.md')) found.push(path)
  }
}

const collectFiles = async (paths: string[]): Promise<string[]> => {
  if (paths.length === 0) {
    const found: string[] = []
    await markdownUnder(repoRoot, found)

    return found.sort()
  }

  return paths.map((path) => join(repoRoot, path))
}

const main = async (): Promise<void> => {
  const flags = parseArgs(Deno.args, {
    boolean: ['help'],
    alias: { h: 'help' },
  })

  if (flags.help) {
    printHelp()
    Deno.exit(0)
  }

  const files = await collectFiles(flags._.map((value) => String(value)))
  const findings: Finding[] = []

  for (const file of files) {
    const text = await Deno.readTextFile(file)

    findings.push(...scanMarkdown(relative(repoRoot, file), text))
  }

  for (const finding of findings) {
    console.error(formatFinding(finding))
  }

  if (findings.length > 0) {
    console.error(`\n${findings.length} dash used as punctuation`)
  }
}

await main()

// A dash is a house style rather than a defect, so the hook that runs this is never failed by it.
Deno.exit(0)
