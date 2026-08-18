---
name: outline
description: "Compose a document's structure first: bullets with one claim per section, iterated to explicit sign-off before any prose."
---

# Outline

Structure while it is cheap to change. An outline is the whole document
made cheap to reorder; moving bullets takes seconds where moving
polished prose takes an afternoon. The user approves the outline before
any prose exists, so human judgment lands at the cheap layer and
machine effort only after.

## Workflow

1. Pin the subject, the named reader, and the one question the document
   answers. If the user has not said, ask; do not guess the reader.
   Then state the governing thought: the answer to that question in one
   sentence. An answer that will not fit one sentence means two
   documents, or a subject still too wide.
2. Write the outline as its own markdown file from the start, next to
   where the document will live (`<name>-outline.md`). The file is the
   artifact; chat is for discussing it. The governing thought goes at
   the top. Pick the shape for the document type from
   `references/structures.md`. Whatever the shape, the answer lands
   early and the sections support it; never hold it for a reveal at
   the end.
   Each section gets a heading and a one-line claim: what this section
   asserts, not what it "covers". A section that cannot state its claim
   in one line is two sections or none. Record open judgment calls in
   the file, not only in chat.
3. Check the structure, not the style. The checker is useless on
   bullets; these checks are yours:
   - every section supports the governing thought; a bullet serving a
     different point moves out
   - the sections form a question-answer chain: each answers the
     question the previous section raised, and each uses only what an
     earlier section taught
   - the sections are MECE: no two sections make the same point, and
     no gap remains in what the governing thought promises
   - the opening sets up the governing thought: the situation, the
     complication, and the question the answer resolves
   - the last section is the ask or the decision, not a trailing summary
   - nothing critical is missing: name the evidence each claim will
     need, so gaps surface now
   Overlapping sections fail the outline. So does a section that
   floats free of the governing thought, or an opening that skips the
   setup. Rework these before showing the user.
4. Iterate by editing the outline file until the user approves. Approval
   is explicit; never proceed on your own judgment. On approval, mark
   the outline file approved and hand off to `/terse:write`, so the
   approved structure survives as its own record.

## Verification

- [ ] The reader and the one question were named before outlining.
- [ ] The governing thought is one sentence at the top of the outline
      file, and every section supports it.
- [ ] The sections pass the question-answer chain and MECE checks.
- [ ] Every outline section carries a one-line claim.
- [ ] Open judgment calls live in the outline file, not only in chat.
- [ ] The user explicitly approved the outline, and the approval is
      marked in the file.
