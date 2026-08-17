# Terse

A writing editor for Claude Code. Terse pairs a deterministic style checker
with AI editing skills. It does what the classic readability editors did.
It also rewrites, and the rewrites keep your voice. All of it runs on the
Claude subscription you already pay for.

## How it works

Two layers:

- **Mechanical** (`scripts/style-check.mjs`): pattern matching, word lists,
  and readability arithmetic. It flags hard-to-read sentences (per-sentence
  ARI grade), passive voice, adverbs, qualifiers, wordy phrases, long
  parenthetical asides, and em dashes. It also reports document stats: word count, reading time, grade,
  and each count against a length-scaled target. No AI, no network, no
  dependencies.
- **Judgment** (skills): the model fixes what the checker finds. A voice
  playbook governs each fix and knows when a flag is a false alarm. Passive
  voice with an irrelevant actor stays. A load-bearing hedge stays. Your em
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
your habits as numbers; the model names your traits, each with a quoted
example. The result is a draft `.terse/voice.md`. You review and approve
it trait by trait; Terse honors no template you have not signed off.
Once approved, your template wins: flags your voice overrides go quiet,
and rewrites stay inside your measured ranges.

## Use the checker standalone

```
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8
node scripts/style-check.mjs draft.md --json
```

Exit code is nonzero when flags remain, so it works as a CI gate.

## Develop

```
npm install
npm test
```

## License

MIT
