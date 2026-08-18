---
name: outline
description: "Compose a document's structure first: bullets with one claim per section, iterated to explicit sign-off before any prose."
---

# Outline

An outline's job is the logical flow of information: which points come
in what order, and how each section builds on the last. Moving bullets
takes seconds where moving polished prose takes an afternoon. So
iterate with the user toward an outline they approve, one that walks
the reader from question to answer and expands into prose later.

## Workflow

1. Name the subject, the reader, and the one question the document
   answers. If the user has not said, ask; do not guess the reader.
   Then state the governing thought: a short summary of the
   answer. The final document supplies the detail. If you cannot keep
   the summary short, check whether the subject is too wide or you
   are writing two documents.
2. Write the outline as its own markdown file from the start, next to
   where the document will live (`<name>-outline.md`). The file is the
   artifact; chat is for discussing it. The governing thought goes at
   the top, with the reader, the question, and the target length beside
   it. Pick the shape for the document type from
   `references/structures.md`. The shape decides where the answer
   goes: memos, reports, specs, and design docs open with it. A
   narrative shape may hold it for a nut graf a few paragraphs in.
   Delay is a placement the shape licenses, never a reveal saved for
   the end.
   Each section gets a heading and a one-line claim: what this section
   asserts, not what it "covers". A section that cannot state its claim
   in one line is two sections or none. Record open judgment calls in
   the file, not only in chat.
3. Budget the weight. Give every section a target word count, and make
   them sum to the document's length. The claim says what a section
   asserts; the budget says how much that assertion is worth. Without
   one the writer spends the same length on every section, and even
   weight across uneven claims reads as padding. Size follows the load
   the claim carries: sections doing the argument's work take the room,
   and setup, transitions, and caveats stay short.
4. Name the evidence and the reasoning. Under each claim, list the
   evidence it will need. For any claim a reader could dispute, add one
   line for the warrant: why that evidence supports that claim.
   Confident assertion hides a missing warrant, so the gap survives
   drafting and surfaces only when a reader disagrees. It costs a line
   here and a section later.
5. Draft the lead in the outline file: the first sentence or two,
   written out rather than described. A lead that will not come is
   usually a structure problem in prose disguise. Drafting it is the
   cheapest test of whether the entry point works. The lead sets up
   the governing thought. The last section is the ask or the decision,
   not a trailing summary. Decide both ends before you write the
   middle.
6. Check the structure, not the style. The checker is useless on
   bullets; these checks are yours:
   - every section supports the governing thought; a bullet serving a
     different point moves out
   - the sections form a question-answer chain: each answers the
     question the previous section raised, and each uses only what an
     earlier section taught
   - the sections are MECE: no two sections make the same point, and
     no gap remains in what the governing thought promises
   - sibling sections sit at the same level of abstraction; one much
     narrower or wider than its peers belongs a level down or up
   - the opening sets up the governing thought: the situation, the
     complication, and the question the answer resolves
   - the last section is the ask or the decision, not a trailing summary
   - the budget tracks the claims: no section takes room it has
     nothing to say in
   - nothing critical is missing: the evidence named under each claim
     exists, and disputable claims carry a warrant
   Overlapping sections fail the outline. So does a section that
   floats free of the governing thought, or an opening that skips the
   setup. Rework these before showing the user.
7. Iterate by editing the outline file until the user approves. Approval
   is explicit; never proceed on your own judgment. On approval, mark
   the outline file approved and hand off to `/terse:write`, so the
   approved structure survives as its own record.
8. Stay open after approval. A section that resists drafting is
   evidence about the outline, not a writing problem to push through.
   When `/terse:write` reports resistance, come back here and fix the
   claim, the order, or the budget in the file. Never let the draft
   drift away from it. Cutting, adding, or reordering a section needs
   the user's approval again, as does any change to the governing
   thought. Re-budgeting within the approved sections does not. Record
   what changed and why, so the file stays the record `/terse:edit`
   checks each section against.

## Verification

- [ ] You named the reader and the one question before outlining.
- [ ] The governing thought is a short summary at the top of the
      outline file, and every section supports it.
- [ ] The shape came from `references/structures.md`, and the answer
      appears where that shape places it.
- [ ] Every outline section carries a one-line claim.
- [ ] Every section carries a word budget, and the budgets sum to the
      target length.
- [ ] Disputable claims name both their evidence and their warrant.
- [ ] You drafted the lead in the file, and the last section is the
      ask or the decision.
- [ ] The sections pass the question-answer chain, MECE, and sibling
      abstraction checks.
- [ ] Open judgment calls live in the outline file, not only in chat.
- [ ] The user explicitly approved the outline, and the file records
      the approval.
- [ ] The file records changes made after approval, and the user
      re-approved structural ones.
