---
name: edit
description: "Fix a document's style flags: rewrite hard sentences, activate passive voice, cut adverbs, qualifiers, wordy phrases, long asides, and em dashes."
---

# Edit

Apply fixes for every checker flag in the file(s) the user named, honoring
the `writing` skill's voice rules and false alarms. This is Terse's AI
layer: the checker finds, this skill judges and rewrites.

## Workflow

1. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file...>` to get
   the flag list. Work from the flags, not from a free-form read.
   If `.terse/voice.md` exists with `status: approved`, load it: its
   exceptions suppress matching flags, and its measured ranges bound every
   rewrite. Ignore a `draft` template and say so.
   The user directs scope in chat, often after looking at the highlight
   preview: "fix all", "fix only the AI tells", "fix everything except
   the quotes". Honor that scope exactly; flags outside it are decided
   keeps for this pass, reported but untouched.
2. Load the `writing` skill's Core Ideas and Tripwires, and its
   `references/claude-defaults.md`; together they govern every rewrite. The
   defaults reference also lists trained habits the checker cannot catch
   (synonym cycling, compulsive triplets, participial tails, closing
   summaries); hunt those in
   the same pass.
3. Fix each flag with the smallest edit that clears it:
   - hard sentence: split it, or turn an in-sentence list into bullets
   - passive voice: name the actor
   - adverb: choose a stronger verb, or give the number
   - qualifier: delete it or state the evidence
   - simpler alternative: substitute the suggested word
   - aside: cut it, or promote it to its own sentence
   - ai-tell: delete the tell phrase or swap the inflated word for a plain
     one; for "it's not X, it's Y", pick the claim you mean and state it
     once
   - em dash: use a period, colon, or comma; parentheses only when the
     span stays under six words, or the fix trades one flag for an aside
   Skip a flag only when it matches a documented false alarm; keep a list of
   skipped flags with the reason.
4. Preserve the author's voice: no rewrites beyond the flagged span, no
   reordering, no added content. Meaning must survive every edit; when a fix
   would change what the sentence claims, skip it and say so.
5. Re-run the checker. Iterate until the remaining flags are all documented
   false alarms.
6. Also fix mechanics found while editing (spelling, agreement,
   homophones), following `/terse:proof`'s scope and safeguards: quoted
   material keeps its original errors, and the document's spelling
   convention (US or UK) stays as found.
7. Report: flags fixed per category, flags kept with reasons, and the
   before/after stats line.

## Verification

- [ ] The checker ran before and after; remaining flags are named false
      alarms, not leftovers.
- [ ] Every edit is within the flagged span; the author's structure and
      meaning are intact.
- [ ] Kept flags each carry a reason from the tripwire table.
- [ ] The report shows before/after stats.
- [ ] The user's stated scope was honored exactly; out-of-scope flags
      appear in the report as decided keeps.
