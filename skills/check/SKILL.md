---
name: check
description: "Check a document's readability and style: hard sentences, passive voice, adverbs, qualifiers, wordy phrases."
---

# Check

Run the mechanical checker on the file(s) the user named and report the
results. Detection is deterministic; do not re-derive the flags by reading
the prose yourself.

## Workflow

1. Resolve the target file(s). If the user named none, ask which document to
   check; do not guess.
2. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file...>`
   (add `--max-grade N` if the user set a target reading level).
3. Report the document stats first (words, reading time, grade, and each
   count against its target), then the flags grouped by category with
   `file:line` references.
4. For each category with flags, add one sentence on the likely fix, using
   the `writing` skill's tripwires. Name any flags that look like documented
   false alarms (passive with an irrelevant actor, a load-bearing hedge, a
   meaning-changing adverb) so the user can keep them deliberately.
5. Do not edit the document. Offer `/terse:edit` if the user wants the
   fixes applied.

## Verification

- [ ] The checker was run; flags were not invented or paraphrased away.
- [ ] Stats and every flag category appear in the report.
- [ ] Probable false alarms are named, not silently dropped.
- [ ] The document was not modified.
