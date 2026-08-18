# Changelog

Notable changes to Terse. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] (2026-08-18)

### Changed

- The `writing` skill is now the `style` skill. Same trigger, same
  role; the old name sat three letters from `/write` and confused the
  listing. Voice templates, references, and eval graders follow the
  new name.
- The three phase skills open with an Iron Law, each distilled from
  rules the skill already enforces.
- The README explains all four skills and how they hand off through
  the outline file, opens with the three-phase process, and adds a
  local-testing install recipe. Terse is a writing system, not a
  writing editor, and the manifests agree.
- User-facing surfaces say "point" where the skill bodies define and
  keep "claim".

## [0.4.0] (2026-08-18)

### Added

- Word budgets. The outline assigns every section a target word count
  summing to the document's length. Write drafts to the budget and
  treats big misses as outline signals: a section far under target
  had a thinner claim, one at double holds two claims. Edit checks
  length against the budget and flags overruns.
- Evidence and warrants. Under each claim the outline lists the
  evidence it needs; disputable claims add one line for why that
  evidence supports the claim. Edit checks that marked claims still
  show their evidence.
- The drafted lead. The outline writes out the first sentence or two
  as the cheapest test of the entry point, and decides both ends
  before any middle.
- Trim mode in edit ("cut 15%", "this runs long"). Cuts are
  structural: proposed against the reverse outline, approved by the
  user, and made by removing whole units. Trimming a claim to fit is
  a meaning change wearing a length excuse.
- The advance check. Flow and progress are separate: a paragraph can
  read well and still restate its predecessor. Write and edit both
  read consecutive paragraphs in pairs, watching the paragraph after
  a strong claim and the closing section.
- Re-approval rules. The outline stays open after approval: cutting,
  adding, or reordering a section needs the user's approval again;
  re-budgeting within approved sections does not.

### Changed

- The shape decides where the answer goes: memos, reports, specs, and
  design docs open with it, while a narrative shape may hold it for a
  nut graf. Delay is a placement the shape licenses, never a reveal
  saved for the end.
- The reverse-outline audit in edit runs four more checks:
  restatement, length against target, the outline's promises, and
  the outline's record. Deviations logged during drafting count as
  decided keeps.

## [0.3.0] (2026-08-18)

### Added

- Stock figures as AI tells. The checker lexicon catches the common
  ones (earns its place, moves the needle, heavy lifting, low-hanging
  fruit, secret sauce, table stakes, at the end of the day). The
  writing skill carries the translation test for the rest: if the
  literal verb loses nothing, the figure is a finding. Metaphor stays
  for explaining mechanisms, not for stating decisions.
- Flow at every level. The write skill's whole-document read and the
  edit skill's reverse-outline audit both check that each subsection
  makes one point, that point supports its section's claim, and the
  sections in order walk the reader from question to answer.

### Changed

- The skill docs pass their own checker. Slogan openers cut,
  figurative verbs replaced with plain ones, passives given actors,
  hard sentences split into sub-bullets.
- The outline intro states the goal: the logical flow of information,
  iterated with the user to an approved outline that walks the reader
  from question to answer.
- The governing thought is a short summary of the answer, not a
  one-sentence absolute; failing to keep it short is a signal to
  check the subject's width, not a verdict.

## [0.2.0] (2026-08-18)

### Added

- `/terse:draft`: outline-first composition. You polish the structure
  as bullets with a one-line claim per section, and you sign off
  before any prose exists. The outline lives as its own markdown file
  and survives as a record beside the expanded document. Expansion
  writes each section in the approved voice and ends with a
  whole-document read.
- The highlight preview (`scripts/render-highlights.mjs`): one
  read-only page per document with no outside assets. Rendered
  markdown, washes for long passages, underlines for word fixes,
  hover hints, chips that filter by category, a quality score. You
  direct fixes in chat.
- `ai-tell` category: machine-writing phrases and banned vocabulary,
  plus structural patterns. Those cover negation triples, stop-start
  slogans, triadic `whether` openers, and `it's not X, it's Y`.
- `weak-verb` category: 27 phrases where a plain verb does the job,
  each hinting the verb.
- `aside` category for long parentheticals, and a document-grade gate.
- Flags carry character spans, so previews mark the exact phrase.
- Eval suite (`evals/`) in `claude plugin eval` format, with a
  fallback runner and a post-scorer that gates on the ablation delta.
- Property and contract tests: input conservation, metamorphic
  relations, the CLI exit-code contract. 84 tests.

### Changed

- Sentence flags are length-led, calibrated against 514 sentences of
  Hemingway's journalism. The old grade-only rule flagged 26.8% of the
  calibration corpus; the new rule flags 13.2%.
- Count targets retuned against 7,355 words of the same corpus:
  adverbs n/134, passive n/123, qualifiers n/400.
- `rather than` no longer reads as a hedge; `Grammarly` no longer
  reads as an adverb.
- `/terse:edit` ends with a whole-section re-read and a cadence check
  against the voice range, so local fixes cannot flatten rhythm
  unnoticed.

## [0.1.0] (2026-08-17)

Initial release: the mechanical checker, the writing/check/edit/
analyze/proof/tone/review skills, and voice templates with sign-off.
