---
name: analyze
description: "Learn the user's voice from a directory of writing samples and produce a signed-off voice template."
---

# Analyze

Build a voice template from the user's own writing so `/terse:edit` can
preserve how they sound, not just fix flags. The template is a contract:
the user signs it off before any skill treats it as their voice.

## Workflow

1. Resolve the samples directory from the user's request. Read every prose
   file in it (markdown, text); skip code and generated files. Fewer than
   three samples or under roughly 1,500 words total is a thin corpus: say
   so and continue only if the user confirms.
2. Measure the mechanical profile with
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs --json <files...>`:
   average sentence length and its spread (from `stats.sentenceLengths`),
   document grade, and the rates of adverbs, passive voice, and qualifiers
   per thousand words. These are the
   numbers the voice template records as observed, not aspirational.
3. Read the samples for the qualitative profile: characteristic sentence
   openers and connectors, paragraph length, formatting habits (headers,
   bullets, bold), vocabulary register, recurring phrases, how the author
   handles hedging and emphasis, first or third person, contractions.
4. Draft `voice.md` in the project's `.terse/` directory (create it) with:
   - frontmatter: `status: draft`, sample sources, date
   - the mechanical profile as measured numbers
   - the qualitative profile as short declarative traits, each with one
     quoted example from the samples as evidence
   - an exceptions section: Terse rules this voice deliberately overrides
     (for example, an author who uses em dashes stays an author who uses
     em dashes; record it here so `/terse:edit` stops flagging it)
5. Present the draft to the user trait by trait and ask what to keep,
   change, or drop. This sign-off is the point of the command: never mark
   the template approved on your own judgment.
6. On approval, set `status: approved` in the frontmatter. Tell the user
   the template location and that `/terse:edit`, `/terse:tone`,
   `/terse:review`, and the `writing` skill will now honor it.

## How the template is used

- `/terse:edit` reads `.terse/voice.md` when present and `approved`: the
  exceptions section suppresses matching checker flags, and rewrites must
  land inside the voice's measured ranges (a 12-word-average author does
  not get 30-word rewrites).
- `/terse:tone` shifts register within the approved voice, and
  `/terse:review` reports where the document drifts from it.
- A `draft` template is ignored, and the skills say so when they skip it.

## Verification

- [ ] The mechanical profile came from the checker's JSON output, not
      estimation.
- [ ] Every qualitative trait carries a quoted example from the samples.
- [ ] The user reviewed the draft and explicitly approved it; `approved`
      status was never set unprompted.
- [ ] The exceptions section exists, even if empty.
