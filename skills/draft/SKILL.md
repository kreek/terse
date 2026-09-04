---
name: draft
description: "The expansion phase of the Terse write workflow, usable on its own. Write anything a reader will see, however short: issues and tickets (GitHub, GHE, Jira), PR descriptions and comments, emails, ADRs, change requests, design docs, specs, READMEs, blog posts, articles, white papers, bid responses, or an approved outline expanded. The user's voice, checked at draft time."
---

# Draft

## Iron Law

`WRITE IN THE USER'S VOICE, TO THE APPROVED OUTLINE. NEVER DRIFT IN SILENCE.`

Draft short, then expand under proof. The first draft is the
outline's claims as bare prose. Every sentence added after that
answers a question the reader would ask at that spot. Too short is
the cheap failure: the user and the edit gate can ask for more, and
nobody asks for less. Write in the user's voice, hold the style
constraints as you draft, and clear findings section by section.

Why expand rather than cut: cutting a padded draft means judging your
own sentence unnecessary, the judgment a model makes worst. Expanding
a bare one means naming a missing fact, which you can check.

## Workflow

1. Resolve the source: an outline file marked `status: approved`
   from the Terse outline skill, or the user's direct request. An outline
   still marked draft goes back for sign-off. For a document longer
   than a few paragraphs with no outline, offer the Terse write skill. It
   runs the outline, this skill, and the gate in sequence, and
   structure is cheap to change before prose exists. Short
   pieces are in scope, not exempt. An issue, a ticket, a PR
   description, or a comment under 200 words skips the skeleton
   checkpoint and the whole-document read. It takes the voice, the
   constraints, the skeleton, and the expansion.
2. Load the voice. If `.terse/voice.md` exists with `status: approved`,
   the expansion writes in the user's measured voice, not the model's
   default. If none exists, offer to learn one from a samples directory
   (the flow is the `style` skill's
   `../style/references/voice-analysis.md`).
   If the user declines, continue in the `style` skill's default
   voice. Either way, load the `style` skill's rules and read
   `../style/references/model-defaults.md`
   before drafting. It names the chat
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
   - the first paragraph under 90 words, opening on the fact the
     reader came for
   - adverbs about 1 per 134 words, passive about 1 per 123,
     qualifiers about 1 per 400
   - an approved voice template's measured ranges bound all of these
   - issues, specs, and acceptance criteria stay impersonal: state the
     requirement rather than the wish for it, and run the checker with
     `--impersonal`
   - the expansion ceiling for the document type, from the table in
     step 5. The outline's budgets are ceilings too: a section may
     come in under its number, never over
   Then the wording. Reach for the plain word: `use`, not `utilize`;
   `strong`, not `robust`; `important`, not `crucial`; `build`, not
   `foster`; `simplify`, not `streamline`. Prefer `is` to `serves as`.
   Say the action with its literal verb: `adopt it`, not
   `it earns its place`. Test any verb whose subject cannot do the
   action the same way: a log does not `buy` you anything. An action
   standing as subject or object takes a gerund or a full clause:
   `renaming`, never `a rename`, unless the noun is the domain's own
   term (`a commit`). Connect with a period, colon, or comma.
   State a claim once and move on, and list three things when there
   are three. Keep an aside under six words or promote it to its own
   sentence. Put a source inline, as a link on the words it
   supports, and never in a list at the end. Copy each quotation from
   its open source, word for word. Put the link on the quoted words
   as a text-fragment URL (`#:~:text=`), so it opens with the quote
   highlighted. Never quote from memory: the gate runs
   `scripts/quote-check.mjs`, which proves every quotation against
   its source and flags the rest. The `style` skill's Core
   Ideas and `../style/references/model-defaults.md` hold the rest.
4. Write the skeleton. Each section is its outline claim, stated in
   one or two sentences, plus the evidence the outline listed under a
   claim it marked disputable. With no outline, write the claims first
   as one line each, then state them. Leave out setup, transitions,
   examples, and restatement. The skeleton may read like a telegram.
   It is the shortest document that makes every claim, and the
   measure for the final draft. Run the checker on it and record the
   word count. For a document over 200 words, show the skeleton to
   the user before expanding, with the additions you propose listed
   under it. The user may have approved the structure in advance, or
   said the session cannot take input. Then write the skeleton and
   the list to the skeleton file and continue without stopping. Each addition is one line: the section, the reader
   question from step 5, and the sentence in brief. The user strikes
   or adds items, and one approval covers the skeleton and the list. The
   skeleton is the cheapest version to judge, and a claim that reads
   wrong here costs a line rather than a section. Expect it to be
   close to the finished document; the additions are a handful of
   sentences, not a second draft.
5. Expand under burden of proof, section by section. A sentence goes
   in only when it answers a question the reader asks at that point in
   the document. Name the question before writing the answer, in a
   working note beside the draft, and keep the note until the report.
   The reader may ask five questions:
   - a term the reader does not own yet: define it once, where it
     first appears
   - a claim the outline marked disputable: give the evidence and the
     warrant
   - a step the reader must take: state the action
   - a consequence the reader would not infer: state it
   - a sentence the reader must read twice: expand it until one pass
     carries it. The metrics reward compression: a short sentence
     scores a low grade and raises no flags. Only this question
     forces the words back in. Anchor an abstract ordering in the
     concrete: "broad to narrow" becomes "a domain first, an event
     last". Give a semicolon aphorism its full clause
   A sentence with no question behind it stays out, however well it
   reads. Add an example only as evidence for a disputable claim. Add
   a transition only when the order alone does not carry the reader;
   the known-new contract carries most of them. The room goes to the
   second question. A disputable claim takes the evidence
   and the warrant, and the cost of the position the document rejects.
   The other questions take a sentence, or a few added words, each. A
   paragraph whose claim nobody would contest stays at its skeleton
   length. Do not spread the expansion across sections the way a trim
   spreads cuts; an even expansion reads as padding.
   The expansion ratio is final words over skeleton words. Hold it
   under the ceiling for the document type:

   | Type | Ceiling |
   |---|---|
   | issue, ticket, PR description, comment | 1.25x |
   | README, ADR, email, memo, summary | 1.5x |
   | design doc, explainer, article | 2x |

   The ceiling is a backstop, not a target; the question list is the
   real bound, and most documents land well under. An overrun blocks.
   Cut the sentences with the weakest questions until the draft is
   under, and say so in the report. A claim and its warrant travel
   together. Cutting the reasoning that ties a sentence to its
   section leaves a non sequitur, so cut both or keep both. Run the
   checker as you go and fix findings in the section that raised
   them. Grammar is a draft-time finding within the `style` skill's
   `../style/references/grammar-scope.md`: correct the typo in the sentence
   you just wrote. Shape each added sentence as you write it:
   - one point per paragraph, stated in the topic sentence
   - the known-new contract: open on what the reader has, end on the
     new information
   - characters in subjects, actions in verbs
6. A section that resists the outline is a signal: the outline was wrong,
   or the section does not belong. Break the outline on purpose and
   record in the outline file what changed and why; never drift from
   it in silence. A section with no question beyond its skeleton had
   a thinner claim than the outline thought. One whose questions run
   past its ceiling holds two claims more often than not. A document that lands at
   two thirds of its target is the expected outcome, not a shortfall.
   Report it as the length the claims needed.
   Both are outline problems, so take them back to the outline rather
   than padding or cramming. On a document running to thousands of
   words, expect the outline to update mid-draft. The recorded
   decisions keep later sections consistent with earlier ones.
7. When every section exists, do the whole-document read. It is what
   turns a set of good sections into a document:
   - cadence: compare the sentence-length spread (`--json` gives
     `stats.sentenceLengths`) against the voice template's measured
     range. A short draft sits at the low end of the range. Leave it
     there; longer sentences are not the fix
   - connective flow: each section's opening should catch the previous
     section's throw; each paragraph's first sentence should need the
     one before it. Restore a broken link by reordering, never by
     adding a connective sentence; that is where padding returns
   - advance: write one line per paragraph stating the claim it makes,
     and hold each paragraph against every earlier claim, not only its
     predecessor. A paragraph that repeats a claim from three sections
     back merges or goes, the same as one that repeats the paragraph
     before it. A match is only a repeat when the later paragraph
     brings nothing new; added evidence, a qualification, or a new
     consequence is an advance
   - the outline promise: every approved section appears in order and
     makes its assigned claim. The outline file records every
     deviation
   - flow at every level: each subsection makes one point, and that
     point supports its section's claim. The sections in order still
     walk the reader from question to answer
8. Run the checker over the whole document last, and
   `scripts/outline-check.mjs` beside it when an approved outline
   exists. Report the stats line, the length against the outline's
   budget, and the expansion ratio against its ceiling. Report what you fixed by judgment as
   well, so the gate knows what it inherits. That covers grammar
   corrections, any finding no flag covers, and any sentence kept
   without a recorded question. Offer the highlight preview and
   the Terse edit skill for the final gate. If the reader needs more than
   the draft gives, the user says where, and that section expands
   under the same proof.

## Verification

- [ ] An approved outline drove the structure, or the user chose direct
      composition.
- [ ] The expansion honors the approved voice template when one exists;
      when none exists, the user heard the offer to learn one.
- [ ] The draft held the constraints: grade, the three rates, the
      plain-word choices, and the expansion ceiling.
- [ ] Every quotation came from its open source, word for word, with
      a text-fragment link on the quoted words.
- [ ] A skeleton existed before any expansion, and the report states
      its word count.
- [ ] A document over 200 words showed the user the skeleton with the
      proposed additions listed, for one approval.
- [ ] Every sentence beyond the skeleton answers one of the five
      allowed questions, and the working note records which.
- [ ] No sentence kept its skeleton compression: abstract orderings
      carry a concrete anchor, and no claim leans on reasoning the
      draft cut.
- [ ] The expansion ratio is under the ceiling for the document type,
      or the report says what was cut to get there.
- [ ] The expansion went to the disputable claims; uncontested
      sections stayed at skeleton length.
- [ ] You fixed findings at draft time, grammar included, in the
      section that raised them.
- [ ] Each paragraph makes one point, and sentences follow the
      known-new contract.
- [ ] Each paragraph advances on every paragraph before it; none
      restates an earlier claim in fresh words, at any distance.
- [ ] Sections came in at or under their budgets, and every departure
      went back to the outline instead of into padding.
- [ ] The outline file records every deviation from the approved
      outline, none silent.
- [ ] The whole-document read happened: cadence against the voice
      range, transitions in order, paragraph advance, outline claims
      intact.
- [ ] No connective sentence went in to restore flow.
- [ ] Every subsection makes one point, and that point supports its
      section's claim and the document's flow.
- [ ] The final checker run, the stats line with the expansion ratio,
      and the fixes you made by judgment appear in the report.
