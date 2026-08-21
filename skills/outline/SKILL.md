---
name: outline
description: "Compose a document's structure first: bullets with one claim per section, iterated to explicit sign-off before any prose."
---

# Outline

## Iron Law

`NAME THE READER, THE QUESTION, THE GOVERNING THOUGHT. NO PROSE BEFORE THE USER APPROVES.`

An outline's job is the logical flow of information: which points come
in what order, and how each section builds on the last. Moving bullets
takes seconds where moving polished prose takes an afternoon. So
iterate with the user toward an outline they approve. It should walk
the reader from question to answer, ready to expand into prose later.

## Workflow

1. Name the subject, the reader, the one question the document
   answers, and the target length. If the user has not said, ask; do
   not guess the reader. When the user has no length in mind, propose
   one and get agreement, because step 3 budgets every section against
   it. Then state the governing thought: the answer in one or two
   sentences. The final document supplies the detail. If it will not
   fit in two, check whether the subject is too wide or you are
   writing two documents.
2. Write the outline as its own markdown file from the start, next to
   where the document will live (`<name>-outline.md`). The file is the
   artifact; chat is for discussing it, and open judgment calls live
   there too. The governing thought goes at the top, with the reader,
   the question, and the target length beside it. Pick the shape for
   the document type from `references/structures.md`. The shape
   decides where the answer goes: memos, reports, PRDs, and design
   docs open with it. A narrative shape may hold it for a nut graf a
   few paragraphs in. Delay is a placement the shape licenses, never
   a reveal saved for the end.
   Each section gets a heading and a one-line claim: what this section
   asserts, not what it "covers". A section that cannot state its claim
   in one line is two sections or none.
3. Budget the weight. Give every section the word count its claim
   needs, then sum the budgets and report the sum against the user's
   target. Do not distribute the target across sections; the writer
   treats a number handed down as a quota and fills it. The claim
   says what a section asserts; the budget says how much that
   assertion is worth. Size follows the load the claim carries. A
   disputable claim takes its evidence and warrant. An uncontested
   one takes a sentence or two. Setup, transitions, and caveats stay
   short. A sum well
   under the target is the normal case, and the outline says so. A
   sum over the target means the document holds more claims than the
   reader asked for, so cut sections rather than shrink them. Every
   budget is a ceiling: `/terse:write` drafts each section short and
   expands only under proof.
4. Name the evidence and the reasoning. Under each claim, list the
   evidence it will need. For any claim a reader could dispute, add one
   line for the warrant: why that evidence supports that claim.
   Confident assertion hides a missing warrant, so the gap survives
   drafting and surfaces only when a reader disagrees. It costs a line
   here and a section later.
5. Draft the lead in the outline file: the first sentence or two,
   written out rather than described. It is the one prose the law
   allows, and the cheapest test of the entry point. A lead that will
   not come is most often a structure problem in prose disguise. The lead
   sets up the governing thought. The last section is the ask or the
   decision, not a trailing summary. Decide both ends before you write
   the middle.
6. Check the structure, not the style. The checker judges prose, so on
   bullets it grades fragments and returns noise; these checks are
   yours:
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
     nothing to say in, and no answer-carrying section gets a
     caveat's budget
   - the budgets sum to less than the target
   - nothing critical is missing: the evidence under each claim is on
     hand rather than only named, and disputable claims carry a
     warrant

   Rework anything these checks catch before showing the user.
7. Iterate by editing the outline file until the user approves. Approval
   is explicit; never proceed on your own judgment. On approval, write
   `status: approved (user, YYYY-MM-DD)` at the top of the outline
   file. Hand off to `/terse:write`, which reads that line to tell an
   approved outline from a draft. The structure then survives as its
   own record.
8. Stay open after approval. A section that resists drafting is
   evidence about the outline, not a writing problem to push through.
   When `/terse:write` reports resistance, come back here and fix the
   claim, the order, or the budget in the file. The draft may depart
   from the outline, never in silence: record the departure here
   before the next section. Cutting, adding, or reordering a section
   needs the user's approval again, as does any change to the
   governing thought. Re-budgeting within the approved sections does
   not. Record what changed and why, so the file stays the record
   `/terse:edit` checks each section against.

## Verification

- [ ] You named the subject, the reader, the one question, and the
      target length before outlining.
- [ ] The governing thought is a short summary at the top of the
      outline file, and every section supports it.
- [ ] The shape came from `references/structures.md`, and the answer
      appears where that shape places it.
- [ ] Every outline section carries a one-line claim.
- [ ] Every section carries the budget its claim needs, and the
      outline reports the sum against the target rather than filling
      it.
- [ ] Every claim names its evidence, and disputable claims add a
      warrant.
- [ ] You drafted the lead in the file, and the last section is the
      ask or the decision.
- [ ] The sections pass the question-answer chain, MECE, and sibling
      abstraction checks.
- [ ] Open judgment calls live in the outline file, not only in chat.
- [ ] The user's approval of the outline was explicit, and the file
      records it.
- [ ] The file records changes made after approval, and the user
      re-approved structural ones.
