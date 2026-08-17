// Where the tool looks for prose and what it refuses to read as prose.

export const includeGlobs = ['**/*.md']

// A directory whose markdown is not ours to hold to the convention.
export const excludeDirectories = ['node_modules', '.git', 'coverage', 'deleted']

// The remedy is always the same, so the finding carries it rather than each call site repeating it.
export const remedy = 'Start a new sentence instead of joining the clauses with a dash.'
