# Terse

Terse is a writing system that runs inside Claude. A document moves
through three phases. You approve an outline, Claude expands it into
prose, and an edit pass clears what remains before you publish. At
each phase a mechanical checker finds the problems the classic
readability editors found: hard sentences, passive voice, adverbs,
qualifiers, AI tells. Claude fixes them, and the fixes keep your
voice. It all runs on the subscription you already pay for.

## How it works

Two layers:

- **Mechanical** (`scripts/style-check.mjs`): pattern matching, word lists,
  and readability arithmetic. It runs offline with zero dependencies and
  never calls a model. It grades
  each sentence with ARI and flags the hard ones. It flags passive voice,
  adverbs, qualifiers, wordy phrases, long asides, and requirements
  filed as wishes. Em dashes flag too, spaced en dashes included.
  Openings of 90 words or more flag. The AI-tell lexicon covers the
  claudism families in every inflection, and it is careful with single
  words. A bare word is a tell only when it has no everyday literal
  sense. A word with one flags only in its tell frame: `testament to`
  flags, a last will and testament does not, and a test harness never
  trips `harness the power`. Words with plain synonyms (`robust`,
  `crucial`) sit in the wordy list, where the flag is a suggested
  swap. Document stats cover word count, reading time, and grade.
  Each adverb, passive, and qualifier count gets a length-scaled target.
- **Judgment** (skills): the model fixes what the checker finds. A voice
  playbook governs each fix and knows when a flag is a false alarm. Passive
  voice with an irrelevant actor stays. A hedge that is the point stays. Your em
  dashes stay if your voice template says so.

## Install

Terse runs anywhere Claude Code plugins run:

- the terminal
- the Claude desktop app
- claude.ai/code
- the IDE extensions

Add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## Skills

Four skills: three phase commands and the rulebook they share.

| Skill | What it does |
|---|---|
| `/terse:write <subject>` | One request to a finished document: outline, skeleton, expansion, and the edit gate, with two stops for your sign-off. |
| `/terse:outline <subject>` | Structure first: one claim and a word budget per section, iterated to your sign-off. |
| `/terse:draft <outline or subject>` | Anything a reader sees, however short: issues, tickets, PR descriptions, emails, ADRs, docs, posts, proposals, or an approved outline expanded. Your voice, checked at draft time. |
| `/terse:edit <file>` | The publish gate: collect every finding, then report or fix in stages. |
| `/terse:style` | The rulebook: voice, clarity, readability, word choice. |

The three phases hand off through the outline file. You approve it
before any prose exists, with each section's claim, budget, and
evidence on record. Write drafts to that file. A section that resists
goes back to the outline, and structural changes need your approval
again. Edit then checks the finished prose against the same record.
Logged deviations stand, undocumented drift is a finding, and every
section must make its assigned claim.

The style skill holds the rules the other three follow: plain words,
active voice, the reader's vocabulary. It knows the false alarms that
keep a flag from becoming a bad edit. And because it loads on its own
whenever Claude writes or edits prose, everyday document work follows
the same rules without a command.

`/terse:edit` takes direction in chat: "report only", "just fix the
grammar", "make it casual", "cut 15%", "fix only the AI tells",
"everything except the quotes".

## Your voice

`/terse:draft` offers to learn your voice when no template exists.
Point it at a directory of your writing. The checker measures your
habits as numbers. The model names your traits, each with a quoted
example. The result is a draft `.terse/voice.md`. You review and approve
it trait by trait; Terse honors no template you have not signed off.
Once approved, your template wins. `/terse:edit` skips the flags your
voice overrides and names them as covered. Rewrites stay inside your
measured ranges.

## The highlight view

```
node scripts/render-highlights.mjs draft.md
```

One self-contained, read-only HTML page. Each flag category gets a
color. Each highlight shows its hint on hover, and the chips at the top
filter by category. Open it in any browser, or let Claude publish it as
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

The plugin ships a hook that runs the checker on every markdown file
Claude writes or edits. The flags go back into the session as tool
feedback. Opt in through your settings:

```json
{ "env": { "TERSE_HOOK": "1" } }
```

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

## Develop

```
npm install
npm test
```

To try local changes before pushing, add your checkout as a
marketplace and install from it:

```
/plugin marketplace add ./path/to/terse
/plugin install terse@terse
```

Run `/reload-plugins` if the install summary asks for it.

## License

MIT
