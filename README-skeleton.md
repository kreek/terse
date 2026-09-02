# README skeleton

## 1. What Terse is

Terse is a Claude Code plugin that edits prose. It replaces the
readability checker and grammar assistant you would otherwise pay
for, on the Claude subscription you already have.

## 2. How it works

The checker and the skills split the job. A deterministic script
reads your file and finds grammar mistakes, hard sentences, and the
phrases that mark AI writing. Claude's skills fix what it finds, keep
your voice consistent, and fit the writing to its reader.

## 3. See it in action

Here is that split on a real paragraph.

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

| Category | What it means |
|---|---|
| `hard-sentence`, `very-hard-sentence` | Long and dense. |
| `passive-voice` | The actor is missing. |
| `adverb`, `qualifier` | A weak verb propped up, or a claim hedged. |
| `simpler-alternative` | A plainer word exists. |
| `ai-tell` | A phrase that marks machine writing. |
| `grammar` | A slip a pattern can prove. |
| `em-dash`, `aside` | An em dash, or an over-long parenthetical. |

## 4. Install

Add this repo as a marketplace, then install the plugin.

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## 5. Using Terse day to day

There are three ways to use Terse. Ask Claude to write something and
it checks its own draft. Run `/terse:edit` on a file you already
have. Run `/terse:write` to start something new.

## 6. Writing a full document

`/terse:write` runs three phases in order: outline, draft, edit. The
order is fixed because moving bullets is cheap and moving prose is
not. You approve the outline and the skeleton before Claude writes
the rest.

## 7. Making it yours

Terse learns your voice from your own writing and builds a voice
template. You can also tell it to skip a flag, for one paragraph with
a `terse-ignore` comment or for the whole project with
`.terse/config.json`.

## 8. Reference

An always-on hook checks every file Claude writes or edits. A
highlight page renders the flags in a browser. The checker and its
scripts run standalone from the command line. The skills also work in
Codex. To change Terse itself, clone it and run the tests.
