import commentOneSentencePerLine from './rules/comment-one-sentence-per-line.ts'
import commentReflow from './rules/comment-reflow.ts'
import type { ESLint, Linter } from 'eslint'

const rules = {
  'comment-one-sentence-per-line': commentOneSentencePerLine,
  'comment-reflow': commentReflow,
}

export const plugin: ESLint.Plugin = {
  meta: {
    name: 'looks-good',
    version: '0.1.0',
  },
  rules,
}

// A consumer spreads this into a flat config, and every rule reads as looks-good/<name>.
export const recommended: Linter.Config = {
  plugins: {
    'looks-good': plugin,
  },
  rules: {
    'looks-good/comment-one-sentence-per-line': 'error',
  },
}

export default plugin
