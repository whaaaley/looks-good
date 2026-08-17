import { parseArgs } from '@std/cli/parse-args'
import { fromFileUrl, join } from '@std/path'
import { plugin } from '../../src/index.ts'
import { check, optionsByRuleIn, ruleHeadingsIn, tableRowsIn } from './docdrift.check.ts'
import { readmePath } from './docdrift.config.ts'

const printHelp = (): void => {
  console.log([
    'usage: deno task docdrift',
    '',
    'Reminds you when README.md no longer matches the rules and configs the',
    'plugin registers. Structural correspondence only, never prose accuracy.',
    '',
    'options:',
    '  -h, --help  print this message',
  ].join('\n'))
}

const repoRoot = fromFileUrl(new URL('../..', import.meta.url))

// A rule schema is either a list of option objects or an object holding them, so both shapes are read.
const optionPropertiesOf = (schema: unknown): string[] => {
  if (!schema) return []

  const entries = Array.isArray(schema) ? schema : [schema]
  const names: string[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    const properties = Reflect.get(entry, 'properties')

    if (!properties || typeof properties !== 'object') continue

    names.push(...Object.keys(properties))
  }

  return names
}

const schemaOptions = (): Record<string, string[]> => {
  const options: Record<string, string[]> = {}
  const rules = plugin.rules ?? {}

  for (const [name, rule] of Object.entries(rules)) {
    if (typeof rule === 'function') continue

    options[name] = optionPropertiesOf(rule.meta?.schema)
  }

  return options
}

// A config counts as mentioned when the README names it in backticks or as a configs property.
const configMentionsIn = (markdown: string, names: string[]): string[] => {
  return names.filter((name) => {
    return markdown.includes(`\`${name}\``) || markdown.includes(`configs.${name}`)
  })
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

  const markdown = await Deno.readTextFile(join(repoRoot, readmePath))

  const configNames = Object.keys(plugin.configs ?? {})

  const reminder = check({
    ruleNames: Object.keys(plugin.rules ?? {}),
    configNames,
    schemaOptionsByRule: schemaOptions(),
  }, {
    ruleHeadings: ruleHeadingsIn(markdown),
    tableRows: tableRowsIn(markdown),
    configMentions: configMentionsIn(markdown, configNames),
    optionsByRule: optionsByRuleIn(markdown),
  })

  for (const line of reminder) {
    console.error(line)
  }
}

await main()

// A reminder is advice, so the hook that runs this is never failed by it.
Deno.exit(0)
