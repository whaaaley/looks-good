import { dirname, join } from '@std/path'
import { empty, parse, serialize, type State } from './treesize.state.ts'
import { decide } from './treesize.tier.ts'

// Reads a Claude Code PostToolUse payload on stdin and describes the working tree when it enters a new size tier.
// Every failure path here exits 0 in silence, because a warning must never cost the edit that triggered it.

const statePath = (root: string): string => {
  return join(root, '.claude', 'treesize.state.json')
}

const git = async (root: string, args: string[]): Promise<string> => {
  const command = new Deno.Command('git', { args, cwd: root, stdout: 'piped', stderr: 'null' })

  try {
    const { code, stdout } = await command.output()

    if (code !== 0) return ''

    return new TextDecoder().decode(stdout)
  } catch {
    return ''
  }
}

// A shortstat line names only its nonzero parts, as in "3 files changed, 12 insertions(+)".
const countIn = (shortstat: string, noun: string): number => {
  const found = new RegExp(`(\\d+) ${noun}`).exec(shortstat)

  if (!found) return 0

  const [, digits] = found

  if (!digits) return 0

  return Number(digits)
}

const readState = async (path: string, sessionId: string): Promise<State> => {
  try {
    return parse(await Deno.readTextFile(path), sessionId)
  } catch {
    return empty
  }
}

const writeState = async (path: string, state: State): Promise<void> => {
  try {
    await Deno.mkdir(dirname(path), { recursive: true })
    await Deno.writeTextFile(path, serialize(state))
  } catch {
    return
  }
}

type Payload = {
  toolName: string
  sessionId: string
  cwd: string
}

const stringAt = (source: object, key: string): string => {
  if (!(key in source)) return ''

  const found: unknown = Reflect.get(source, key)

  if (typeof found !== 'string') return ''

  return found
}

const readPayload = async (): Promise<Payload> => {
  const blank = { toolName: '', sessionId: '', cwd: '' }

  try {
    const raw = await new Response(Deno.stdin.readable).text()
    const parsed: unknown = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return blank

    return {
      toolName: stringAt(parsed, 'tool_name'),
      sessionId: stringAt(parsed, 'session_id'),
      cwd: stringAt(parsed, 'cwd'),
    }
  } catch {
    return blank
  }
}

const main = async (): Promise<void> => {
  const { toolName, sessionId, cwd } = await readPayload()

  if (toolName !== 'Write' && toolName !== 'Edit') return

  const root = cwd.length > 0 ? cwd : Deno.cwd()

  // The two counts are independent, so the subprocesses overlap rather than queue.
  const [names, shortstat] = await Promise.all([
    git(root, ['diff', '--name-only', 'HEAD', '--']),
    git(root, ['diff', '--shortstat', 'HEAD', '--']),
  ])

  const changes = {
    fileCount: names.split('\n').filter((line) => line.length > 0).length,
    insertions: countIn(shortstat, 'insertion'),
    deletions: countIn(shortstat, 'deletion'),
  }

  const path = statePath(root)
  const state = await readState(path, sessionId)
  const { announcement, nextAnnounced } = decide(changes, state.announced)

  if (nextAnnounced !== state.announced) {
    await writeState(path, { sessionId, announced: nextAnnounced })
  }

  if (!announcement) return

  const message = announcement.lines.join('\n')

  // systemMessage on stdout is the documented way a PostToolUse hook surfaces a warning.
  // stderr carries the same text for anyone reading the hook directly.
  console.log(JSON.stringify({ systemMessage: message }))
  console.error(message)
}

try {
  await main()
} catch {
  // An unexpected failure is still not worth interrupting an edit over.
}

Deno.exit(0)
