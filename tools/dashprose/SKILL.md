Rule: check markdown for dashes used as punctuation with `deno task dashprose`
Reason: reports the em dash, the en dash, and the spaced double hyphen wherever prose uses one to join two clauses

Rule: pass paths to scope a run, and pass none to walk every markdown file in the repo
Reason: a scoped run is for iterating on one document, and the bare run is what the hook does

Rule: start a new sentence where a finding points, rather than reaching for a semicolon or a comma
Reason: the dash was joining two clauses that each stand on their own, so splitting them is the remedy the convention asks for

Rule: do not expect the tool to rewrite anything
Reason: deciding where the sentence breaks is a judgement about meaning, so there is no fix to apply mechanically

Rule: expect nothing at all when no markdown uses a dash as punctuation
Reason: a reminder that prints on every commit stops being read, so silence is the normal outcome

Rule: expect the task to exit 0 even when it reports a dash
Reason: this is a house style rather than a defect, so a commit is never failed by it

Rule: rely on the `pre-commit` hook rather than running the task by hand
Reason: a dash is worth catching in the commit that introduces it, which is when the hook fires

Rule: run `deno task install-hooks` once per fresh clone
Reason: points `core.hooksPath` at `tools/hooks`, where `pre-commit` runs this alongside the lint and the tests

Rule: expect a flag like `--dry-run` to be ignored wherever it appears
Reason: a flag binds its dashes to the word after it, so the spaced form is the only one that can be punctuation

Rule: expect a table separator row, a horizontal rule, and a frontmatter delimiter to be ignored
Reason: each runs three or more dashes or stands alone on its line, and neither shape is the punctuation form

Rule: expect a fenced block, a code span, a url, and a link target to be ignored
Reason: all four are syntax, and a double hyphen inside one is part of a command or an address rather than prose

Rule: write a bare `--` in backticks when prose has to name the shell end-of-options marker or a SQL comment
Reason: those are the two spellings that read as punctuation to the scanner, and a code span is how the document says it means the token

Rule: keep the paths and the remedy in `dashprose.config.ts`, the scanning in `dashprose.scan.ts`, and the IO in `dashprose.ts`
Reason: the scan tests without permissions while the entry owns the only directory walk and the only file read

Rule: do not add this to the ESLint plugin
Reason: ESLint parses no markdown without `@eslint/markdown`, and a rule that reached only TypeScript comments would miss every document the convention is about
