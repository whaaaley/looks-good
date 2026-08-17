import { validate } from './commit.validator.ts'

const subjectOf = (message: string): string => {
  const [first] = message.split('\n')

  return (first ?? '').trim()
}

const main = async (): Promise<void> => {
  const [path] = Deno.args

  if (!path) {
    console.error('error: commit-msg needs the path to the message file')
    Deno.exit(1)
  }

  const message = await Deno.readTextFile(path)
  const failures = validate(message)

  if (failures.length === 0) Deno.exit(0)

  console.error(`error: ${subjectOf(message)}`)

  for (const failure of failures) {
    console.error(`  ${failure.rule}: ${failure.detail}`)
  }

  Deno.exit(1)
}

await main()

Deno.exit(0)
