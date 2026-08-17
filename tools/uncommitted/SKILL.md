Rule: check the working tree with `deno task uncommitted`
Reason: reports how much tracked work is still uncommitted and warns when it grows past the thresholds

Rule: rely on the `post-commit` and `post-rewrite` hooks rather than running the task by hand
Reason: the warning is worth reading right after a commit lands, which is when the hooks fire

Rule: run `deno task install-hooks` once per fresh clone
Reason: points `core.hooksPath` at `tools/hooks`, where these hooks live alongside `pre-commit` and `commit-msg`

Rule: expect a warning at 12 changed files or 400 changed lines
Reason: the thresholds live in `uncommitted.config.ts` and either one trips the warning on its own

Rule: read the changed-line count as insertions plus deletions
Reason: a rewritten line costs both, so summing them measures the work a reviewer has to read

Rule: expect only tracked changes to be counted
Reason: scratch files would false-positive, and git collapses an untracked directory to a single line that undercounts it

Rule: expect the task to exit 0 even when it warns
Reason: `post-commit` ignores an exit code but `post-checkout` does not, so one honest script suits every hook

Rule: treat the warning as advice rather than a failure to clear before continuing
Reason: it names work worth splitting into focused commits, not an error the tooling can fix

Rule: keep the thresholds in `uncommitted.config.ts`, the wording in `uncommitted.check.ts`, and the IO in `uncommitted.ts`
Reason: the check tests without permissions while the entry owns the only calls to git
