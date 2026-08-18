---
name: write
description: "Write a document from an approved outline, or compose directly: prose in the user's voice, checked at draft time."
---

# Write

Turn an approved outline into finished prose, or compose a document
when the user asks for one without an outline. Write in the user's
voice and run the checker at draft time; the edit gate afterwards
should find little left to fix.

## Workflow

1. Resolve the source: an approved outline file from `/terse:outline`,
   or the user's direct request. For a document longer than a few
   paragraphs with no outline, offer `/terse:outline` first; structure
   is cheap to change before prose exists.
2. Load the voice. If `.terse/voice.md` exists with `status: approved`,
   the expansion writes in the user's measured voice, not the model's
   default. If none exists, offer to learn one from a samples directory
   (the flow is the `writing` skill's `references/voice-analysis.md`).
   If the user declines, continue in the `writing` skill's default
   voice. Load the `writing` skill's rules either way.
3. Expand section by section, each drafted knowing its place in the
   whole. Run the checker as you go and fix flags at draft time; do
   not save a cleanup pass for later. The checker is the only
   mid-draft critic: no open-ended polishing passes while sections
   remain unwritten. Quality judgment belongs to the edit gate. Shape
   the prose as you write it:
   - one point per paragraph, stated in the topic sentence
   - the known-new contract: open with what the reader already has;
     end on the new information, where the emphasis falls
   - characters in subjects, actions in verbs
4. A section that resists the outline is a signal: the outline was wrong,
   or the section does not belong. Break the outline on purpose and
   record in the outline file what changed and why; never drift from
   it in silence. On a document running to thousands of words, expect
   the outline to update mid-draft. The recorded decisions keep later
   sections consistent with earlier ones.
5. When every section exists, do the whole-document read. This step is
   not optional:
   - cadence: compare the sentence-length spread (`--json` gives
     `stats.sentenceLengths`) against the voice template's measured
     range; a flat spread means you assembled the prose instead of
     writing it
   - connective flow: each section's opening should catch the previous
     section's throw; each paragraph's first sentence should need the
     one before it
   - the outline promise: every approved section appears in order and
     makes its assigned claim; the outline file records every
     deviation
   - flow at every level: each subsection makes one point, and that
     point supports its section's claim. The sections in order still
     walk the reader from question to answer
6. Run the full checker last and report the stats line. Offer the
   highlight preview and `/terse:edit` for the final gate.

## Verification

- [ ] An approved outline drove the structure, or the user chose direct
      composition.
- [ ] The expansion honors the approved voice template when one exists;
      when none exists, the user heard the offer to learn one.
- [ ] You fixed flags at draft time instead of saving them for a
      cleanup pass.
- [ ] Each paragraph makes one point, and sentences follow the
      known-new contract.
- [ ] The outline file records every deviation from the approved
      outline, none silent.
- [ ] The whole-document read happened: cadence against the voice
      range, transitions in sequence, outline claims intact.
- [ ] Every subsection makes one point, and that point supports its
      section's claim and the document's flow.
- [ ] The final checker run and stats line appear in the report.
