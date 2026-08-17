---
name: writing
description: "Use when writing or editing prose in any document: voice, clarity, readability, word choice."
---

# Writing

## Iron Law

`EVERY SENTENCE EARNS ITS PLACE. PLAIN WORDS, ACTIVE VOICE, THE READER'S VOCABULARY.`

Terse produces load-bearing prose: every sentence informs, advances the
document's point, or builds the reader's knowledge. A sentence doing none of
those is cut. The mechanical layer (`scripts/style-check.mjs`) finds what a
pattern-matcher can find; this skill owns the judgment the patterns cannot
make.

## Core Ideas

1. **Plain, direct, concrete language.** Keep sentences short, but vary
   their length so the text has a natural cadence rather than blunt,
   isolated statements.
2. **Prefer the word the reader already has.** A technical term earns its
   place only when it is more precise than the plain description and the
   audience owns it. Write the plain version first; keep the term of art
   only if the plain version is longer, vaguer, or wrong. Titles and
   headings get the strictest reading.
3. **Active voice, strong verbs, direct claims.** Prefer a named actor
   doing the action, a strong verb over a verb propped up by an adverb, and
   a plain statement over one padded with qualifiers. Passive voice is
   right when the actor is irrelevant or unknown ("the token is signed"); a
   qualifier is right when the hedge is the claim itself.
4. **Never comment on the writing.** No significance announcements ("worth
   noting", "importantly"), no rhetorical questions answered by the next
   sentence, no "it's not just X, it's Y". The test is deletion: cut the
   phrase, and if the passage loses no information, it was a signpost.
5. **Length is a cost the reader pays.** Cut by selecting what to include,
   not by compressing sentences into fragments.
6. **The author's voice survives the edit.** When editing someone else's
   text, make the smallest change that fixes the issue. Never rewrite their
   sentences into your own cadence.

## Redirecting the model's own defaults

The model applying this skill is shaped by Claude's chat system prompts,
which tune it for conversation, not documents. Read
`references/claude-defaults.md` before drafting or editing: it names which
chat defaults carry over (minimal formatting, brief caveats), which must be
redirected (warm tone, chat-sized summaries, writing for the conversation
partner instead of the document's reader), and the trained habits that need
active suppression (em dashes, "not just X but Y", synonym cycling,
closing summaries).

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Passive voice reads as more formal" | Name the actor and use active voice. | The actor is irrelevant or unknown. |
| "The sentence is long, but it all belongs together" | Split it, or turn an in-sentence list into a bulleted list. | The items are few and parallel, and the sentence stays readable on one pass. |
| "A qualifier softens the claim politely" | Delete the qualifier or state the evidence. | The hedge is the claim: marking a statement uncertain is load-bearing. |
| "An adverb strengthens the verb" | Pick a stronger verb or give the number. | The adverb changes meaning, not intensity ("only", "never", "no longer"). |
| "The five-dollar word is more precise" | Write the plain version first; keep the term only if the plain version is longer, vaguer, or wrong for this audience. | The readers are specialists and the term is their working vocabulary. |
| "Rewrite the paragraph while I'm here" | Make the smallest edit that fixes the flagged issue. | The author asked for a rewrite. |
| "The aside is too useful to cut" | Cut it, promote it to its own sentence, or shorten it below six words. | The aside is a citation, cross-reference, or required wording that cannot stand alone. |
| "The em dash reads best as parentheses" | Prefer a period, colon, or comma; a parenthetical of six or more words trades the em-dash flag for an aside flag. | An approved voice template keeps em dashes. |

## The user's voice

If the project has `.terse/voice.md` with `status: approved`, that template
is the author's signed-off voice: its exceptions override this skill's
rules where they conflict, and its measured ranges (sentence length, grade,
hedging rate) bound any prose written or edited for that author.
`/terse:analyze` builds the template from writing samples.

## Handoffs

- `/terse:check` runs the mechanical checker and reports flags with stats.
- `/terse:edit` applies fixes for every flag, honoring the false alarms
  above and the approved voice template.
- `/terse:analyze` learns the user's voice from samples into
  `.terse/voice.md`, gated on their sign-off.
- `/terse:proof` fixes grammar, spelling, and punctuation only, with no
  style opinions.
- `/terse:tone` shifts register across presets while keeping claims and
  the approved voice intact.
- `/terse:review` reports editor feedback (readability, structure, voice,
  AI tells) without editing.
