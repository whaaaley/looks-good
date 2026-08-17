Rule: expect this tool to run itself from the `PostToolUse` hook in `.claude/settings.json`, not from the command line
Reason: it reads a Claude Code hook payload on stdin, so a bare invocation with no payload does nothing

Rule: keep this tool out of `tools/hooks/`
Reason: that directory is `core.hooksPath` and belongs to git, while this fires on the agent's tool calls and belongs to Claude Code

Rule: expect the hook to fire only on `Write` and `Edit`
Reason: the matcher is the exact list `Write|Edit`, so Bash, Read, and Grep never reach it

Rule: expect one message per severity tier entered, not one per edit
Reason: the tier already announced is stored between runs, so staying inside it says nothing

Rule: expect the tiers `notice`, `warning`, and `urgent` at 12, 25, and 40 files or 400, 900, and 1500 changed lines
Reason: the list lives in `uncommitted.config.ts`, and either count trips a tier on its own

Rule: expect a tree that reaches two tiers at once to announce only the tier it reached
Reason: the tiers describe one tree, so naming every tier below the current one repeats the same fact

Rule: expect a tier to speak again after the tree drops below it and climbs back
Reason: the stored tier follows the tree down, so committing the work rearms every tier above what is left

Rule: expect a new session to re-announce the tier the tree is already in
Reason: the state records the session that wrote it, so a fresh session has not been told yet

Rule: read the state at `.claude/treesize.state.json` when the throttle behaves unexpectedly
Reason: it holds the session id and the announced tier, which together explain any silence

Rule: do not commit `.claude/treesize.state.json`
Reason: it is per-session scratch state, and `.gitignore` already excludes it

Rule: expect an unreadable or corrupt state file to cost one repeated message rather than an error
Reason: the parser falls back to a blank state, which announces the current tier once and then settles

Rule: expect the hook to exit 0 and print nothing when git is missing, the directory is not a repository, or the payload is malformed
Reason: a warning that broke the edit it followed would cost more than the advice is worth

Rule: expect the message on stdout as a `systemMessage` JSON field, with the same text repeated on stderr
Reason: `systemMessage` is the documented way a `PostToolUse` hook surfaces text, and stderr keeps the tool readable when run by hand

Rule: keep `--quiet` on the `deno task` invocation in the hook command
Reason: `deno task` otherwise echoes the command to stdout, which would corrupt the JSON the hook is expected to emit

Rule: keep the thresholds in `uncommitted.config.ts`, the tier logic in `treesize.tier.ts`, the throttle state in `treesize.state.ts`, and the IO in `treesize.ts`
Reason: the tier and state modules test without permissions while the entry owns the only calls to git and the only file writes

Rule: change the hook to `PreToolUse` and exit 2 to refuse the edit rather than advise on it
Reason: exit 2 blocks the tool call, which turns a size warning into a hard stop and needs a deliberate decision
