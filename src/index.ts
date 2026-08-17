import commentContent from './rules/comment-content.ts'
import commentOneSentencePerLine from './rules/comment-one-sentence-per-line.ts'
import commentReflow from './rules/comment-reflow.ts'
import type { ESLint, Linter } from 'eslint'

// Rules that report and never rewrite.
// A violation here needs a person or an agent to decide what the text should say.
const reporting = {
  'comment-content': commentContent,
  'comment-one-sentence-per-line': commentOneSentencePerLine,
}

// Rules that rewrite under --fix.
// A violation here moves text without changing what it says.
const fixing = {
  'comment-reflow': commentReflow,
}

const rules = {
  ...reporting,
  ...fixing,
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
    // ---- reporting ----
    'looks-good/comment-content': 'error',
    'looks-good/comment-one-sentence-per-line': 'error',

    // ---- fixing ----
    'looks-good/comment-reflow': 'error',
  },
}

export default plugin
