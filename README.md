# Terse

Terse is a writing system for Codex and Claude Code. It combines a local
checker with skills for planning, drafting, and editing prose. The checker
finds mechanical faults. The skills decide how to fix them without replacing
the writer's voice.

## How it works

Terse has two layers:

- **Mechanical checks** run offline in `scripts/style-check.mjs`. They cover
  readability, passive voice, adverbs, and qualifiers. They also find wordy
  phrases, grammar faults, long asides, and common model-writing patterns.
  The checker reports a file,
  line, category, matched text, and suggested fix for each finding.
- **Writing skills** apply judgment. They preserve a useful passive, keep a
  meaningful hedge, and follow an approved voice template. They also check
  structure, evidence, flow, and the reader's needs.

The [GPT and Codex research note](docs/research/gpt-writing-tells.md) records
the evidence and false-positive limits behind model-writing signals. Those
signals guide edits; they do not identify who wrote a passage.

## Install

Terse requires Node.js 18 or newer.

### Codex Desktop and CLI

Add the repository marketplace and install Terse from a terminal:

```sh
codex plugin marketplace add kreek/terse
codex plugin add terse@terse
```

Codex Desktop and the CLI use the same plugin profile. Restart Desktop and
start a new task after an install or update. Codex asks you to review and
trust the bundled hook before it runs.

### Claude Code

Keep the existing marketplace and command surface:

```text
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## Skills

Codex uses `$terse:*`; Claude Code uses `/terse:*`.

| Codex | Claude Code | Purpose |
|---|---|---|
| `$terse:write <subject>` | `/terse:write <subject>` | Run the full outline, draft, and edit workflow. |
| `$terse:brainstorm <topic>` | `/terse:brainstorm <topic>` | Settle the reader, question, and governing thought. |
| `$terse:outline <subject>` | `/terse:outline <subject>` | Agree on claims, evidence, order, and word budgets. |
| `$terse:draft <outline or subject>` | `/terse:draft <outline or subject>` | Expand an approved outline or write a short document. |
| `$terse:edit <file>` | `/terse:edit <file>` | Report or fix findings in an existing document. |
| `$terse:style` | `/terse:style` | Apply the shared voice and clarity rules. |

The full workflow has two approval points: the outline and a short skeleton.
Each file remains beside the finished document as a record of the agreed
structure. A scripted session can continue through both points when the
request grants approval in advance.

## Voice and project settings

The draft and edit skills can learn a voice from writing samples. Terse writes
the proposed traits to `.terse/voice.md` and waits for approval before using
them. Measured sentence length, grade, hedging, and recorded exceptions then
bound later edits.

Project settings live in `.terse/config.json`. This example enables broad US
spelling and adds project words:

```json
{
  "grammar": {
    "spelling": true,
    "dialect": "american",
    "words": ["Terse", "ProseMirror"]
  }
}
```

The same file can set `maxGrade`, enable `impersonal` checks, select `targets`,
or ignore a category or match. Without broad spelling, Terse still runs its
small typo list, conservative grammar patterns, and pinned offline grammar
engine.

To keep a finding in one paragraph, record the reason in the document:

```html
<!-- terse-ignore -->
This paragraph keeps every finding.

<!-- terse-ignore: em-dash, qualifier -->
This paragraph keeps only the named categories.
```

## Automatic checks

The trusted plugin hook checks each Markdown write or edit. Claude Code sends
a file path. Codex sends an `apply_patch` command. Terse reads every added,
updated, or moved Markdown path and reports only findings that overlap added
text. A deletion and an unrelated tool event stay silent.

## Command-line checks

Run the style and outline checks:

```sh
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8
node scripts/style-check.mjs draft.md --json
node scripts/style-check.mjs issue.md --impersonal
node scripts/outline-check.mjs draft.md
```

Exit code 0 means clean, 1 means findings remain, and 2 means the check could
not run. `checkText` exposes synchronous readability and style results to
code. `checkDocument` adds the offline grammar engine for the CLI, hook,
preview, and eval scorer.

Generate a self-contained highlight page with:

```sh
node scripts/render-highlights.mjs draft.md
```

## Verify quotations

The quote checker compares each quotation with its linked source:

```sh
node scripts/quote-check.mjs draft.md
node scripts/quote-check.mjs draft.md --offline
node scripts/quote-check.mjs draft.md --json
```

It reports missing sources, changed words, and plain links that lack a text
fragment. Offline mode makes no network request.

## Develop

```sh
npm ci
npm test
npm run benchmark:grammar
```

The committed Codex marketplace points to this GitHub repository. Start a new
Codex task after reinstalling so the host loads the current skills and hook.

## License

MIT
