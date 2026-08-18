# Changelog

Notable changes to Terse. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
