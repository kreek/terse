# The findings contract

Every Terse command reads and writes one findings model. The classic
editors check everything at once. Terse matches that: collect all
findings first, then treat each command as a view over them.

## The shape

A finding is what `style-check.mjs --json` emits for a flag: `file`,
`line`, `category`, `match`, `hint`. Checker flags also include character
spans for the highlight view. Harper findings may add `engine: "harper"`,
the pinned `ruleId`, and a `suggestions` array. Judgment findings use the
same required shape, so one report, one preview, and one fix loop serve
every category.

## Categories and stages

| Category | Source | Stage |
|---|---|---|
| hard-sentence, very-hard-sentence | checker | structural |
| long-opening | checker | structural |
| aside | checker | structural |
| passive-voice, adverb, qualifier | checker | wording |
| preference | checker | wording |
| personal-pronoun | checker, under `--impersonal` | wording |
| simpler-alternative, weak-verb, ai-tell | checker | wording |
| em-dash | checker | wording |
| grammar | native checker, admitted Harper rules, and model, `references/grammar-scope.md` | mechanics |
| quote-unsourced, quote-unverified, quote-link-plain | quote checker (`scripts/quote-check.mjs`) | mechanics |
| voice-drift | model, against the approved template | wording |
| structure | model: theme, order, unintroduced terms, repeated claims, claims stripped of their warrant | report-only |
| unasked | model: a sentence with no reader question behind it | report-only |

## Collection

Collect once, before the report and before any fix. The synchronous
`checkText` API gathers native style, readability, and grammar flags.
Executable consumers use async `checkDocument`, which adds admitted
Harper grammar findings and applies the same suppressions. One model
read emits the remaining `grammar`, and one quote-checker run proves
every quotation against its source. The same collection produces the
`voice-drift`, and `structure` findings in the shape above. The
`structure` findings come from a reverse outline: one line per
paragraph stating the claim it makes, built in the same read. Audit
the list for jumps, misordering, and paragraphs making two points.
The repetition audit runs on the claim inventory. Group the lines by
claim across the whole document, at any distance. A group of two or
more paragraphs emits one `structure` finding. The finding lists
every paragraph in the group, names one as the keep, and marks the
rest as candidates for cut or merge. A later paragraph that adds
evidence, a qualification, or a new consequence advances the claim
rather than repeating it, and emits nothing. The `unasked` findings
come from the `draft` skill's working note: a sentence the note does
not tie to one of the five reader questions. Those are an unowned
term, a disputable claim's evidence, a required step, an
uninferred consequence, and a sentence too compressed to parse.
On imported text with no note, ask the question of each
sentence in the same read. Do not re-read the prose per category.

## Suppression

Four layers mark keeps before a finding reaches the report or the loop:

1. The checker itself. Lexical findings inside quotes and blockquotes
   never emit. A `<!-- terse-ignore -->` line in the file suppresses
   the next paragraph's findings, all of them or by category. The
   project's `.terse/config.json` removes whole categories, or one
   finding within a category, everywhere.
2. An approved `.terse/voice.md`: its exceptions remove matching
   findings, named as covered.
3. The `style` skill's tripwires: matching findings stay listed,
   marked as false alarms with the table's reason.
4. The translation test, on `ai-tell` findings from a frame: the
   checker matches a surface, and the editor reads the sentence. A
   subject that can do the action, or a word naming the literal
   thing, makes the finding a keep with that reason. The tripwire
   table lists the famous cases; the test is the rule behind them.

## The staged fix loop

Order matters: a rewrite makes earlier grammar findings stale. Visit
each sentence once, applying its findings in stage order:

1. **structural**: split the sentence, convert the in-sentence list to
   bullets, cut or promote the aside
2. **wording**: name the actor (capability statements keep their
   passive), swap the flagged word or phrase, delete or evidence the
   qualifier, replace the em dash
3. **mechanics**: grammar, spelling, and punctuation, on the wording
   that now exists. A quote finding never rewords the sentence. The
   fix re-copies the quoted words, adds the missing source link, or
   upgrades a plain link to a text fragment

Grammar goes last on every sentence. A rewrite in stages 1 and 2
discards that sentence's collected `grammar` findings; re-proof the new
wording instead. Never carry a grammar finding across a rewrite. The
loop never fixes `report-only` findings; it routes them to the report.
In fix mode, `structure` findings surface before the first sentence
visit: report them and take the user's direction. Polishing a sentence
in a section the user then cuts wastes the work. The loop never
rewrites structure; the user's direction does.

After all visits, re-run the checker once and do the whole-document
read the `edit` skill ends with. Converged means every remaining
finding is a marked keep.

## Modes as views

The Terse edit skill is the one command over this model; the user picks the
view in chat.

| Direction | View |
|---|---|
| (default) | run the loop, no filter |
| "report only", "check this" | collect and report everything; fix nothing |
| "just fix the grammar" | the loop filtered to `grammar`; nothing rewrites, so nothing invalidates |
| "review it, don't edit" | report everything, led by the findings no mechanical fix covers |
| "make it casual" | rewrite toward a tone preset, then run the gate |

The Terse draft skill uses the same model at draft time. It fixes findings as
each section lands, so the gate finds residue, not problems. Its stats line
includes the expansion ratio, final words over skeleton words, beside
length against target.

Chat filters select findings; they never change the loop. "Fix only the
AI tells" runs the loop over one category. "Fix everything except the
quotes" excludes findings whose span falls inside quoted material.
