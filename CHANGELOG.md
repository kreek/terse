# Changelog

Notable changes to Terse. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The `write` skill drafts short and expands under proof. The first
  draft is the outline's claims as bare prose, shown to the user on
  documents over 200 words. Every sentence added after that answers
  one of four reader questions, recorded in a working note. The
  expansion ratio, final words over skeleton words, has a ceiling per
  document type, and an overrun blocks. Outline budgets are ceilings,
  trim mode cuts unasked sentences first, and the findings contract
  gains an `unasked` finding.
- The skeleton checkpoint lists the proposed additions for one
  approval. Expansion concentrates on disputable claims. The ceilings
  are 1.25x, 1.5x, and 2x. Outline budgets come from the claims and
  report their sum against the target. The edit gate audits a short
  draft for omission.

- Restatement detection at any distance. The reverse outline now
  records the claim each paragraph makes, and the repetition audit
  groups paragraphs by claim across the whole document. A claim in
  two or more paragraphs emits one `structure` finding that lists the
  group and names the keep. A later instance that adds evidence, a
  qualification, or a consequence emits nothing. The `write` skill's
  advance check holds each paragraph against every earlier claim, not
  only its predecessor.

## [0.8.0] (2026-08-20)

### Added

- The claudism families from the community lists, eight of them, from
  anthropomorphized code-speak to sign-off tics. The corpus tests pin
  recall on every family, and the Hemingway corpus still shows zero
  lexical false positives.
- Inflection coverage. One base form now covers a word's family, so
  `delved` flags with `delve`.
- Caution on single words. A bare word is a tell only when it has no
  everyday literal sense. A word with one flags only in its tell
  frame. `testament to` flags where a last will and testament does
  not, and a test harness never trips `harness the power`. Words with
  plain synonyms (`robust`, `crucial`, `seamless`, `streamline`)
  moved to the wordy list, where the flag carries the swap. A
  dedicated test block pins the literal senses.
- `very` is a qualifier. `the very least` stays, as emphasis on a
  noun rather than a hedge on a claim.
- A spaced en dash flags as an em dash in disguise; ranges like `3–5`
  stay.
- `<!-- terse-ignore -->` records a keep in the file itself. A bare
  comment suppresses the next line's findings; named categories
  narrow it.
- Lexical findings inside quotes and blockquotes stay silent. The
  quoted author owns them, as the grammar scope already ruled.
- An always-on hook (`hooks/hooks.json`). With `TERSE_HOOK=1` set,
  every markdown write runs the checker and feeds the flags back
  into the session.
- More irregular participles and predicative adjectives, so
  `was spoken` flags and `is complicated` does not.

### Fixed

- The fallback eval runner fails fast without `ANTHROPIC_API_KEY`.
  Its `--bare` sessions never read OAuth, so on a subscription login
  every run died at exit 1 and the report scored nothing.
- The fallback runner carries case tags, so the scorer applies the
  grammar-parity rule. A style case where both arms come out clean
  now passes instead of failing on zero against zero.
- Repeated matches in one sentence get their own spans, so the
  highlight view marks the second `maybe`, not the first one twice.
- `I/O` and `i.e.` no longer read as personal pronouns under
  `--impersonal`, and `the same kind of signal` is no longer a hedge.
- Cross-skill references name their full paths, so `/terse:write` and
  `/terse:edit` find the style references without hunting.

## [0.7.0] (2026-08-19)

### Added

- Four outline shapes: ADR, change request, white paper, and bid
  response. The bid response carries a rule the others do not. The
  buyer's structure and vocabulary win, so the `style` skill's word
  choices become documented keeps rather than fixes.
- A fallback for document types the list does not name. Take the
  closest shape and adapt it, because an unlisted type is often a
  listed one with a different audience.

### Changed

- `/terse:write` fires on far more than documents. Its description
  claimed "a document from an approved outline", so a Jira ticket or a
  two-line issue comment never matched. It now names the artifacts and
  the platforms, since the nouns are what a matcher reads.
- Short pieces are in scope, not exempt. Anything under 200 words
  stops at step 4 with the voice, the constraints, and the draft. It
  skips the whole-document read that would mean nothing on a comment.
- Git ignores `drafts/`, the scratch area for skill output.

## [0.6.0] (2026-08-19)

### Added

- The `long-opening` check. "Use short sentences. Use short first
  paragraphs" opened the Kansas City Star style sheet; Terse encoded
  the first rule and not the second. A first paragraph of 90 words or
  more now flags. The threshold sits one word above the longest
  opening in `samples/hemingway`, the regression corpus for it.
- The `preference` check. A requirement filed as a wish, as in
  `I would like this` or `it would be nice if`, is something a reader
  can decline. The checker points at the requirement instead.
- `--impersonal`, and the `personal-pronoun` check behind it. Issues,
  specs, and acceptance criteria drop first and second person. Prose
  written for a reader keeps its "you", so the rule stays opt-in. The
  write and edit skills pass the flag for those genres.
- Two Core Ideas in the `style` skill. "The particular, not the
  abstraction" asks for the service, the number, and the date. "Say
  what is, not what isn't" is the Kansas City Star's fourth rule, and
  it holds hardest for instructions.
- Issue or bug report and acceptance criteria are outline shapes.
  Neither existed, which is part of why drafts of both fell back on
  conversational framing.

### Changed

- Two of the new checks are always on, so drafts that passed 0.5.0 can
  flag now. Expect `long-opening` and `preference` findings on existing
  files.
- Draft-time checking in `/terse:write` means the findings model, not
  the checker alone. The skill fixes grammar inside `grammar-scope.md`
  in the sentence that raised it, and reads `claude-defaults.md`
  before drafting. A constraints step front-loads the numbers.
- `/terse:edit` loads the voice template and the style rules before
  the collection read that needs them, rather than two steps after.
  Report-only names what the document does well and closes with the
  mode that fixes each category. This release removed the `length`
  category, which the findings contract never defined.
- `/terse:outline` now collects the target length that anchors its
  budgets. It names the `status: approved (user, DATE)` marker the
  other skills read, and permits recorded deviation rather than
  forbidding all drift.
- User-facing surfaces say "claim", reversing the 0.5.0 split that
  kept "point" outside the skill bodies. One term wherever the text
  means the section-level unit; "point" stays for the paragraph.
- A tripwire records why Terse does not borrow Hemingway's iceberg.
  Omission makes a fiction reader supply the feeling and a document
  reader supply a guess.

## [0.5.0] (2026-08-18)

### Changed

- The `writing` skill is now the `style` skill. Same trigger, same
  role; the old name sat three letters from `/write` and confused the
  listing. Voice templates, references, and eval graders follow the
  new name.
- The three phase skills open with an Iron Law, each distilled from
  rules the skill already enforces.
- The README explains all four skills and how they hand off through
  the outline file. It opens with the three-phase process and adds a
  local-testing install recipe. Terse is a writing system, not a
  writing editor, and the manifests agree.
- User-facing surfaces say "point" where the skill bodies define and
  keep "claim".

## [0.4.0] (2026-08-18)

### Added

- Word budgets. The outline assigns every section a target word count
  summing to the document's length. Write drafts to the budget and
  treats big misses as outline signals. A section far under target
  had a thinner claim; one at double holds two claims. Edit checks
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

- The shape decides where the answer goes. Memos, reports, specs, and
  design docs open with it; a narrative shape may hold it for a nut
  graf. Delay is a placement the shape licenses, never a reveal saved
  for the end.
- The reverse-outline audit in edit runs four more checks:
  restatement, length against target, the outline's promises, and
  the outline's record. Deviations logged during drafting count as
  decided keeps.

## [0.3.0] (2026-08-18)

### Added

- Stock figures as AI tells. The checker lexicon catches the common
  ones: `earns its place`, `moves the needle`, `heavy lifting`,
  `low-hanging fruit`, `secret sauce`, `table stakes`,
  `at the end of the day`. The writing skill carries the translation
  test for the rest: if the literal verb loses nothing, the figure is
  a finding. Metaphor stays for explaining mechanisms, not for
  stating decisions.
- Flow at every level. The write skill's whole-document read and the
  edit skill's reverse-outline audit run the same check. Each
  subsection makes one point, that point supports its section's
  claim, and the sections in order walk the reader from question to
  answer.

### Changed

- The skill docs pass their own checker. Slogan openers cut,
  figurative verbs replaced with plain ones, passives given actors,
  hard sentences split into sub-bullets.
- The outline intro states the goal: the logical flow of information,
  iterated with the user to an approved outline. The outline walks
  the reader from question to answer.
- The governing thought is a short summary of the answer, not a
  one-sentence absolute. Failing to keep it short is a signal to
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
