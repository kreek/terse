# Terse

A writing editor for Claude Code. Terse pairs a deterministic style checker
with AI editing skills. It does what the classic readability editors did.
It also rewrites, and the rewrites keep your voice. All of it runs on the
Claude subscription you already pay for.

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
  voice with an irrelevant actor stays. A hedge that is the claim stays. Your em
  dashes stay if your voice template says so.

## Install

Add this repo as a marketplace in Claude Code, then install the plugin:

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## Commands

| Command | What it does |
|---|---|
| `/terse:check <file>` | Run the checker, report stats and flags. Read-only. |
| `/terse:edit <file>` | Fix every flag with the smallest edit that clears it. |
| `/terse:analyze <dir>` | Learn your voice from writing samples into a signed-off `.terse/voice.md`. |
| `/terse:proof <file>` | Fix grammar, spelling, and punctuation only. No style opinions. |
| `/terse:tone <file> <preset>` | Shift tone: confident, formal, friendly, casual, persuasive, shorter, more-detail, simpler. |
| `/terse:review <file>` | Editor feedback without edits: readability, structure, voice, AI tells. |

The `writing` skill also loads on its own when Claude writes or edits
prose. It carries the voice rules into everyday document work.

## Your voice

`/terse:analyze` reads a directory of your writing. The checker measures
your habits as numbers. The model names your traits, each with a quoted
example. The result is a draft `.terse/voice.md`. You review and approve
it trait by trait; Terse honors no template you have not signed off.
Once approved, your template wins. `/terse:edit` skips the flags your
voice overrides, and `/terse:check` names them as covered. Rewrites stay
inside your measured ranges.

## The highlight view

```
node scripts/render-highlights.mjs draft.md
```

One self-contained HTML page. Each flag category gets a color. Each
highlight shows its hint on hover, and the legend chips toggle
categories. Open it in any browser. Published through Claude, the page
adds one more layer. Click a highlight to accept its fix. The next
edit pass applies the accepted set:

```
node scripts/read-accepts.mjs page.html
```

That prints the reviewer's verdicts as JSON: accepted, dismissed, and
open. Each verdict carries the flag's line, match, and hint.

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

## License

MIT
