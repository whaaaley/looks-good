// The point at which an uncommitted working tree is large enough to warn about.
// A count at or above either threshold trips the warning.

export const fileThreshold = 12

export const lineThreshold = 400

export type Tier = {
  name: string
  files: number
  lines: number
}

// Ordered from smallest to largest, so the last tier a tree reaches is the one that describes it.
// The first tier restates the thresholds above rather than holding its own copy of them.

export const tiers: Tier[] = [
  { name: 'notice', files: fileThreshold, lines: lineThreshold },
  { name: 'warning', files: 25, lines: 900 },
  { name: 'urgent', files: 40, lines: 1500 },
]
