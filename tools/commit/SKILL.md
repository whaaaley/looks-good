Rule: run `deno task install-hooks` once per fresh clone
Reason: points `core.hooksPath` at `tools/commit/hooks` so every commit is checked automatically

Rule: rely on the installed hooks rather than running the validator by hand
Reason: the same validator runs on every commit, so a manual pass duplicates the check

Rule: do not pass `--no-verify` to `git commit`
Reason: bypasses both hooks and lets a malformed message or a failing lint reach history

Rule: expect `pre-commit` to run `deno task lint` and `deno task test` before the commit lands
Reason: a commit that fails either would break the next checkout

Rule: format messages as `<type>[(<scope>)]: <description>`
Reason: required by the validator's parser

Rule: use only the types and scopes listed in `commit.config.ts`
Reason: the validator names the accepted vocabulary in its error output

Rule: start the description with a lowercase letter
Reason: conventional commit format

Rule: do not end the description with `.` `!` `,` `;` or `:`
Reason: conventional commit format

Rule: keep the subject within 72 characters
Reason: the length limit lives in `commit.config.ts`

Rule: do not use the breaking-change indicator `!`
Reason: the parser rejects it, so a `BREAKING CHANGE:` footer carries that instead

Rule: expect a merge or revert subject to pass unchecked
Reason: git generates those, and rewriting them would fight the tool that wrote them

Rule: keep the vocabulary in `commit.config.ts`, the checks in `commit.validator.ts`, and the IO in `commit.ts`
Reason: the validator tests without permissions while the entry owns the only file read
