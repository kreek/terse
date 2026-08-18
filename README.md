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
  adverbs, qualifiers, wordy phrases, long asides, and em dashes. Document
  stats cover word count, reading time, and grade. Each adverb, passive,
  and qualifier count gets a length-scaled target.
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
| `/terse:outline <subject>` | Structure first: one point and a word budget per section, iterated to your sign-off. |
| `/terse:write <outline or subject>` | Expand the approved outline into prose in your voice, checked at draft time. |
| `/terse:edit <file>` | The publish gate: collect every finding, then report or fix in stages. |
| `/terse:style` | The rulebook: voice, clarity, readability, word choice. |

The three phases hand off through the outline file. You approve it
before any prose exists, and it records each section's point, budget,
and evidence. Write drafts to that file and reports back when a
section resists it. The outline updates, and structural changes need
your approval again. Edit checks the finished prose against the same
file. Every section makes its assigned point, deviations logged
during drafting stand, and undocumented drift is a finding.

The style skill holds the rules the other three follow: plain words,
active voice, the reader's vocabulary. It names the false alarms that
keep a flag from becoming a bad edit. It also loads on its own whenever
Claude writes or edits prose, so everyday document work follows the
same rules without a command.

`/terse:edit` takes direction in chat: "report only", "just fix the
grammar", "make it casual", "cut 15%", "fix only the AI tells",
"everything except the quotes".

## Your voice

`/terse:write` offers to learn your voice when no template exists.
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

## Use the checker standalone

```
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8
node scripts/style-check.mjs draft.md --json
```

Exit code is nonzero when flags remain, so it works as a CI gate. A
document at or above the target grade fails the check even when each
sentence passes on its own.

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
