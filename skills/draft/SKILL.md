---
name: draft
description: "Compose a document outline-first: polish the structure as bullets, get sign-off, then expand into finished prose."
---

# Draft

Write new documents in two phases: structure first, prose second. An
outline is the whole document made cheap to change; reordering bullets
takes seconds where reordering polished prose takes an afternoon. The
user approves the outline before any prose exists, so human judgment is
spent at the cheap layer and machine effort only after.

## Phase 1: the outline

1. Pin the subject, the named reader, and the one question the document
   answers. If the user has not said, ask; do not guess the reader.
2. Produce the outline as bullets. Each section gets a heading and a
   one-line claim: what this section asserts, not what it "covers". A
   section that cannot state its claim in one line is two sections or
   none.
3. Check the structure, not the style. The checker is useless on
   bullets; these checks are yours:
   - the sections sit in knowledge order: each uses only what an
     earlier section taught
   - every section advances the one question; a bullet serving a
     different question moves out
   - the last section is the ask or the decision, not a trailing summary
   - nothing load-critical is missing: name the evidence each claim
     will need, so gaps surface now
4. Iterate with the user in chat until they approve. Approval is
   explicit; never begin Phase 2 on your own judgment. Record the
   approved outline at the top of the working file as a comment.

## Phase 2: the expansion

5. If `.terse/voice.md` exists with `status: approved`, load it; the
   expansion writes in the user's measured voice, not the model's
   default. Load the `writing` skill's rules either way.
6. Expand section by section, each drafted knowing its place in the
   whole. Run the checker as you go and fix flags at draft time; do not
   save a cleanup pass for later.
7. When every section exists, do the whole-document read. This step is
   not optional:
   - cadence: compare sentence-length spread (`--json` gives
     `stats.sentenceLengths`) against the voice template's measured
     range; a flat spread means the prose was assembled, not written
   - connective flow: each section's opening should catch the previous
     section's throw; each paragraph's first sentence should need the
     one before it
   - the outline promise: every section still makes the claim the
     approved outline assigned it
8. Run the full checker last and report the stats line. Offer the
   highlight preview.

## Verification

- [ ] The reader and the one question were named before outlining.
- [ ] Every outline section carries a one-line claim.
- [ ] The user explicitly approved the outline before expansion began.
- [ ] The expansion honors the approved voice template when one exists.
- [ ] The whole-document read happened: cadence checked against the
      voice range, transitions read in sequence, outline claims intact.
- [ ] The final checker run and stats line appear in the report.
