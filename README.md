# Terse

Terse is a writing system that runs inside Claude. A document moves
through three phases. You approve an outline, Claude expands it into
prose, and an edit pass clears what remains before you publish. At
each phase a mechanical checker finds the problems the classic
readability editors found: hard sentences, passive voice, adverbs,
qualifiers, AI tells. Claude fixes them, and the fixes keep your
voice. It all runs on the subscription you already pay for.

## How it works

Two layers share one findings model.

- **Mechanical** (`scripts/`): pattern matching, word lists, and
  readability arithmetic. It runs offline with zero dependencies and
  never calls a model. `style-check.mjs` grades each sentence and
  flags the readability and wording problems. It catches the AI-tell
  families in every inflection. It proves the grammar a pattern can
  prove: doubled words, `could of`, `its` and `their` slips, common
  misspellings. It is careful with single words: `testament to`
  flags, a last will and testament does not. `outline-check.mjs`
  holds a document to its approved outline. `render-highlights.mjs`
  draws the flags on a page. Run any of them with no arguments for
  usage; the flag hints name the fix.
- **Judgment** (`skills/`): the model fixes what the checker finds. A
  voice playbook governs each fix and knows when a flag is a false
  alarm. Passive voice with an irrelevant actor stays. A hedge that is
  the point stays. Your em dashes stay if your voice template says so.

## Install

Terse runs anywhere Claude Code plugins run: the terminal, the desktop
app, claude.ai/code, and the IDE extensions. Add this repo as a
marketplace, then install the plugin:

```
/plugin marketplace add kreek/terse
/plugin install terse@terse
```

## Skills

Five skills: the pipeline, three phase commands, and the rulebook they
share.

| Skill | What it does |
|---|---|
| `/terse:write <subject>` | One request to a finished document: outline, skeleton, expansion, and the edit gate, with two stops for your sign-off. |
| `/terse:outline <subject>` | Structure first: one claim and a word budget per section, iterated to your sign-off. |
| `/terse:draft <outline or subject>` | Anything a reader sees, however short: issues, tickets, PR descriptions, emails, ADRs, docs, posts, proposals, or an approved outline expanded. Your voice, checked at draft time. |
| `/terse:edit <file>` | The publish gate: collect every finding, then report or fix in stages. |
| `/terse:style` | The rulebook: voice, clarity, readability, word choice. |

The phases hand off through the outline file. You approve it before
any prose exists, with each section's claim, budget, and evidence on
record. Draft writes to that file. A section that will not draft goes
back to the outline, and structural changes need your approval again.
Edit then checks the finished prose against the same record. Logged
deviations stand, undocumented drift is a finding, and every section
must make its assigned claim. The arithmetic part of that promise is
machine-checked: `outline-check.mjs` compares the document's sections,
their order, and their word counts against the outline's budgets.

The style skill holds the rules the other four follow: plain words,
active voice, the reader's vocabulary. It knows the false alarms that
keep a flag from becoming a bad edit. And because it loads on its own
whenever Claude writes or edits prose, everyday document work follows
the same rules without a command.

`/terse:edit` takes direction in chat: "report only", "just fix the
grammar", "make it casual", "cut 15%", "fix only the AI tells",
"everything except the quotes".

The two sign-off stops exist to collect your answer. A one-shot or
scripted session cannot give one. Say so in the request, as in "treat
the outline as approved, do not pause", and the pipeline runs through
to the file.

## Your voice

`/terse:draft` offers to learn your voice when no template exists. Point
it at a directory of your writing. The checker measures your habits as
numbers. The model names your traits, each with a quoted example. The
result is a draft `.terse/voice.md`. You review and approve it trait by
trait; Terse honors no template you have not signed off. Once approved,
your template overrides the defaults. `/terse:edit` skips the flags your
voice overrides and names them as covered, and rewrites stay inside
your measured ranges. The mechanical half of the template lands in
`.terse/config.json`, below, so the checker honors it too.

## Keep a flag on purpose

Some flags are keeps. A quoted tell belongs to the quoted author, so
lexical flags inside quotation marks and blockquotes never fire. For
the rest, an HTML comment records the keep in the file:

```
<!-- terse-ignore -->
This paragraph keeps every finding, through its last line.

<!-- terse-ignore: em-dash, qualifier -->
This paragraph keeps only the named categories.
```

The comment is invisible in rendered markdown, and the keep survives
in the file rather than in a chat you closed.

For keeps that hold across a project, `.terse/config.json` sets the
checker's defaults. The checker finds it by walking up from the file,
and command-line flags override it:

```json
{
  "maxGrade": 12,
  "impersonal": false,
  "ignore": ["em-dash", "ai-tell:bold-label bullets"],
  "targets": { "passivePerKword": 20 }
}
```

`ignore` takes a category, or `category:match` for one finding within
it. `targets` sets the per-thousand-word rates behind the adverb,
passive, and qualifier targets; a README's passives run higher than
journalism's. The hook and the CLI read this file, so your voice holds
without the model in the loop.

## The highlight view

```
node scripts/render-highlights.mjs draft.md
```

One self-contained, read-only HTML page. Each flag category gets a
color, each highlight shows its hint on hover, and the chips at the top
filter by category. Open it in any browser, or let Claude publish it as
a page. The preview is for looking; you direct the fixes in chat as
above. The renderer knows headings, fences, dash lists, bold, links,
and inline code. Ordered lists, tables, and block quotes render as
plain paragraphs.

## Always on

The plugin ships a hook that runs the checker on every markdown file
Claude writes or edits. The flags return to the session as tool
feedback. A write reports the whole file. An edit reports only the
flags inside the text it inserted. One changed line in an old document
does not replay every old finding. Opt in through your
settings:

```json
{ "env": { "TERSE_HOOK": "1" } }
```

## Use the checker standalone

```
node scripts/style-check.mjs draft.md
node scripts/style-check.mjs draft.md --max-grade 8 --json
node scripts/style-check.mjs issue.md --impersonal
node scripts/outline-check.mjs draft.md
```

The exit code is nonzero when flags remain, so both scripts work as a
CI gate. A document at or above the target grade fails even when each
sentence passes on its own. `--impersonal` adds the pronoun findings
for issues, specs, and acceptance criteria. There the requirement
belongs to the system, not to whoever filed it. `outline-check`
expects `<name>-outline.md` beside `<name>.md`, or `--outline <file>`.

## Codex and other hosts

The checker and the skills are the portable core. The scripts need
Node 18 and nothing else. The skills are `SKILL.md` files in the Agent
Skills format, which Codex reads from `~/.codex/skills` or a project's
skills directory. Copy or link the `skills/` directories there and the
phase skills work the same way. Two things belong to Claude Code:
`hooks/hooks.json`, and the `${CLAUDE_PLUGIN_ROOT}` paths inside the
skills, which mean the plugin's checkout directory. For Codex, register
the hook in `config.toml` as a `post_tool_use` command running
`scripts/style-hook.mjs` with `TERSE_HOOK=1`; it reads the same payload
shape. The tell lexicon came from Claude's habits; GPT's overlap is
large but not total.

## Develop

```
npm install
npm test
npm run eval:fallback
```

The tests pin the checker's behavior, including zero lexical false
positives on a corpus of Hemingway's journalism. The eval runs each
case with and without the plugin and scores the delta; `evals/README.md`
explains the cases and the graders.

To try local changes before pushing, add your checkout as a
marketplace and install from it:

```
/plugin marketplace add ./path/to/terse
/plugin install terse@terse
```

Run `/reload-plugins` if the install summary asks for it.

## License

MIT
