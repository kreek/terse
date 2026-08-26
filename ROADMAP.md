# Roadmap

The target: replace the leading readability and grammar tools for Markdown
writers. Terse runs as the same skills-only plugin in Codex Desktop, Codex CLI,
and Claude Code.
This file tracks the distance to that target. Each milestone names its
proof. A milestone without passing proof is not done.

The surface is one complete workflow plus four phase skills: write,
brainstorm, outline, draft, and edit. The automatic `style` skill carries the voice into everyday
prose.

## Runtime coverage

The Codex port keeps the Claude package and command surface. It adds the Codex
manifest, `$terse:*` syntax, shared hook payload handling, and an authenticated
Codex ablation runner.

- [x] Package the same six skills for Codex and Claude at version 0.12.0.
- [x] Parse Claude `file_path` and Codex `apply_patch` events in the opt-in
      style hook.
- [x] Add manifest, hook-process, GPT-signal, and human-corpus contract tests.
- [x] Complete the eight authenticated Codex runs and record every result,
      including invalid ablations and failed graders.
- [x] Rerun the corrected A/B harness and meet every acceptance condition.
- [x] Verify direct and automatic activation with Codex CLI.
- [x] Verify direct and automatic activation in a new Codex Desktop task.

Proof: deterministic validators and tests cover packaging and hook behavior.
The corrected four-genre corpus produced zero flags in every plugin-on file.
The paired baselines ranged from 29.8 to 128.2 flags per thousand words, with
facts preserved and activation isolated. A fresh Desktop task selected the
draft and edit skills for an unnamed memo request. Its direct `$terse:edit`
follow-up finished with a clean checker result.

## Principles

1. Correctness before breadth. A checker that never lies beats one that
   catches more but sometimes lies.
2. Numbers, not slogans. The eval suite referees every claim that the
   plugin makes prose better.
3. Dogfood everything. Every prose file in this repo passes its own
   checker. That includes this one.

## Milestone 1: Prove the delta

Done, with one caveat. The built-in eval tool sits behind an
early-access gate for this account. The first run used agent-session
ablation instead. Eight fresh sessions ran, one per case per arm. The with
arm reads and follows the terse skills. The without arm gets the task
alone. The checker scored every produced document.

First delta table. Recorded 2026-08-17, one run per arm, model
claude-fable-5:

| Case | Arm | Flags/kword | AI tells | Grade |
|---|---|---|---|---|
| claudism-removal | with | 0.0 | 0 | 7 |
| claudism-removal | without | 29.4 | 0 | 8 |
| generation-readme | with | 0.0 | 0 | 5 |
| generation-readme | without | 28.9 | 0 | 6 |
| generation-explainer | with | 0.0 | 0 | 4 |
| generation-explainer | without | 24.3 | 0 | 7 |
| grammar-repair | with | 73.7 | 0 | 8 |
| grammar-repair | without | 73.7 | 0 | 8 |

Reading it: every style case lands at zero flags with the plugin. The
same cases run 24 to 29 flags per thousand words without it. The
grammar case is parity by design. Both arms fixed all 16 planted
errors and left the style intact. A grammar-scope pass must not add
style flags, so equality passes there. The delta comes from the style
layer, so detection breadth (M2) stays next in line.

- [ ] Get eval enablement from Anthropic. Rerun with `npm run eval`
      to score this table with the real tool.
- [x] Run the suite and confirm the scorer against a real report.
- [x] Publish the first delta table in this file.
- [x] Let the numbers set priorities: M2 confirmed as next.

Proof: the committed table above. With-arm AI tells sit at zero
everywhere. Style cases beat the without arm. The grammar case holds
parity with 16 of 16 planted errors fixed in both arms.

## Milestone 2: Detection breadth

Done, 2026-08-17. Both sides grew from corpora. Model text drove
recall. Edited human prose set the false-positive bar and the targets.

- [x] Harvest tells from real model-written text. Four fresh sessions
      wrote a launch post, product copy, a tutorial, and a wiki page. The old lexicon flagged none of it. The
      harvest added the launch-post register
      (`thrilled to announce`, `under the hood`). It also added three
      structural patterns: negation triples, stop-start slogans, and
      triadic `whether` openers. Rerun on the same corpus: 0 tells
      before, 8 after.
- [x] Grow the simpler-alternatives table: 26 new entries, wordy
      connectors included (`for the purpose of`, `each and every`).
- [x] Detect weak verb phrases such as `is a reflection of`, where
      `reflects` does the job. The new `weak-verb` category holds 27
      phrase patterns. Each one hints the plain verb to use.
- [x] Tune the length-scaled targets against edited human prose. The
      yardstick is 7,355 words of Hemingway journalism, committed
      under `test/fixtures/human-prose/` and `samples/`. Measured
      rates per 1,000 words: 7.5 adverbs, 8.2 passives, 2.4
      qualifiers. Targets moved from guesses to n/134, n/123, n/400.
- [x] Keep every property test green: conservation, metamorphic
      relations, and the CLI contract. 77 tests pass.
- [x] 2026-08-19: the lexicon grew the claudism families from the
      community lists, in every inflection, and `very` joined the
      qualifiers. Sixty more corpus entries pin recall. The Hemingway
      corpus still shows zero lexical false positives.
- [x] 2026-08-20: caution on single words. A bare word is a tell only
      with no everyday literal sense. Words with one need their tell
      frame, and words with plain synonyms moved to the wordy list.
      A literal-sense test block pins the silence.

Proof, met: `test/corpus.test.js` pins total recall on a labeled
corpus of 27 planted tells and weak verbs. It also pins zero lexical
false positives on the committed human-prose fixtures. The pass
surfaced two real hits in this repo's own docs. We rewrote the
README's old negation-triple slogan; we did not whitelist it.

## Milestone 3: The highlight view

Done, 2026-08-17. The classic readability editors made their name with
colored highlights. The edit gate's report mode now renders them.

- [x] `scripts/render-highlights.mjs`: document in, one page out. One
      color per category. The hint shows on hover. Legend chips
      toggle categories. Flags now carry character spans.
      Word-level categories mark the phrase; sentence-level ones mark
      the sentence.
- [x] The report mode offers the rendered view. It publishes the page
      when the host supports pages. The preview stays read-only by
      design: you look at the page and direct fixes in chat, as in
      "fix all" or "fix only AI tells". We built and shipped a
      click-to-accept round trip first, then removed it. Chat says
      scope better than checkboxes, and a page without state cannot
      break.

Proof, met: a published page for a seeded document shows every
category. It holds in light and dark themes. A rendering test pins
text conservation. The page's text content equals the document. The
full cycle ran live: preview, an edit directed from chat, and a clean
republish at score 100.

## Milestone 4: Voice depth

The voice template works but is young.

- [ ] An eval case with an approved fixture template. The edit pass
      stays inside the measured ranges and honors exceptions.
- [ ] Multiple voices per project, such as a README voice beside a spec
      voice.
- [ ] Fast re-analysis, so the template tracks an author whose writing
      changes.

Proof: the voice eval case passes. A template diff shows drift tracking.

## Milestone 5: Always on

The leading grammar assistants win on presence. Terse should check
without a command.

- [x] A PostToolUse hook: the checker runs on every markdown write in
      a session. Opt-in via settings (`TERSE_HOOK=1`). Shipped
      2026-08-19.
- [x] The false-alarm workflow: quoted material and blockquotes stay
      silent, and `<!-- terse-ignore -->` records a keep in the file.
- [ ] A documented CI recipe for other repos.

Proof: subprocess tests cover both host payloads. Live CLI and Desktop hook
trust checks remain pending. One external repo gates its prose on the checker
in CI.

## Milestone 6: Editor depth

- [ ] Harden the grammar mode: detect the document's spelling
      convention, test that quotes keep their original errors.
- [ ] A before-and-after eval case per tone preset.
- [ ] Tune the review lenses on documents from writers other than the
      author.

Proof: eval cases per mode, passing.

## Milestone 7: Verified quotes

Model-written documents sometimes invent quotes or drift from the
source wording. Terse should treat an unverified quote like a grammar
error. A machine finds it; the fix lands before the document ships.

- [x] `scripts/quote-check.mjs`: find each quotation and its nearby
      source link. Fetch the source and prove the quote appears
      verbatim. Normalize only whitespace and quote marks. Same exit
      contract as the style checker: clean, findings, or error.
      Shipped 2026-08-23, with `[...]` elision support and one shared
      `quotedRanges` definition between the two checkers.
- [x] Quote writing lives in `/terse:draft`: fetch the source, copy the
      exact text, and link it. Never quote from memory. The gate treats
      an unverified quote as a finding, not a new command. The three
      quote categories joined the findings contract in the mechanics
      stage.
- [x] Anchor-deep links. Web sources get text-fragment URLs
      (`#:~:text=`), so the link opens with the quote highlighted.
      A plain URL is the fallback, never the goal. A verified quote
      on a plain web link draws a `quote-link-plain` finding, and the
      hint carries the fragment URL to paste. PDF page anchors
      (`#page=12`) remain open.
- [x] Offline mode: `--offline` never touches the network, and a fetch
      failure marks the quote unverified. No quote passes without its
      source.
- [ ] An eval case: a seeded document with one altered quote and one
      invented quote. The with-arm must catch both. The case sits in
      `evals/quote-verification`; the authenticated run remains open.

Proof, met in tests against the fixture source in
`test/fixtures/quotes/`. The checker rejects the tampered quote and
the invented one. It accepts the verbatim quote and the
fragment-linked one. The CLI contract tests pin exit codes 0, 1, and
2, with a fetch failure a finding rather than an error. The eval run
stays open.

## Milestone 8: Compose first

Done, 2026-08-17. Editing a real ADR taught the lesson. Fifteen correct
sentence fixes flattened the document's rhythm, because a flag list is
a worklist, not an edit plan. Structure problems want structure tools.

- [x] Outline-first composition, shipped first as one draft command and
      now split into `/terse:outline` and `/terse:write`. The user
      polishes the structure as bullets, one claim per section, checked
      for knowledge order and one-theme discipline. They sign off
      before any prose exists. Expansion then writes each section
      knowing its place in the whole, in the approved voice. A
      whole-document read ends the pass.
- [x] `/terse:edit` gained the same ending. Re-read every touched
      section whole, and check the cadence spread against the voice
      range. Local fixes can no longer flatten the rhythm unnoticed.

Proof: the skills carry the steps and their verification items. The
cadence numbers from the ADR session set the bar. The choppy pass
collapsed spread from 16.7 to 6.3; the flow-aware pass restored the
connective tissue.

## Milestone 9: Three phases, one contract

Done, 2026-08-18. Seven commands confused the surface. The product is
three phases: outline, write, edit.

- [x] The findings contract
      (`skills/style/references/findings.md`): one finding shape,
      categories mapped to stages, collect-once, and a staged fix
      loop. Grammar lands last on every sentence; a rewrite discards
      that sentence's stale grammar findings.
- [x] Three commands, one per phase. `/terse:outline` and
      `/terse:write` split the old draft command. `/terse:edit` is the
      publish gate; check, review, proof, and tone became chat-directed
      modes backed by reference files.
- [x] The `writing` skill stays always on and carries the voice into
      everyday prose. Voice analysis moved to an offer inside
      `/terse:write`.

Proof at the milestone: the simplified phase contract passed its tests. The
current skills directory holds six cross-runtime skills. The runtime-coverage
section owns their present packaging proof.

## Milestone 10: The angle before the outline

The outline skill starts from a named reader and one question, and
nothing upstream helped find them. The brainstorm skill fills that
gap as the phase before the outline.

- [x] `skills/brainstorm/SKILL.md`: diverge on three to five candidate
      angles, each with a reader, a question, and a governing thought.
      Converge on the user's explicit pick and write the approved
      brief (`<name>-brainstorm.md`) the outline skill reads.
- [x] The write workflow opens with the brainstorm skill when the
      angle is open. The outline skill takes its inputs from an
      approved brief.
- [ ] An eval case for angle quality. Brainstorming is interactive by
      design, so the case needs a scripted user; the design remains
      open.

Proof so far: the skill file passes the checker and ships in the same
cross-runtime package. The ablation runner's activation pattern names
it. A live convergence run stays open.

## Parity scorecard

| Capability | Readability editors | Grammar assistants | Terse today |
|---|---|---|---|
| Readability grading | yes | partial | yes |
| Passive, adverbs, wordiness | yes | yes | yes |
| AI-tell detection | no | tagging only | yes, with removal |
| Grammar repair | paid tier | yes | yes, parity eval (M1) |
| Tone presets | paid tier | yes | yes, eval pending (M6) |
| Voice capture with sign-off | no | partial | yes |
| Colored highlight view | yes | yes | yes (M3) |
| Always-on checking | app only | everywhere | opt-in hook, live host proof pending (M5) |
| Proven ablation delta | no | no | yes, on Claude (M1) and Codex |
| Verified verbatim quotes | no | plagiarism scan only | yes, eval run pending (M7) |
| Outline-first composition | no | no | yes |

Neither incumbent can claim the last row. The real-tool rerun in M1
hardens the delta claim.
