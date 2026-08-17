import { type Tier, tiers } from '../uncommitted/uncommitted.config.ts'
import type { Changes } from '../uncommitted/uncommitted.check.ts'

// Decides which severity tier a working tree has reached, and whether that tier is worth announcing.

export type Announcement = {
  tier: string
  lines: string[]
}

const guidance: Record<string, string[]> = {
  notice: [
    'Split the finished part of this work into its own commit before going further.',
    'Run git status to see what is left.',
  ],
  warning: [
    'This is past the size a reviewer can read in one pass.',
    'Commit the parts that already stand on their own before writing anything new.',
  ],
  urgent: [
    'Stop adding to this tree and commit what is finished.',
    'Work this large stops being reviewable, and a single mistake now costs all of it.',
  ],
}

const plural = (count: number, noun: string): string => {
  return count === 1 ? `${count} ${noun}` : `${count} ${noun}s`
}

export const tierFor = (changes: Changes): Tier | null => {
  const { fileCount, insertions, deletions } = changes
  const lineCount = insertions + deletions

  let reached: Tier | null = null

  for (const tier of tiers) {
    if (fileCount >= tier.files || lineCount >= tier.lines) reached = tier
  }

  return reached
}

// A tier's rank is its position in the ordered list, and an unreached tree ranks below all of them.
export const rankOf = (name: string): number => {
  return tiers.findIndex((tier) => tier.name === name)
}

const describe = (tier: Tier, changes: Changes): string => {
  const { fileCount, insertions, deletions } = changes
  const lineCount = insertions + deletions

  const filesTripped = fileCount >= tier.files
  const linesTripped = lineCount >= tier.lines

  const files = plural(fileCount, 'file')
  const lines = plural(lineCount, 'changed line')

  if (filesTripped && linesTripped) return `${files} and ${lines}`
  if (filesTripped) return files

  return lines
}

export type Decision = {
  announcement: Announcement | null
  nextAnnounced: string
}

// The stored tier is the one a tree has reached, so falling to a lower tier lowers it and lets that tier speak again.

export const decide = (changes: Changes, lastAnnounced: string): Decision => {
  const reached = tierFor(changes)

  if (!reached) {
    return { announcement: null, nextAnnounced: '' }
  }

  const nextAnnounced = reached.name

  // Staying inside the announced tier says nothing new, and a drop was already absorbed by the rank falling.
  if (rankOf(reached.name) <= rankOf(lastAnnounced)) {
    return { announcement: null, nextAnnounced }
  }

  const headline = `${reached.name}: ${describe(reached, changes)} are uncommitted.`

  const announcement = {
    tier: reached.name,
    lines: [headline, ...(guidance[reached.name] ?? [])],
  }

  return { announcement, nextAnnounced }
}
