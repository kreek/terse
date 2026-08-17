---
name: proof
description: "Proofread a document for grammar, spelling, and punctuation only. No style opinions."
---

# Proof

Fix correctness errors and nothing else. This is the Grammarly-replacement
pass: it must leave style, structure, and voice exactly as found. A user
who wants style fixes runs `/terse:edit`.

## Scope

Fix:

- spelling and typos
- subject-verb agreement, tense consistency, pronoun agreement
- homophones and near-homophones (were/where, they're/their/there,
  its/it's, your/you're, affect/effect, then/than, lose/loose)
- articles and prepositions (a/an, missing "the", wrong preposition)
- punctuation errors: run-ons, comma splices, unmatched quotes and
  parentheses, misplaced apostrophes
- duplicated words ("the the") and dropped words

Do not touch: word choice, sentence length, passive voice, tone, hedges,
structure. If a sentence is grammatical but bad, it leaves this pass
unchanged.

## Workflow

1. Resolve the target file(s); ask if none were named.
2. Read the document and fix every in-scope error with the smallest edit
   that makes the sentence correct. Preserve the author's spelling
   convention (US or UK) as found; consistency within the document beats
   either standard.
3. Leave prose inside code blocks, inline code, and URLs alone. Quoted
   material keeps its original errors; note them instead of editing quotes.
4. Report every correction as before -> after with a `file:line`
   reference, so the user can audit the pass. If nothing needed fixing,
   say so plainly.

## Verification

- [ ] Every edit fixes a correctness error; no edit is stylistic.
- [ ] Quotes and code are untouched; their errors are noted, not fixed.
- [ ] The report lists each correction with its location.
- [ ] The document's spelling convention is intact and consistent.
