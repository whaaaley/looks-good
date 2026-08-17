import { parseArgs } from '@std/cli/parse-args'
import { check } from './uncommitted.check.ts'

const printHelp = (): void => {
  console.log([
    'usage: deno task uncommitted',
    '',
    'Warns when the tracked working tree holds more uncommitted work than the',
    'thresholds in uncommitted.config.ts allow. Untracked files are not counted.',
    '',
    'options:',
    '  -h, --help  print this message',
  ].join('\n'))
}

const git = async (args: string[]): Promise<string> => {
  const command = new Deno.Command('git', { args, stdout: 'piped', stderr: 'null' })
  const { code, stdout } = await command.output()

  // A git failure leaves the tree uncountable, so the caller reports nothing rather than guessing.
  if (code !== 0) return ''

  return new TextDecoder().decode(stdout)
}

// A shortstat line names only its nonzero parts, as in "3 files changed, 12 insertions(+)".
const countIn = (shortstat: string, noun: string): number => {
  const found = new RegExp(`(\\d+) ${noun}`).exec(shortstat)

  if (!found) return 0

  const [, digits] = found

  if (!digits) return 0

  return Number(digits)
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

  const names = await git(['diff', '--name-only', 'HEAD', '--'])
  const shortstat = await git(['diff', '--shortstat', 'HEAD', '--'])

  const fileCount = names.split('\n').filter((line) => line.length > 0).length

  const warning = check({
    fileCount,
    insertions: countIn(shortstat, 'insertion'),
    deletions: countIn(shortstat, 'deletion'),
  })

  for (const line of warning) {
    console.error(line)
  }
}

await main()

// A warning is advice, so the hooks that run this are never failed by it.
Deno.exit(0)
