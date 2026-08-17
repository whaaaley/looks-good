# Tools

These are for developing this repository, and are not part of the published plugin.
`deno.json` excludes `tools/` from what JSR publishes.

Each tool keeps its configuration, its logic, and its IO in separate files, so the logic tests without permissions while the entry owns the file reads and the subprocess calls.
Each also carries a `SKILL.md` written for a coding agent working in the repository.

## hooks

`tools/hooks/` holds the git hooks, and `deno task install-hooks` points `core.hooksPath` at it.
Run it once per fresh clone.

| Hook | Runs |
| --- | --- |
| `commit-msg` | the commit message validator |
| `pre-commit` | `deno task lint`, `deno task test`, `deno task dashprose` |
| `post-commit` | `deno task uncommitted`, `deno task docdrift` |
| `post-rewrite` | `deno task uncommitted` |

Only `commit-msg` and `pre-commit` can fail a commit.
The reporting tools that run after a commit are advisory, and the hooks ignore what they exit with.

## commit

`tools/commit/` validates a commit message subject line against the conventional commit format.
It checks the type and scope against the vocabulary in `commit.config.ts`, and it checks the length and the punctuation of the description.
A merge or revert subject passes unchecked, since git wrote it.

The `commit-msg` hook runs it on the message file, so there is no task to invoke it by hand.
When it rejects a message it names the rule that failed and the vocabulary it accepts.

## uncommitted

`tools/uncommitted/` warns after a commit when too much work is still sitting in the working tree.

```sh
deno task uncommitted
```

It counts tracked changes only, and reads the changed-line count as insertions plus deletions.
Either the file count or the line count trips the warning on its own.
The thresholds live in `uncommitted.config.ts`.

It exits 0 whether or not it warns, so it never fails a commit.

## treesize

`tools/treesize/` tells a coding agent to commit once the working tree crosses a size tier.
It measures the same tree as `uncommitted`, and reads its tiers from the same `uncommitted.config.ts`.

It is a Claude Code `PostToolUse` hook rather than a git hook, wired in `.claude/settings.json` and fired on `Write` and `Edit`.
It reads a hook payload on stdin, so running it from the command line does nothing.

It speaks once per tier entered rather than once per edit, throttled through a state file at `.claude/treesize.state.json` that is not committed.
Committing the work lowers the tree back down and rearms the tiers above what is left.

## dashprose

`tools/dashprose/` reports a dash used as punctuation in markdown, meaning the em dash, the en dash, and the spaced double hyphen joining two clauses.

```sh
deno task dashprose
```

Pass paths to scope a run, or none to walk every markdown file in the repository.
It applies no fix, because deciding where the sentence breaks is a judgement about meaning.
The remedy is to start a new sentence where the finding points.

Code spans, fenced blocks, urls, link targets, table separators, horizontal rules, frontmatter delimiters, and command line flags are all skipped.
Silence is the normal outcome, and the task exits 0 either way.

## docdrift

`tools/docdrift/` reports where the documentation has drifted from the rules and configs the plugin actually registers.

```sh
deno task docdrift
```

It imports the plugin and compares it against the documents listed in `docdrift.config.ts`, which it reads as one document because the rules table and the sections it links to sit in different files.
It checks that every registered rule has both a section and a table row, that no section or row names a rule that no longer exists, that every config on `plugin.configs` is named, and that a rule's documented options match the property names in its `meta.schema`.

Every finding names the rules and configs behind it.
It checks structural correspondence only, and makes no claim about whether the prose is accurate.
The task exits 0 either way.

A `###` heading in a listed document is read as a rule name.
A prose section written at that depth goes in `nonRuleHeadings` so it is not read as a rule with no implementation.
This page is not in the list, since it documents no rules.

## Related Docs

- [Rules](https://github.com/whaaaley/looks-good/blob/main/docs/rules.md)
- [Configs](https://github.com/whaaaley/looks-good/blob/main/docs/configs.md)
