---
name: write
description: "Write a document from an approved outline, or compose directly: prose in the user's voice, checked as it lands."
---

# Write

Turn an approved outline into finished prose, or compose a document
directly when the user asks for one without an outline. Prose lands in
the user's voice and gets checked at draft time; the edit gate
afterwards should find residue, not problems.

## Workflow

1. Resolve the source: an approved outline file from `/terse:outline`,
   or the user's direct request. For a document longer than a few
   paragraphs with no outline, offer `/terse:outline` first; structure
   is cheap to change before prose exists.
2. Load the voice. If `.terse/voice.md` exists with `status: approved`,
   the expansion writes in the user's measured voice, not the model's
   default. If none exists, offer to learn one from a samples directory
   (the flow is the `writing` skill's `references/voice-analysis.md`);
   continue in the `writing` skill's default voice if the user
   declines. Load the `writing` skill's rules either way.
3. Expand section by section, each drafted knowing its place in the
   whole. Run the checker as you go and fix flags at draft time; do not
   save a cleanup pass for later.
4. When every section exists, do the whole-document read. This step is
   not optional:
   - cadence: compare the sentence-length spread (`--json` gives
     `stats.sentenceLengths`) against the voice template's measured
     range; a flat spread means the prose was assembled, not written
   - connective flow: each section's opening should catch the previous
     section's throw; each paragraph's first sentence should need the
     one before it
   - the outline promise: every section still makes the claim the
     approved outline assigned it
5. Run the full checker last and report the stats line. Offer the
   highlight preview and `/terse:edit` for the final gate.

## Verification

- [ ] An approved outline drove the structure, or the user chose direct
      composition.
- [ ] The expansion honors the approved voice template when one exists;
      when none exists, the user heard the offer to learn one.
- [ ] Flags were fixed at draft time, not banked for a cleanup pass.
- [ ] The whole-document read happened: cadence against the voice
      range, transitions in sequence, outline claims intact.
- [ ] The final checker run and stats line appear in the report.
