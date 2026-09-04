# Voice analysis

Build a voice template from the user's own writing so Terse preserves
how they sound rather than only fixing flags. The Terse draft and edit skills
offer this flow when no approved template exists. The template is a
contract: the user signs it off before any skill treats it as their
voice.

Workflow:

1. Resolve the samples directory from the user's request. Read every
   prose file in it (markdown, text); skip code and generated files.
   Fewer than three samples or under about 1,500 words total is a
   thin corpus: say so and continue only if the user confirms.
2. Measure the mechanical profile with `style-check.mjs --json`.
   Record the average sentence length and its spread (from
   `stats.sentenceLengths`), plus the document grade. Add the rates
   of adverbs, passive voice, and qualifiers per thousand words.
   These are the numbers the template records as observed, not
   aspirational.
3. Read the samples for the voice on the page: typical sentence
   openers and connectors, paragraph length, formatting habits, and
   vocabulary register. Note recurring phrases, how the author
   handles hedging and emphasis, first or third person, and
   contractions.
4. Draft `voice.md` in the project's `.terse/` directory (create it)
   with:
   - frontmatter: `status: draft`, sample sources, date
   - the mechanical profile as measured numbers
   - the qualitative profile as short declarative traits, each with one
     quoted example from the samples as evidence
   - an exceptions section for the Terse rules this voice overrides
     on purpose. An author who uses em dashes stays an author who
     uses em dashes; record that here, and the edit gate stops
     flagging it
   - the mechanical half of those exceptions as `.terse/config.json`,
     which the checker reads. `maxGrade` takes the measured grade.
     `ignore` lists the categories the voice keeps, as `em-dash` or
     one finding as `ai-tell:bold-label bullets`. `targets` holds
     measured rates above the defaults: `passivePerKword`,
     `adverbsPerKword`, `qualifiersPerKword`. The hook and the CLI
     then honor the voice without the model in the loop
5. Present the draft trait by trait and ask what to keep, change, or
   drop. The sign-off is the point: never mark the template approved on
   your own judgment.
6. On approval, set `status: approved` in the frontmatter and write
   the config file. Tell the user both locations and that
   the Terse draft and edit skills, the hook, and the `style` skill
   will now honor them.

How the skills use the template:

- The edit gate: exceptions suppress matching findings, and measured
  ranges bound every rewrite. A 12-word-average author does not get
  30-word rewrites.
- The Terse draft skill: the expansion lands inside the measured ranges.
- The skills ignore a `draft` template and say so when they skip it.

Verification:

- [ ] The mechanical profile came from the checker's JSON output, not
      estimation.
- [ ] Every qualitative trait carries a quoted example from the samples.
- [ ] The user's approval was explicit; `approved` was never set
      unprompted.
- [ ] The exceptions section exists, even if empty.
