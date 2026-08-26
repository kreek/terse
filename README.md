# Terse

Terse is a writing system for Codex and Claude. A document moves through three
phases. You approve an outline, the model expands it into prose, and an edit
pass clears what remains before you publish. A mechanical checker runs at each
phase. It flags hard sentences, passive voice, adverbs, qualifiers, and common
model-writing patterns. The model fixes them while keeping your voice.

## How it works

Two layers:

- **Mechanical** (`scripts/style-check.mjs`): pattern matching, word lists,
  and readability arithmetic. It runs offline with zero dependencies and
  never calls a model. It grades
  each sentence with ARI and flags the hard ones. It flags passive voice,
  adverbs, qualifiers, wordy phrases, long asides, and requirements
  filed as wishes. Em dashes flag too, spaced en dashes included.
  Openings of 90 words or more flag. The AI-tell lexicon covers common
  model-writing families in every inflection, and it is careful with single
  words. A bare word is a tell only when it has no everyday literal
  sense. A word with one flags only in its tell frame: `testament to`
  flags, a last will and testament does not, and a test harness never
  trips `harness the power`. Words with plain synonyms (`robust`,
  `crucial`) sit in the wordy list, where the flag is a suggested
  swap. Document stats cover word count, reading time, and grade.
  Each adverb, passive, and qualifier count gets a length-scaled target.
  The [GPT and Codex research note](docs/research/gpt-writing-tells.md)
  records sources, admission decisions, and false-positive limits.
- **Judgment** (skills): the model fixes what the checker finds. A voice
  playbook governs each fix and knows when a flag is a false alarm. Passive
  voice with an irrelevant actor stays. A hedge that is the point stays. Your em
  dashes stay if your voice template says so.

## Install

### Codex Desktop and CLI

Add the repository marketplace and install Terse from either Codex surface:

```sh
codex plugin marketplace add kreek/terse
codex plugin add terse@terse
```

Restart Codex Desktop after adding the marketplace, then install Terse from
the `terse` source in the Plugins Directory. Start a new task after an install
or update so Codex loads the current skills.

### Claude Code

Keep the existing Claude marketplace and command surface:

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## Skills

Six skills: the complete workflow, its phases, and the rulebook they
share. Codex uses `$terse:*`; Claude keeps `/terse:*`.

| Codex | Claude | What it does |
|---|---|---|
| `$terse:write <subject>` | `/terse:write <subject>` | One request to a finished document: outline, skeleton, expansion, and the edit gate, with two stops for your sign-off. |
| `$terse:brainstorm <topic>` | `/terse:brainstorm <topic>` | The angle before any outline: candidate readers, questions, and governing thoughts, converged to one approved brief. |
| `$terse:outline <subject>` | `/terse:outline <subject>` | Structure first: one claim and a word budget per section, iterated to your sign-off. |
| `$terse:draft <outline or subject>` | `/terse:draft <outline or subject>` | Anything a reader sees, however short: issues, tickets, PR descriptions, emails, ADRs, docs, posts, proposals, or an approved outline expanded. |
| `$terse:edit <file>` | `/terse:edit <file>` | The publish gate: collect every finding, then report or fix in stages. |
| `$terse:style` | `/terse:style` | The rulebook: voice, clarity, readability, and word choice. |

The phases hand off through the outline file, and a brainstorm brief
feeds it when the angle starts unsettled. You approve it
before any prose exists, with each section's claim, budget, and
evidence on record. Write drafts to that file. A section that resists
goes back to the outline, and structural changes need your approval
again. Edit then checks the finished prose against the same record.
Logged deviations stand, undocumented drift is a finding, and every
section must make its assigned claim.

The style skill holds the rules the others follow: plain words,
active voice, the reader's vocabulary. It knows the false alarms that
keep a flag from becoming a bad edit. And because it loads on its own
whenever the model writes or edits prose, everyday document work follows
the same rules without a command.

The edit skill takes direction in chat. It can report only, fix grammar,
change tone, cut 15%, or filter findings by category.

## Your voice

The draft skill offers to learn your voice when no template exists.
Point it at a directory of your writing. The checker measures your
habits as numbers. The model names your traits, each with a quoted
example. The result is a draft `.terse/voice.md`. You review and approve
it trait by trait; Terse honors no template you have not signed off.
Once approved, your template wins. The edit skill skips the flags your
voice overrides and names them as covered. Rewrites stay inside your
measured ranges.

## The highlight view

```
node scripts/render-highlights.mjs draft.md
```

One self-contained, read-only HTML page. Each flag category gets a
color. Each highlight shows its hint on hover, and the chips at the top
filter by category. Open it in any browser, or let the host publish it as
a page. The preview is for looking. You direct the fixes in chat: "fix
all", "fix only the AI tells", "fix everything except the quotes".

## Keep a flag on purpose

Some flags are keeps. A quoted tell belongs to the quoted author, so
lexical flags inside quotation marks and blockquotes never fire. For
the rest, an HTML comment records the keep in the file:

```
<!-- terse-ignore -->
This line keeps every finding.

<!-- terse-ignore: em-dash, qualifier -->
This line keeps only the named categories.
```

The comment is invisible in rendered markdown, and the keep survives
in the file rather than in a chat you closed.

## Always on

The plugin ships a hook that runs the checker on every Markdown file the host
writes or edits. The flags go back into the session as tool feedback. Opt in
through the host's environment settings:

```json
{ "env": { "TERSE_HOOK": "1" } }
```

Claude sends `tool_input.file_path`. Codex sends an `apply_patch` command, so
the hook extracts every added, updated, or moved Markdown path and resolves it
against the session working directory. Codex documents `Edit` and `Write` as
matcher aliases for `apply_patch`. Both hosts receive exit-code-2 feedback;
irrelevant and malformed events stay silent. Codex also requires one-time
review and trust for non-managed plugin hooks.

## Use the checker standalone

```
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8
node scripts/style-check.mjs draft.md --json
node scripts/style-check.mjs issue.md --impersonal
```

Exit code is nonzero when flags remain, so it works as a CI gate. A
document at or above the target grade fails the check even when each
sentence passes on its own. `--impersonal` adds the pronoun findings
for issues, specs, and acceptance criteria, where the requirement
belongs to the system rather than to whoever filed it.

## Verify the quotes

```
node scripts/quote-check.mjs draft.md
node scripts/quote-check.mjs draft.md --offline
node scripts/quote-check.mjs draft.md --json
```

The quote checker finds each quotation and its nearby source link,
fetches the source, and proves the quote appears word for word. It
normalizes only whitespace and quote marks, and `[...]` marks an
editorial elision. A quote with no source link, a quote its source
does not contain, and a source that would not fetch are all findings.
The exit contract matches the style checker's. A verified quote
on a plain web link gets the ready-made `#:~:text=` fragment URL, so
the link opens with the quote highlighted. `--offline` never touches
the network; web-sourced quotes stay findings until proven.

## Develop

```sh
npm ci
npm test
```

The committed marketplace targets the GitHub repository because the plugin is
at the repository root. To test uncommitted changes, create a temporary
marketplace whose catalog points to a copy at `./plugins/terse`, then add that
marketplace and install `terse@terse`.

Start a new Codex task after reinstalling. In Claude, use the equivalent
`/plugin marketplace add` and `/plugin install` commands, then run
`/reload-plugins` if the install summary asks for it.

## License

MIT
