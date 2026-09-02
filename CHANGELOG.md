# Changelog

Notable changes to Terse. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A mechanics tier in the checker. `grammar` flags cover doubled
  function words, `could of`, `its` before a word only `it's`
  precedes, and `their` before a be-verb. A list of misspellings with
  one correct form joins them. The hook and the CI gate now catch what a grammar assistant's free
  tier catches; the model keeps the rest of the grammar scope.
- `.terse/config.json`: the checker's defaults per project (`maxGrade`,
  `impersonal`, `ignore`, `targets`), found by walking up from the file.
  Voice analysis writes it, so the hook and the CLI honor an approved
  voice without the model in the loop. `ignore` takes a category or
  `category:match`.
- `scripts/outline-check.mjs`: proves an approved outline's arithmetic.
  Missing, extra, and reordered sections, a section over its `budget:`,
  and the document over its `target:` are `structure` findings. The
  edit gate and the draft report run it.
- Technical-prose coverage. Nominalizations in every inflection:
  `made the decision`, `conducted an investigation into`,
  `provides the capability to`. The wordy connectors `in terms of`
  and `the reason is because`. The hedges `seems`, `tends to`,
  `relatively`, and `in some cases`. Signposting: `note that`,
  `please note`, `keep in mind`. Document metadiscourse:
  `in this document we`, `this section describes`, `let's dive`. The
  closing summary announced: `in summary`, `in conclusion`.
- Structural tells the markdown reveals: a closing-summary heading
  (`Conclusion`, `Key Takeaways`), emoji, and a run of three or more
  bold-label bullets.
- UK spellings of the wordy words (`utilise`, `endeavour`).
- The slogan opener matches its shape, not only its famous verbs: a
  count, a verdict verb, then the list. `Two parts do the work:` and
  `Three layers carry the load.` now flag; `Terse has two parts:`
  does not. The style reference describes the shape for the edit
  read.
- Tests for the hook, the config, and the outline checker.

### Changed

- Word-level flags report the line the match sits on, not the line
  the sentence starts on. A `<!-- terse-ignore -->` comment now covers
  the whole paragraph that follows it, so a keep on a hard-wrapped
  sentence holds.
- The hook reports only the flags inside an Edit's inserted text; a
  Write still reports the whole file.
- State idioms no longer count as passive voice: `is based on`, `is
  located in`, `is supposed to`, `get started`, `is meant for`, and
  their kin. The actor was never missing.
- A sentence adverb before a comma (`Unfortunately, ...`) hints
  deletion rather than a stronger verb, and `Firstly` hints `first`.
- A phrase and a frame matching the same words (`it is worth noting`)
  count as one tell.
- `that said` flags only at the start of a sentence; `a note that said
  goodbye` is a note.
- The qualifier target rate is 2.7 per thousand words, remeasured on
  the Hemingway corpus after the new hedges joined the list.
- The eval cases and the fallback runner allow the `Skill` and `Bash`
  tools, which the with-plugin arm needs to load a skill and run the
  checker. Without them the two arms were the same session. The
  runner now captures each session's transcript, so the `skill-fired`
  grader scores in the fallback. A failed session reports the
  transcript's final result event when stderr is silent. Without an
  API key the runner uses the subscription login with settings
  isolated. The scorer counts only each case's deliverable, not the
  outline and skeleton the pipeline writes beside it.
- The write and draft skills honor approval given in advance. A
  one-shot or scripted run cannot answer a stop, and the user says
  so. The skill then writes the phase file, marks it approved in
  advance, and continues to the deliverable. The generation eval
  cases say it. Without it the with-plugin arm stopped at the outline
  and never wrote the document.
- The README, the roadmap, and the style skill's handoffs name all five
  skills; the write skill refers to draft's steps by name, not number.

### Fixed

- The roadmap's own `flags now carry character spans` tripped the new
  carry frame and failed the CI self-check.
- A qualifier's span pointed at the first look-alike in the sentence,
  not the occurrence the lexicon matched. In
  `at the very least, the job is very slow` the span marked the
  emphasis and missed the hedge. A look-alike inside quotes silenced
  the real flag. Spans now come from the matching pattern,
  lookarounds included.
- `that said` flagged inside `a note that said goodbye`; the hedge now
  matches only at the start of a sentence.

- The checker flags `carry` as a figure for `hold`, `include`, or
  `have` (`domains carry fixed weights`, `the report carries the line`,
  `each option carries a risk`). A porter carrying a crate stays
  silent. It also flags `what makes it run` and its kin, the verdict
  whose subject cannot do the verb. Terse's own skills used the carry
  figure fifteen times; all now say the literal verb.
- The edit loop reads every `ai-tell` frame match in context before
  fixing it. The checker matches a surface; the editor runs the
  translation test on the sentence, and a literal use is a keep with
  that reason. The tripwire table's false alarms were the only
  escape before; the test is now the rule behind them.
- The checker flags metadiscourse pointers (`as we will see`,
  `as noted above`) and the verdict announced before its evidence
  (`and it does not need to`, `nor should it`, `and that is fine`).
  The style skill names both under never commenting on the writing:
  anticipate the reader's objection, then answer it with proof, not
  a ruling.

## [0.11.0] (2026-08-21)

### Added

- The checker frames six ordinary verbs in their metaphorical
  shapes: `holds`, `buys`, `mints`, `carries`, `forces`, and
  `lives in`. The style skill extends the translation test past the
  stock figures to every verb whose subject cannot do the action.
- The draft skill's expansion gains a fifth reader question: a
  sentence the reader must read twice expands until one pass carries
  it. The edit gate's omission audit counts skeleton compression as
  a gap. A compressed sentence scores clean on every metric and
  costs the reader the most parse effort.
- The edit gate audits warrant: a sentence whose link to its section
  claim depends on reasoning the draft cut is a `structure` finding.
  The draft skill cuts a claim and its warrant together.

### Changed

- An action standing as subject or object takes a gerund or a full
  clause: `renaming`, never `a rename`. A noun the domain owns
  (`a commit`) stays.
- Fix mode names the passive-voice keeps outright: statements of a
  thing's capability or limit (`topics cannot be renamed`) keep
  their passive instead of joining the worklist.

## [0.10.0] (2026-08-21)

### Added

- `/terse:write` is now one request to a finished document. It runs
  the outline, the skeleton with its additions, the expansion, and
  the edit gate in fix mode. It stops twice for sign-off, at the
  outline and at the skeleton. Pieces under 200 words skip the stops.
  The skill that expands an approved outline moves from
  `/terse:write` to `/terse:draft`. `/terse:outline` and `/terse:edit`
  keep their names. Entries below this release use the old names.

### Changed

- Links go inline on the claim they support. The style skill's Core
  Ideas say so, and the write skill drafts that way. The edit gate
  flags a sources list at the end as a `structure` finding, and the
  fix moves each link onto its claim.

## [0.9.0] (2026-08-21)

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
  moved to the wordy list, where the flag names the swap. A
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
  response. The bid response has a rule the others do not. The
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
- Flags include character spans, so previews mark the exact phrase.
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
