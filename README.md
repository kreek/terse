# Terse

Terse is a Claude Code plugin for writing and editing prose.
It runs deterministic, and LLM backed checks to catch:
- Grammar mistakes
- Hard-to-read sentences
- Passive voice
- AI tells
- Target voice and reader drift

The two main parts are:

- A **checker script** that reads a file and reports the
  problems a traditional word processor would find. Long sentences, passive
  voice, adverbs, hedges, and wordy phrases. It also flags terms and puffery 
  common in LLM generated writing. The checker runs offline, in Node, with no 
  dependencies and no model calls.
- **Skills**, the instructions Claude follows when it writes or edits
  for you. They work in three steps. The outline comes first: a
  short, easy-to-change plan of your argument. You approve it before
  any prose exists. Claude then drafts each section in your voice.
  In the edit phase, Claude fixes what the checker flagged, then
  corrects the grammar. Give Terse a few samples of your writing and
  it builds a voice template, so the result sounds like you and not
  like Claude.

## What it catches

Given this paragraph:

<!-- terse-ignore -->
> It's worth noting that the deploy pipeline was redesigned by the
> platform team in order to seamlessly leverage the new scheduler.
> Basically, the old cron jobs were very fragile. Note that rollbacks
> are supported.

the checker reports:

```
notes.md:3  [ai-tell] "it's worth noting" - an AI tell; state the claim plainly
notes.md:3  [passive-voice] "was redesigned" - name the actor; keep only if the actor is irrelevant or unknown
notes.md:3  [simpler-alternative] "in order to" - use "to"
notes.md:3  [adverb] "seamlessly" - pick a stronger verb or give the number
notes.md:3  [simpler-alternative] "leverage" - use "use"
notes.md:3  [adverb] "Basically" - delete it: a comment on the sentence, not on the verb
notes.md:3  [qualifier] "very" - delete it or state the evidence; keep only if the hedge is the claim
notes.md:3  [ai-tell] "note that" - an AI tell; state the claim plainly
notes.md:3  [passive-voice] "are supported" - name the actor; keep only if the actor is irrelevant or unknown
notes.md: 34 words, ~1 min read, grade 9; adverbs 2/2, passive 2/2, qualifiers 1/2, AI tells 2, grammar 0, hard sentences 0
```

Each line is a flag: the file and line, a category, the words that
tripped it, and the fix. The last line is the document's stats. The
grade is a US reading grade; the target is 10 or below. The counts
after it are against a target that scales with length, so a long
document gets more adverbs than a short one.

The categories, in the order you will meet them:

| Category | What it means |
|---|---|
| `hard-sentence`, `very-hard-sentence` | Long and dense. Split it, or turn an in-sentence list into bullets. |
| `long-opening` | The first paragraph runs past 90 words before the reader gets the point. |
| `passive-voice` | The actor is missing. Name it, unless it does not matter who did it. |
| `adverb`, `qualifier` | A weak verb propped up, or a claim hedged. Pick the strong verb, or state the evidence. |
| `simpler-alternative`, `weak-verb` | A five-dollar word or a verb hiding in a noun (`made the decision`). The hint names the plain word. |
| `ai-tell` | A phrase that marks machine writing: `worth noting`, `delve`, `it's not X, it's Y`, a `Conclusion` heading, emoji. |
| `grammar` | Doubled words, `could of`, `its` for `it's`, common misspellings. |
| `em-dash`, `aside` | An em dash, or a parenthetical over six words. |
| `preference`, `personal-pronoun` | A requirement written as a wish (`I would like`), or first person in a spec. The second is opt-in. |

Claude applies judgment on top. A passive with an irrelevant actor
stays (`the token is signed`). A hedge that is the point stays. A
quoted phrase belongs to the person quoted, so flags inside quotation
marks never fire.

## Install

Terse runs anywhere Claude Code plugins run: the terminal, the desktop
app, claude.ai/code, and the IDE extensions. In Claude Code:

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## First use

Three ways in, from lightest to fullest.

**Ask Claude to write something.** With the plugin in place, a plain
request runs under Terse's rules without a command. "Write a README
for this tool" counts, and so does "draft an issue about the login
timeout". Claude checks its own draft before it shows you.

**Check a file you already have.**

```
/terse:edit docs/design.md
```

Claude runs the checker, reads the document, and fixes what it finds
one sentence at a time. Your structure and your meaning stay as they
were. Say what you want in plain words. "Report only" shows the
flags without changes. "Just fix the grammar", "make it casual",
"cut 15%", and "fix only the AI tells" do what they say.

**Write a longer document from scratch.**

```
/terse:write a design doc for the new scheduler
```

This runs Terse's full process, described next.

## The process

Terse treats a document as three jobs done in order, because moving
bullets takes seconds where moving polished prose takes an afternoon.

1. **Outline.** Claude asks who the reader is and what one question
   the document answers. Then it writes an outline: one heading per
   section, one claim per section, and a word budget for each. You
   edit and approve it. No prose exists yet.
2. **Draft.** Claude writes the shortest version that makes every
   claim. It shows you that version with the sentences it proposes to
   add, and expands only after you approve. Each added sentence
   answers a question a reader would ask at that spot. Terse expands a
   lean draft rather than trimming a padded one. "What fact is
   missing" is a question Claude can answer; "which of my sentences is
   unnecessary" is not.
3. **Edit.** The final pass. The checker runs, and Claude fixes the
   flags in order: structure first, then wording, then grammar last.
   Then it reads the whole document again for flow.

`/terse:write` runs all three with two stops for your approval.
`/terse:outline`, `/terse:draft`, and `/terse:edit` run one job each.
`/terse:style` is the rulebook the others share; you will seldom call
it yourself.

In a scripted or one-shot session nobody can answer a stop. Say so in
the request, as in "treat the outline as approved, do not pause", and
the process runs through to the file.

## Keeping your voice

Terse edits toward plain, direct prose, but it should sound like you,
not like a style guide. Point `/terse:draft` at a folder of your own
writing and it builds a voice template, `.terse/voice.md`. The
template records your measured habits, such as sentence length and
how often you hedge. It also names your traits in words, each with a
quoted example from your samples. You approve the template trait by
trait. From then on Claude writes and edits
inside those ranges, and rules you override on purpose (you like em
dashes, say) stop producing flags.

## Keeping a flag on purpose

Sometimes the checker is right that a pattern matched and wrong that
it matters. Two ways to say so, both of which survive in the file
rather than in a chat you closed.

For one paragraph, an HTML comment above it:

```
<!-- terse-ignore -->
This paragraph keeps every flag.

<!-- terse-ignore: em-dash, qualifier -->
This paragraph keeps only the named categories.
```

For a whole project, `.terse/config.json`, which the checker finds by
walking up from the file:

```json
{
  "maxGrade": 12,
  "ignore": ["em-dash", "ai-tell:bold-label bullets"],
  "targets": { "passivePerKword": 20 }
}
```

`maxGrade` is the reading grade to aim for. `ignore` lists categories
to drop, or one finding within a category as `category:match`.
`targets` sets how many adverbs, passives, or qualifiers per thousand
words count as normal. A README's passives run higher than a news
story's. Building a voice template writes this file for you. The
checker then honors your voice even when it runs without Claude.

## Always on

The plugin includes a hook that runs the checker every time Claude
writes or edits a markdown file. The flags go back to Claude as
feedback. An edit reports only the flags in the text Claude inserted.
Touching one line of an old document does not replay every old
flag. It is off by default; turn it on in your Claude Code settings:

```json
{ "env": { "TERSE_HOOK": "1" } }
```

## A page of highlights

```
node scripts/render-highlights.mjs draft.md
```

This writes one HTML file showing your document with each flag colored
by category and its hint on hover. The classic readability editors
worked this way. It is a view, not an editor: you look, then
tell Claude what to fix.

## Using the scripts directly

The checker and its companions are plain Node scripts. They need Node
18 and nothing else, so they work in CI and in other editors.

```
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8 --json
node scripts/style-check.mjs issue.md --impersonal
node scripts/outline-check.mjs draft.md
```

The exit code is 1 when flags remain and 2 on an error, so a script can
gate on it. `--impersonal` adds the pronoun flags. Use it for issues
and specs, where the requirement belongs to the system rather than to
whoever filed it. `outline-check` compares a document's sections,
their order, and their word counts against the outline you approved
for it. It looks for `draft-outline.md` beside `draft.md`.

## Other hosts

The scripts and the skills are portable. The skills are `SKILL.md`
files in the Agent Skills format, which Codex reads from
`~/.codex/skills` or a project's skills directory; copy or link the
`skills/` folders there. Two things are specific to Claude Code:
`hooks/hooks.json`, and the `${CLAUDE_PLUGIN_ROOT}` paths inside the
skills, which mean the plugin's checkout directory. For Codex, register
`scripts/style-hook.mjs` as a `post_tool_use` command with
`TERSE_HOOK=1`. The list of machine-writing phrases came from Claude's
habits; GPT's overlap is large but not total.

## Develop

```
npm install
npm test
npm run eval:fallback
```

The tests pin the checker's behavior, including zero false positives
from the phrase lists on a corpus of Hemingway's journalism. The eval
writes the same documents with and without the plugin and scores the
difference; `evals/README.md` explains the cases. To try local changes,
add your checkout as a marketplace and install from it:

```
/plugin marketplace add ./path/to/terse
/plugin install terse@terse
```

## License

MIT
