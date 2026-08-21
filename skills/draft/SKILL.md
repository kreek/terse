---
name: draft
description: "One request to a finished document: outline, skeleton, expansion, and the edit gate in sequence, with two stops for the user's sign-off. Use this whenever the user asks for a document, memo, summary, report, post, spec, ADR, or README and has not named a single phase; `/terse:outline`, `/terse:write`, and `/terse:edit` stay for driving one phase by hand."
---

# Draft

## Iron Law

`ONE REQUEST, TWO STOPS, ONE FINISHED FILE. EVERY PHASE RUNS ITS OWN SKILL.`

Run the three Terse phases as one pipeline. The user asks for a
document and gets one back, polished and proofread. They say yes
twice: once to the outline and once to the skeleton. Each phase runs
the skill that owns it, under that skill's rules, so nothing here
restates them. This skill only orders the phases, carries the files
between them, and holds the two stops.

## Workflow

1. Take the request. Name the subject, the reader, the one question,
   and the target length. Ask for what the user did not say. An
   issue, a PR description, a comment, or a short email under 200
   words skips to step 4. `/terse:write` handles it in one pass with
   no stop, and the gate in step 5 still runs.
2. Outline, under `/terse:outline`. Write `<name>-outline.md` beside
   where the document will live. It holds the governing thought, the
   shape, one claim and a budget per section, and the budgets summed
   against the target. Show it and stop. The user edits or approves;
   iterate until they approve, then mark the file
   `status: approved (user, YYYY-MM-DD)`.
3. Skeleton, under `/terse:write` step 4. Write `<name>-skeleton.md`:
   each section's claim as bare prose, the evidence under disputable
   claims, nothing else. List the proposed additions beneath it, one
   line each with the section, the reader question, and the sentence
   in brief. Show both and stop. The user strikes or adds items, then
   approves.
4. Expand, under `/terse:write` steps 5 through 8. Write `<name>.md`
   from the approved skeleton and list, every added sentence answering
   its recorded question, the ratio under the ceiling. Record any
   deviation in the outline file. Keep the working note of questions
   for the gate.
5. Gate, under `/terse:edit` in fix mode. Collect every finding, run
   the reverse outline and the claim inventory, and fix through the
   staged loop with grammar last. In `/terse:edit`, `structure`
   findings wait for the user. Here the approved outline and skeleton
   are the decided structure, so report them with the file instead of
   stopping a third time. Re-read every touched section whole.
6. Deliver `<name>.md` with the edit skill's report. That is the
   stats line, length against target, the expansion ratio, findings
   fixed and kept, and any `structure` finding left for the user. The
   outline and skeleton stay beside it as the record.

## Verification

- [ ] The user approved the outline before the skeleton existed, and
      the skeleton with its additions before the expansion.
- [ ] Each phase ran under its own skill's rules and checklist.
- [ ] The outline, skeleton, and document sit together, and the
      outline records every deviation.
- [ ] The gate ran in fix mode with grammar last, without a third
      stop, and any remaining `structure` finding is in the report.
- [ ] The report carries the stats line, the expansion ratio, and the
      length against target.
