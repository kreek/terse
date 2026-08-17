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

The eval suite exists but has never run. The eval tool sits behind an
early-access gate for this account.

- [ ] Get eval enablement from Anthropic.
- [ ] Run `npm run eval:quick`. Confirm the report schema and fix the
      scorer if the shape differs.
- [ ] Run the full suite. Publish the first delta table in this file.
- [ ] Let the numbers set priorities. A failing case outranks every item
      below this line.

Proof: a committed results table. With-arm AI tells at zero. Fewer flags
per thousand words than the without arm, for all four cases.

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
      goals should match editors, not guesses.
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

Neither incumbent can claim the last row. Landing M1 makes it ours.
