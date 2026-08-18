---
name: edit
description: "The publish gate: collect every finding across readability, style, AI tells, and grammar; report them or fix them in staged order."
---

# Edit

Run the findings contract (the `writing` skill's
`references/findings.md`) end to end: collect everything at once, then
report or fix as the user directs. This is Terse's publish gate, run
like a linter: prose written under `/terse:write` should arrive nearly
clean, and imported or older text gets full repair. The checker finds,
this skill judges and rewrites, and grammar lands last on every
sentence it touches.

## Modes

The user directs the mode and scope in chat; collection is the same in
every mode.

- **fix** (default): run the staged loop over every finding.
- **report only** ("check this", "review it, don't edit"): report the
  findings and stop. Lead with the `structure` and `voice-drift`
  findings no mechanical fix covers, assess through the `writing`
  skill's `references/review-lenses.md`, and offer the highlight
  preview. The document stays unmodified.
- **grammar only** ("proofread", "just fix the grammar"): the mechanics
  stage alone, under `references/grammar-scope.md`. No style opinions.
- **tone** ("make it casual", "simpler, grade 8"): rewrite toward a
  preset per `references/tone-presets.md`, then run the gate; a tone
  pass may not add new findings.
- **scoped fix** ("fix only the AI tells", "everything except the
  quotes"): filters select findings; they never change the loop.
  Findings outside the scope are decided keeps for this pass, reported
  but untouched.

## Workflow

1. Collect per the contract: run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file...>` (add
   `--max-grade N` for a target reading level) for the mechanical
   flags, and read the document once for the `grammar`, `voice-drift`,
   and `structure` findings. Work from the findings, not from a
   free-form read.
2. If `.terse/voice.md` exists with `status: approved`, load it: its
   exceptions suppress matching findings, and its measured ranges bound
   every rewrite. Ignore a `draft` template and say so.
3. Load the `writing` skill's Core Ideas and Tripwires, and its
   `references/claude-defaults.md`; together they govern every rewrite.
   The defaults reference also lists trained habits the checker cannot
   catch (synonym cycling, compulsive triplets, participial tails,
   closing summaries); hunt those in the same read.
4. In report-only mode: report the document stats first (words, reading
   time, grade, and the counts against their targets), then all
   findings grouped by category with `file:line` references and a
   one-sentence fix each. Offer the highlight preview: run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/render-highlights.mjs <file>`
   for a self-contained, read-only page; publish it when the host
   supports pages. The page renders the checker's categories; judgment
   findings ride in the chat report. Stop here.
5. Otherwise, visit each sentence with findings once, applying them in
   the contract's stage order. A rewrite in the first two stages
   discards the sentence's collected grammar findings; re-proof the new
   wording.
   - **structural** first: hard sentence: split it, or turn an
     in-sentence list into bullets; aside: cut it, or promote it to its
     own sentence
   - **wording** second: passive voice: name the actor; adverb: choose a
     stronger verb, or give the number; qualifier: delete it or state
     the evidence; simpler alternative and weak verb: substitute the
     suggested word; ai-tell: delete the tell phrase or swap the
     inflated word for a plain one; for "it's not X, it's Y", pick the
     claim you mean and state it once; em dash: use a period, colon, or
     comma; parentheses only when the span stays under six words, or the
     fix trades one flag for an aside; voice-drift: return to the
     template's register
   - **mechanics** last, on the wording that now exists: grammar,
     spelling, and punctuation, under `references/grammar-scope.md`
   Skip a finding only when it matches a documented false alarm or a
   voice-template exception; keep a list of skips with the reason.
   Report-only findings (`structure`) go to the report, not the loop.
6. Preserve the author's voice: no rewrites beyond the flagged sentence,
   no reordering, no added content. Meaning must survive every edit;
   when a fix would change what the sentence claims, skip it and say so.
7. Re-run the checker. Iterate until the remaining flags are all
   documented keeps.
8. Re-read every touched section whole. A findings list is a worklist,
   not an edit plan: fifteen correct local fixes can leave a paragraph
   reading as chopped fragments. Check the cadence against the voice
   template's measured spread (`--json` gives `stats.sentenceLengths`);
   a collapsed spread means the splits flattened the rhythm. Restore
   flow with the author's own devices, connective openers, asymmetric
   splits, a short verdict against a long analysis, not by undoing the
   fixes.
9. Report: findings fixed per category, findings kept with reasons, the
   before/after stats line, and the cadence spread before and after.

## Verification

- [ ] The mode matched the user's direction; report-only left the
      document unmodified.
- [ ] The checker ran before and after; remaining flags are named
      keeps, not leftovers.
- [ ] Each sentence was visited once, stages in order, grammar last; no
      grammar finding was carried across a rewrite.
- [ ] Every edit is within the flagged sentence; the author's structure
      and meaning are intact.
- [ ] Kept findings each carry a tripwire or voice-template reason.
- [ ] The user's stated scope was honored exactly; out-of-scope
      findings appear in the report as decided keeps.
- [ ] Every touched section was re-read whole after the fixes, and the
      cadence spread did not collapse against the voice range.
- [ ] The report shows before/after stats.
