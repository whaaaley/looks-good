Rule: check the docs against the code with `deno task docdrift`
Reason: reports where README.md no longer matches the rules, configs, and options the plugin registers

Rule: rely on the `post-commit` hook rather than running the task by hand
Reason: drift is worth catching right after the commit that introduced it, which is when the hook fires

Rule: run `deno task install-hooks` once per fresh clone
Reason: points `core.hooksPath` at `tools/hooks`, where `post-commit` runs this alongside `uncommitted`

Rule: expect nothing at all when the docs are in sync
Reason: a reminder that prints on every commit stops being read, so silence is the normal outcome

Rule: expect every registered rule to have a `### <rule-name>` section in the README
Reason: a rule with no section leaves its `meta.docs.url` pointing at an anchor that does not exist

Rule: expect every README rule section to name a rule that still exists
Reason: a deleted rule leaves its section behind, and the section reads as current until someone notices

Rule: expect every rule to appear both as a section and as a row in the README rules table
Reason: the table and the sections are two lists of the same set, so either one can fall behind the other

Rule: expect every config on `plugin.configs` to be named in the README, and no removed config to still be described
Reason: `fixing` was described for a while after it was removed, which the mention check now catches

Rule: expect a rule's documented options to match the property names in its `meta.schema`
Reason: the entry reads the real schema object off the imported plugin, so a renamed option is caught without parsing source

Rule: read the reminder as naming the specific rules and configs that drifted
Reason: a count says nothing actionable, so every finding lists the names behind it

Rule: add a prose section written at rule depth to `nonRuleHeadings` in `docdrift.config.ts`
Reason: a `###` heading that documents no rule would otherwise be read as a rule with no implementation

Rule: keep the `--allow-env=__MINIMATCH_TESTING_PLATFORM__` grant on the task
Reason: importing the plugin pulls in `minimatch`, which reads that one variable at module load and fails the run without it

Rule: expect the task to exit 0 even when it reports drift
Reason: this is a reminder rather than a gate, so a commit is never failed by it

Rule: do not expect any check on prose accuracy
Reason: only structural correspondence is mechanical enough to check without false positives

Rule: keep the paths and prose exceptions in `docdrift.config.ts`, the comparison in `docdrift.check.ts`, and the IO in `docdrift.ts`
Reason: the check tests without permissions while the entry owns the only file read and the only plugin import
