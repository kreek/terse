# Terse

Terse is a writing plugin for Codex and Claude Code. It combines a
local readability and grammar checker with writing skills that edit
prose without sanding off the author's voice.

## How it works

The checker and the skills split the job. A script reads your file
and finds grammar mistakes, hard sentences, and the phrases that mark
AI writing. The agent's skills fix what it finds, keep your voice
consistent, and fit the writing to its reader. The split exists
because you cannot trust a model to judge its own prose. The checker
is the outside standard the skills work against.

## What it catches

Here's what the checker catches in a real paragraph.

<!-- terse-ignore -->
> It's worth noting that the deploy pipeline was redesigned by the
> platform team in order to seamlessly leverage the new scheduler.
> Basically, the old cron jobs were very fragile. Note that rollbacks
> are supported.

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
tripped it, and the fix.

| Category | What it means |
|---|---|
| `hard-sentence`, `very-hard-sentence` | Long and dense. |
| `passive-voice` | The actor is missing. |
| `adverb`, `qualifier` | A weak verb propped up, or a claim hedged. |
| `simpler-alternative` | A plainer word exists. |
| `ai-tell` | A phrase that marks machine writing. |
| `grammar` | A slip a pattern can prove. |
| `em-dash`, `aside` | An em dash, or an over-long parenthetical. |

The agent applies judgment on top. A passive with an irrelevant actor
stays, as in `the token is signed`.

## Install

Terse requires Node.js 18 or newer. Add this repository as a
marketplace, then install the plugin for your host.

### Codex Desktop and CLI

Run these commands once from a terminal:

```sh
codex plugin marketplace add kreek/terse
codex plugin add terse@terse
```

Restart Codex after installation and begin a new thread. Codex asks
you to review and trust the bundled post-edit hook before it runs.

### Claude Code

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## First use

There are three ways to use Terse. Ask the agent to write something,
such as "draft an issue about the login timeout." Terse can match the
request without an explicit skill name. Name a skill when you want to
choose the workflow:

| Host | Edit an existing file | Write a full document |
|---|---|---|
| Codex | `$terse:edit docs/design.md` | `$terse:write a design doc for the new scheduler` |
| Claude Code | `/terse:edit docs/design.md` | `/terse:write a design doc for the new scheduler` |

## Writing a full document

The `terse:write` skill runs three phases in order: outline, draft,
edit. The order stays fixed because moving bullets is cheap and moving
prose is not. You approve the outline, then a skeleton of the
argument, before the agent writes the rest. In a scripted or one-shot
session, no one is there to approve the pause. Say so in the request,
as in "treat the outline as approved, do not pause," and the process
runs through to the file.

## Making it yours

Terse learns your voice from your own writing and builds a voice
template. You can also tell it to skip a flag, for one paragraph with
a `terse-ignore` comment or for the whole project with
`.terse/config.json`. The config file sets the target grade, the
categories to ignore, and how many adverbs or passives count as
normal.

Broad spelling is off unless the project chooses a dialect. Add this
to `.terse/config.json` to enable it and teach the checker project
words:

```json
{
  "grammar": {
    "spelling": true,
    "dialect": "american",
    "words": ["Terse", "ProseMirror"]
  }
}
```

Even without broad spelling, the checker handles its small one-answer
typo list and seven conservative grammar rules. The model checks what
a pattern cannot prove, including missing words, ambiguous homophones,
and harder agreement or punctuation errors.

## Reference

Once you enable the bundled hook, Terse checks every Markdown file the
agent writes or edits. A highlight page shows the flags in a browser.
The checker and its scripts also run standalone from the command line.
To change Terse itself, clone it and run the tests.

```
npm install
npm test
```

Code that only needs native readability and style stats can call the
synchronous `checkText`. The CLI, hook, preview, and eval scorer call
async `checkDocument`, which adds the pinned offline grammar engine.
Run `npm run benchmark:grammar` to measure its cold and warm 10 KB
checks on the current machine.

## License

MIT
