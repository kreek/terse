---
name: style
description: "Use when writing or editing prose in any document: voice, clarity, readability, word choice."
---

# Style

## Iron Law

`EVERY SENTENCE INFORMS, ADVANCES THE POINT, OR TEACHES. PLAIN WORDS, ACTIVE VOICE, THE READER'S VOCABULARY.`

In a Terse document, every sentence informs, advances the document's
point, or builds the reader's knowledge. A sentence doing none of
those is cut. The mechanical layer (`scripts/style-check.mjs`) finds what a
pattern-matcher can find; this skill owns the judgment the patterns cannot
make. The findings contract in `references/findings.md` defines the
finding shape, the fix stages, and the suppression layers every command
shares.

## Core Ideas

1. **Plain, direct, concrete language.** Keep sentences short, but vary
   their length so the text has a natural cadence rather than blunt,
   isolated statements.
2. **Prefer the word the reader already has.** Use a technical term
   only when it is more precise than the plain description and the
   audience owns it. Write the plain version first; keep the term of art
   only if the plain version is longer, vaguer, or wrong. Titles and
   headings get the strictest reading.
3. **The particular, not the abstraction.** Name the service, the
   number, the date. "Improved reliability" asks the reader to take it
   on faith; "p99 fell from 800ms to 120ms in March" does not. This is
   the rule behind Hemingway's narrator finding abstract words obscene
   beside "the concrete names of villages, the numbers of roads". Keep
   an abstraction only when it names a category the reader will meet
   again.
4. **Say the action outright.** A stock figure ("earns its place",
   "moves the needle", "does the heavy lifting") is a fancy phrase the
   way a five-dollar word is a fancy word: the reader must translate
   it back to the real action. The test is translation: if the literal
   verb loses nothing, use it ("you should adopt it", not "it earns
   its place"). Metaphor is for explaining something the reader has
   not seen yet, not for stating a decision, verdict, or action.
5. **Active voice, strong verbs, direct claims.** Prefer a named actor
   doing the action, a strong verb over a verb propped up by an adverb, and
   a plain statement over one padded with qualifiers. Passive voice is
   right when the actor is irrelevant or unknown ("the token is signed"); a
   qualifier is right when the hedge is the claim itself.
6. **Say what is, not what isn't.** State what is true and what to
   do, rather than what is false and what to avoid. "The cache holds
   entries for an hour" beats "the cache does not keep entries
   forever." A negative is right when the reader expects the opposite
   and the correction is the point. This is the Kansas City Star's
   fourth rule. It holds hardest for instructions: a reader follows
   "do y" where "don't do x" leaves them guessing.
7. **The known-new contract.** Open a sentence with what the reader
   already has; the new or important information goes at the end,
   where the emphasis falls. A run of sentences that each open with
   new information loses the reader, however clean each one is.
8. **Never comment on the writing.** No significance announcements ("worth
   noting", "importantly"), no rhetorical questions answered by the next
   sentence, no "it's not just X, it's Y". The test is deletion: cut the
   phrase, and if the passage loses no information, it was a signpost.
9. **Length is a cost the reader pays.** Cut by selecting what to include,
   not by compressing sentences into fragments.
10. **The author's voice survives the edit.** When editing someone else's
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
| "A qualifier softens the claim politely" | Delete the qualifier or state the evidence. | The hedge is the claim: the sentence exists to mark the uncertainty. |
| "An adverb strengthens the verb" | Pick a stronger verb or give the number. | The adverb changes meaning, not intensity ("only", "never", "no longer"). |
| "The five-dollar word is more precise" | Write the plain version first; keep the term only if the plain version is longer, vaguer, or wrong for this audience. | The readers are specialists and the term is their working vocabulary. |
| "Rewrite the paragraph while I'm here" | Make the smallest edit that fixes the flagged issue. | The author asked for a rewrite. |
| "The aside is too useful to cut" | Cut it, promote it to its own sentence, or shorten it below six words. | The aside is a citation, cross-reference, or required wording that cannot stand alone. |
| "The em dash reads best as parentheses" | Prefer a period, colon, or comma; a parenthetical of six or more words trades the em-dash flag for an aside flag. | An approved voice template keeps em dashes. |
| "The turn of phrase reads better than the plain claim" | State the decision or action with its literal verb. | The figure explains a mechanism the reader has not seen, or an approved voice template uses it. |
| "Leave it implicit; the reader will infer it" | State the fact, the number, or the requirement outright. Omission creates pressure in fiction, where the reader supplies the feeling; in a document it leaves a hole the reader fills with a guess. | The material is out of scope, and the document says so. |
| "The opening needs to set the scene first" | Open on the fact the reader came for; move the setup below it. | The genre opens on a scene, and the outline placed the answer accordingly. |
| "I would like this changed" | State the requirement: what the system does once the change lands. A wish is something the reader can decline. | The document is a comment or a note where the preference itself is the content. |
| "Third person reads stiff here" | In an issue, a spec, or acceptance criteria, name the system, the actor, or the user, and run the checker with `--impersonal`. | The genre writes to a reader, as docs, blog posts, and memos do, where "you" is correct. |

## The user's voice

If the project has `.terse/voice.md` with `status: approved`, that template
is the author's signed-off voice: its exceptions override this skill's
rules where they conflict, and its measured ranges (sentence length, grade,
hedging rate) bound any prose written or edited for that author.
`/terse:write` offers to build the template from writing samples
(`references/voice-analysis.md`).

## Handoffs

- `/terse:outline` composes structure first: one claim per section,
  gated on the user's sign-off.
- `/terse:write` expands an approved outline (or composes directly) in
  the user's voice, checking at draft time. It offers to learn a voice
  from samples (`references/voice-analysis.md`) when none exists.
- `/terse:edit` is the publish gate: it collects every finding and, as
  directed, reports them, fixes them in stages, proofs grammar alone,
  or shifts tone, honoring the false alarms above and the approved
  voice template.
