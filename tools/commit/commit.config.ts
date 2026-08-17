// The vocabulary a commit subject is checked against.
// A type names the kind of change, and a scope names the part of the repository it touches.

export const types = [
  'feat',
  'fix',
  'refactor',
  'test',
  'docs',
  'style',
  'chore',
  'build',
  'ci',
  'perf',
  'revert',
]

// A scope names the part of this repository a change touches.
export const scopes = [
  'rules', // src/rules, the lint rules themselves
  'utils', // src/utils, the helpers a rule reads through
  'plugin', // src/index.ts, how rules are registered and exported
  'config', // deno.json, eslint.config.js, and the editor settings
  'deps', // the dependency set
  'tools', // tools/, including the commit hooks
]

export const maxLength = 72
