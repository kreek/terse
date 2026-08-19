---
name: write
description: "Write a document from an approved outline, or compose directly: prose in the user's voice, checked at draft time."
---

# Write

## Iron Law

`WRITE IN THE USER'S VOICE, TO THE APPROVED OUTLINE. NEVER DRIFT IN SILENCE.`

Turn an approved outline into finished prose, or compose a document
when the user asks for one without an outline. Write in the user's
voice. Hold the style constraints as you draft, and clear findings
section by section. The edit gate afterwards should find residue, not
problems. The outline's logical flow carries into the
prose: sentences should carry the reader into the next sentence, and
paragraphs into the next paragraph. Sub-sections build on each other
toward the governing thought.

## Workflow

1. Resolve the source: an outline file carrying `status: approved`
   from `/terse:outline`, or the user's direct request. An outline
   still marked draft goes back for sign-off. For a document longer
   than a few paragraphs with no outline, offer `/terse:outline`
   first; structure is cheap to change before prose exists.
2. Load the voice. If `.terse/voice.md` exists with `status: approved`,
   the expansion writes in the user's measured voice, not the model's
   default. If none exists, offer to learn one from a samples directory
   (the flow is the `style` skill's `references/voice-analysis.md`).
   If the user declines, continue in the `style` skill's default
   voice. Either way, load the `style` skill's rules and read
   `references/claude-defaults.md` before drafting. It names the chat
   habits a first draft produces, and what to do instead:
   - directness where warmth creeps in
   - the depth the genre owes where a chat-sized summary would land
   - the document's named reader in place of the conversation
     partner
3. Set the constraints before drafting. These are the numbers the
   checker measures, so writing to them costs nothing and clearing
   them afterwards costs a rewrite:
   - document grade below 10; keep sentences under 25 words, or below
     grade 10 when they run longer
   - adverbs about 1 per 134 words, passive about 1 per 123,
     qualifiers about 1 per 400
   - an approved voice template's measured ranges bound all of these
   Then the wording. Reach for the plain word: `use`, not `utilize`;
   `strong`, not `robust`; `important`, not `crucial`; `build`, not
   `foster`; `simplify`, not `streamline`. Prefer `is` to `serves as`.
   Say the action with its literal verb: `adopt it`, not
   `it earns its place`. Connect with a period, colon, or comma.
   State a claim once and move on, and list three things when there
   are three. Keep an aside under six words or promote it to its own
   sentence. The `style` skill's Core Ideas and
   `references/claude-defaults.md` hold the rest.
4. Expand section by section, each drafted knowing its place in the
   whole and written to the word budget the outline assigned it. Run
   the checker as you go and fix findings in the section that raised
   them. Grammar is a draft-time finding within
   `references/grammar-scope.md`: correct the typo in the sentence you
   just wrote, where no later rewrite can stale it. Keep the pass
   bounded to that sentence and move on. Finished sections stay
   finished until the whole-document read, and voice-drift and quality
   judgment belong to the edit gate. Shape the prose as you write it:
   - one point per paragraph, stated in the topic sentence
   - the known-new contract: open with what the reader already has;
     end on the new information, where the emphasis falls
   - characters in subjects, actions in verbs
   - each paragraph advances: it gives the reader something the
     paragraph before it did not. Flow and progress are separate. A
     paragraph can honor the known-new contract, read well, and
     still only restate its predecessor in fresh words. That one
     merges into the paragraph it repeats, or you cut it
5. A section that resists the outline is a signal: the outline was wrong,
   or the section does not belong. Break the outline on purpose and
   record in the outline file what changed and why; never drift from
   it in silence. The budget is the same kind of signal. A section
   that lands under half its target usually had a thinner claim than
   it looked. One that runs to double usually holds two claims.
   Both are outline problems, so take them back to the outline rather
   than padding or cramming to hit the number. On a document running to
   thousands of words, expect the outline to update mid-draft. The
   recorded decisions keep later sections consistent with earlier ones.
6. When every section exists, do the whole-document read. It is what
   turns a set of good sections into a document:
   - cadence: compare the sentence-length spread (`--json` gives
     `stats.sentenceLengths`) against the voice template's measured
     range; a flat spread means you assembled the prose instead of
     writing it
   - connective flow: each section's opening should catch the previous
     section's throw; each paragraph's first sentence should need the
     one before it
   - advance: read consecutive paragraphs in pairs and say what the
     second one changed for the reader. Two places need a closer look.
     The paragraph after a strong claim tends to reassert the claim
     instead of supporting it. The closing section tends toward summary
     because every earlier section sits in view while you write it
   - the outline promise: every approved section appears in order and
     makes its assigned claim; the outline file records every
     deviation
   - flow at every level: each subsection makes one point, and that
     point supports its section's claim. The sections in order still
     walk the reader from question to answer
7. Run the checker over the whole document last and report the stats
   line, including the length against the outline's budget. Report
   what you fixed by judgment as well, so the gate knows what it
   inherits: grammar corrections, and any finding no flag covers.
   Offer the highlight preview and `/terse:edit` for the final gate.

## Verification

- [ ] An approved outline drove the structure, or the user chose direct
      composition.
- [ ] The expansion honors the approved voice template when one exists;
      when none exists, the user heard the offer to learn one.
- [ ] The draft held the constraints: grade, the three rates, and the
      plain-word choices.
- [ ] You fixed findings at draft time, grammar included, in the
      section that raised them.
- [ ] Each paragraph makes one point, and sentences follow the
      known-new contract.
- [ ] Each paragraph advances on the one before it; none restates a
      predecessor in fresh words.
- [ ] Sections came in near their budgets, and every departure went
      back to the outline instead of into padding.
- [ ] The outline file records every deviation from the approved
      outline, none silent.
- [ ] The whole-document read happened: cadence against the voice
      range, transitions in sequence, paragraph advance, outline claims
      intact.
- [ ] Every subsection makes one point, and that point supports its
      section's claim and the document's flow.
- [ ] The final checker run, the stats line, and the fixes you made by
      judgment appear in the report.
