# Roadmap

The target: replace the leading readability and grammar tools for
markdown writers. All of it runs on the Claude subscription they already
pay for.
This file tracks the distance to that target. Each milestone names its
proof. A milestone without passing proof is not done.

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

The lexicons are seeds. The incumbents grew theirs from corpora over
years. Ours came from intuition and one review pass.

- [ ] Harvest tells from real model-written text. Run the checker over a
      corpus, read what survives, and grow the lists from the misses.
- [ ] Grow the simpler-alternatives table toward the incumbents'
      coverage.
- [ ] Detect weak verb phrases such as "is a reflection of", where
      "reflects" does the job.
- [ ] Tune the length-scaled targets against edited human prose. The
      goals should match editors, not guesses. Seed corpus: five
      public-domain Hemingway news pieces. One example is "At the End
      of the Ambulance Run". Reportage, not fiction: the register this
      plugin targets. Source:
      americanliterature.com/author/ernest-hemingway.
- [ ] Keep every property test green: conservation, metamorphic
      relations, and the CLI contract.

Proof: measured recall on a labeled corpus of tells. Zero new false
positives on clean human prose.

## Milestone 3: The highlight view

The classic readability editors made their name with colored highlights.
`/terse:check` prints a list. It should also render the document with
every flag marked in place.

- [ ] `scripts/render-highlights.mjs`: checker JSON in, one HTML page
      out. One color per category, hint on hover, stats header.
- [ ] `/terse:check` offers the rendered view and publishes it when the
      host supports pages.

Proof: a rendered page for a seeded document. All categories visible,
readable in light and dark themes.

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

- [ ] A PostToolUse hook: the checker runs on every markdown write in a
      session. Opt-in via settings.
- [ ] A documented CI recipe for other repos, with the false-alarm
      workflow spelled out.

Proof: the hook fires in a live session. One external repo gates its
prose on the checker in CI.

## Milestone 6: Editor depth

- [ ] Harden `/terse:proof`: detect the document's spelling convention,
      test that quotes keep their original errors.
- [ ] A before-and-after eval case per tone preset.
- [ ] Tune `/terse:review` on documents from writers other than the
      author.

Proof: eval cases per command, passing.

## Milestone 7: Verified quotes

Model-written documents sometimes invent quotes or drift from the
source wording. Terse should treat an unverified quote like a grammar
error. A machine finds it; the fix lands before the document ships.

- [ ] `scripts/quote-check.mjs`: find each quotation and its nearby
      source link. Fetch the source and prove the quote appears
      verbatim. Normalize only whitespace and quote marks. Same exit
      contract as the style checker: clean, findings, or error.
- [ ] A `/terse:cite` skill for writing quotes in. Fetch the source,
      copy the exact text, and link it. Never quote from memory.
- [ ] Anchor-deep links. Web sources get text-fragment URLs
      (`#:~:text=`), so the link opens with the quote highlighted.
      PDF sources get a page anchor (`#page=12`). A plain URL is the
      fallback, never the goal.
- [ ] Offline mode: when the fetch fails, the checker marks the quote
      unverified. No quote passes without its source.
- [ ] An eval case: a seeded document with one altered quote and one
      invented quote. The with-arm must catch both.

Proof: against a fixture source, the checker rejects a tampered quote.
It accepts the verbatim one. The eval case passes.

## Parity scorecard

| Capability | Readability editors | Grammar assistants | Terse today |
|---|---|---|---|
| Readability grading | yes | partial | yes |
| Passive, adverbs, wordiness | yes | yes | yes |
| AI-tell detection | no | tagging only | yes, with removal |
| Grammar repair | paid tier | yes | model layer, eval pending |
| Tone presets | paid tier | yes | yes, eval pending |
| Voice capture with sign-off | no | partial | yes |
| Colored highlight view | yes | yes | not yet (M3) |
| Always-on checking | app only | everywhere | not yet (M5) |
| Proven ablation delta | no | no | pending (M1) |
| Verified verbatim quotes | no | plagiarism scan only | not yet (M7) |

Neither incumbent can claim the last row. Landing M1 makes it ours.
