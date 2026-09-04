---
name: brainstorm
description: "Find the angle before any outline: diverge on candidate readers, questions, and governing thoughts, then converge with the user on one approved brief. Use when the user wants to write but has not settled the subject, the reader, or the angle."
---

# Brainstorm

## Iron Law

`DIVERGE BEFORE YOU CONVERGE. NO OUTLINE, NO PROSE, UNTIL THE USER PICKS AN ANGLE.`

The Terse outline skill starts from a named reader and one question.
This skill finds them. A vague request ("write something about the
migration") hides a choice among documents, each with its own reader
and stakes. Naming the candidates costs minutes; finding the wrong
angle after the draft costs the document. So diverge first, then
converge with the user on one angle, recorded as a brief the outline
skill reads.

## Workflow

1. Gather what the user already knows. Ask for the territory, the occasion (why
   write now), and the constraints: venue, length, deadline. Take
   what the user offers and go; this skill exists because the rest is
   open. An issue, a PR description, a comment, or a short email
   under 200 words never needs this skill; offer the Terse draft
   skill instead.
2. Diverge. Propose three to five candidate angles as bullets in
   chat. Each angle names a reader, the one question that reader is
   asking, and a candidate governing thought: the answer in one or
   two sentences. Make the angles compete on readers and stakes. Two
   angles that share a reader and a question are one angle worded
   twice, so cut one.
3. Iterate in chat. The user reacts; angles merge, sharpen, or die.
   Stay in bullets: no outline and no prose exist yet, so every
   change costs a line. Add fresh angles when the user's reactions
   point somewhere the first round missed.
4. Converge. The user picks one angle. The pick is explicit; never
   proceed on your own judgment. Write `<name>-brainstorm.md` next to
   where the document will live. The brief holds the subject, the
   reader, the one question, the governing thought, and a proposed
   length. It ends with the discarded angles, one line each with the
   reason, because the reasons become scope cuts the outline can
   cite. Mark the file `status: approved (user, YYYY-MM-DD)`.
5. Hand off to the Terse outline skill. Its first step takes the
   subject, the reader, the question, and the length from the brief.
   The brief may suggest a document shape; the outline skill owns
   that choice through its `references/structures.md`. When outlining
   shows the angle was wrong, come back here: a dead angle is a
   brainstorm finding, not an outline problem.

## Verification

- [ ] The request lacked a settled subject, reader, or angle, and a
      short piece under 200 words went to the Terse draft skill
      instead.
- [ ] The first round held three to five angles, each with its own
      reader, question, and governing thought.
- [ ] No two angles shared a reader and a question.
- [ ] No outline and no prose existed before the user picked.
- [ ] The user's pick was explicit, and the brief records it with a
      status line.
- [ ] The brief holds the subject, the reader, the question, the
      governing thought, the proposed length, and the discarded
      angles with their reasons.
