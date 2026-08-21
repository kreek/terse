---
name: edit
description: "The publish gate: collect every finding across readability, style, AI tells, and grammar; report them or fix them in staged order."
---

# Edit

## Iron Law

`EVERY REWRITE TRACES TO A FINDING. MEANING AND VOICE SURVIVE EVERY EDIT.`

Run the findings contract (the `style` skill's
`references/findings.md`) end to end: collect everything at once, then
report or fix as the user directs. This is Terse's publish gate, run
like a linter: prose written under `/terse:write` should need little
repair, and imported or older text gets full repair. The checker finds,
this skill judges and rewrites, and grammar comes last on every
sentence it touches. Every rewrite traces to a finding, because the
model cannot judge its own prose without an outside standard. The
findings contract is that standard.

## Modes

The user directs the mode and scope in chat; collection is the same in
every mode.

- **fix** (default): run the staged loop over every finding.
- **report only** (`check this`, `review it, don't edit`): report the
  findings and stop. Lead with the `structure` and `voice-drift`
  findings no mechanical fix covers, assess through the `style`
  skill's `references/review-lenses.md`, and offer the highlight
  preview. The document stays unmodified.
- **grammar only** ("proofread", "just fix the grammar"): the mechanics
  stage alone, under the `style` skill's `references/grammar-scope.md`.
  No style opinions.
- **tone** (`make it casual`, `simpler, grade 8`): rewrite toward a
  preset per the `style` skill's `references/tone-presets.md`, then run
  the gate; a tone pass must not add new findings.
- **trim** ("cut 15%", "this runs long"): the user sets the target as a
  percent or a word count. A draft from `/terse:write` carries a
  working note of reader questions. Cut the sentences with no
  question first. Cutting is structural, so it runs like any
  `structure` finding. Propose the cuts against the reverse outline,
  take the user's direction, then run the gate over what remains. Spend
  the cut where the document is not working, on sections that restate,
  asides, and paragraphs the outline never asked for. Shaving the same
  share out of every sentence hits the number and flattens the prose.
- **scoped fix** (`fix only the AI tells`, `everything except the
  quotes`): filters select findings; they never change the loop.
  Findings outside the scope become decided keeps for this pass,
  reported but untouched.

## Workflow

1. If `.terse/voice.md` exists with `status: approved`, load it: its
   exceptions suppress matching findings, and its measured ranges bound
   every rewrite. Ignore a `draft` template and say so.
2. Load the `style` skill's Core Ideas and Tripwires, and its
   `${CLAUDE_PLUGIN_ROOT}/skills/style/references/claude-defaults.md`;
   together they govern every rewrite.
   The defaults reference also lists trained habits the checker cannot
   catch. Hunt them in the collection read that follows: synonym
   cycling, compulsive triplets, participial tails, closing summaries,
   and a sources list at the end. The list is a `structure` finding.
   The fix moves each link onto the claim it supports and removes
   the list.
3. Collect per the contract: run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file...>` for
   the mechanical flags, and read the document once for the `grammar`
   and `voice-drift` findings. `--max-grade N` sets the target reading
   level. A voice template or a document type that fixes a grade
   supplies the default; the flag overrides it. `--impersonal` adds
   the pronoun findings, for issues, specs, and acceptance criteria.
   In the same read,
   build the reverse outline: one line per paragraph stating the claim
   it makes, not the topic it covers. "The cache" is a topic; "the
   cache cuts p99 latency in half" is a claim. Then group the lines by
   claim across the whole document. A paragraph on page one and one
   on page four share a group when they assert the same thing.
   Distance never excuses a match. This claim inventory is the method
   for the repetition audit. Work from the findings, not from a
   free-form read.
4. Audit the reverse outline before any fix. Read the list for jumps,
   misordering, and paragraphs carrying two points. Check the flow at
   every level. Each subsection makes one point, that point supports
   its section's claim, and the sections in order walk the reader from
   question to answer. Four more checks run against the list:
   - restatement: a claim group holding two or more paragraphs is a
     restatement, not emphasis, wherever the paragraphs sit. Each
     group emits one `structure` finding. It lists every paragraph in
     the group, names one as the keep, and marks the rest as
     candidates for cut or merge. The keep is the instance the
     argument needs where it stands: the first, or the best evidenced.
     A later instance that adds evidence, a qualification, or a new
     consequence is an advance and emits no finding. Only a paragraph
     that brings nothing new joins the group. Two places need a closer
     look. The paragraph after a strong claim tends to reassert the
     claim instead of supporting it, and the closing section tends
     toward summary
   - length: compare the document against its target, and each section
     against its budget when an approved outline sets one. An overrun
     is a finding even when the user did not ask for a trim
   - the outline's promises, when an approved outline file exists:
     every section makes its assigned claim. The lead still sets up
     the governing thought, and the last section is the ask or the
     decision. Claims the outline marked disputable still show their
     evidence
   - the outline's record: deviations logged during drafting count as
     decided keeps, not findings. Only undocumented drift counts
   - omission, on a draft from `/terse:write`: the draft is short by
     design, so check what it left out. Three gaps count. A disputable
     claim with no evidence. A term the reader does not own. A step
     the draft does not give the reader enough to take. Each is a
     `structure` finding naming the reader question the draft owes
   Each problem is a `structure` finding. In fix mode, report these and
   take the user's direction before the sentence loop starts. Polishing
   a sentence in a section the user then cuts wastes the work.
   Structural rewrites happen only on the user's explicit direction,
   never on your own.
5. In report-only mode, report the document stats first: words,
   reading time, grade, and the counts against their targets. Name
   what the document does well in one short paragraph; an editor who
   only lists faults loses the reader. Then report every finding ordered
   by impact on the reader, grouped by category within that, each with
   a `file:line` reference and a one-sentence fix. Close by naming the
   mode that fixes each category. Offer the highlight preview: run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/render-highlights.mjs <file>`
   for a self-contained, read-only page; publish it when the host
   supports pages. The page renders the checker's categories; judgment
   findings go in the chat report. Stop here.
6. Otherwise, visit each sentence with findings once, applying them in
   the contract's stage order. A rewrite in the first two stages
   discards the sentence's collected grammar findings; re-proof the new
   wording.
   - **structural** first:
     - hard sentence: split it, or turn an in-sentence list into
       bullets
     - long opening: cut it back to the fact the reader came for
     - aside: cut it, or promote it to its own sentence
   - **wording** second:
     - passive voice: name the actor
     - adverb: choose a stronger verb, or give the number
     - qualifier: delete it or state the evidence
     - simpler alternative and weak verb: substitute the suggested word
     - ai-tell: delete the tell phrase or swap the inflated word for a
       plain one. For "it's not X, it's Y", pick the claim you mean
       and state it once
     - em dash: use a period, colon, or comma. Parentheses work only
       when the span stays under six words, or when the fix trades one
       flag for an aside
     - voice-drift: return to the template's register
   - **mechanics** last, on the wording that now exists: grammar,
     spelling, and punctuation, under the `style` skill's
     `references/grammar-scope.md`.
   Skip a finding only when it matches a documented false alarm or a
   voice-template exception; keep a list of skips with the reason.
   `structure` findings go to the report, not the loop.
7. Preserve the author's voice: every edit stays inside the flagged
   sentence, and the author's order and content survive untouched.
   Meaning must survive every edit; when a fix would change what the
   sentence claims, skip it and say so.
   Cuts the user approved are the one exception, and they remove whole
   units: a section, a paragraph, an aside. Trimming a claim down to
   fit is a meaning change wearing a length excuse.
8. Re-run the checker. Iterate until the remaining flags are all
   documented keeps. Stop when a pass changes only cosmetics. Revert
   a pass that makes the stats worse. Most of the gain comes in the
   first round or two.
9. Re-read every touched section whole. A findings list is a worklist,
   not an edit plan: fifteen correct local fixes can leave a paragraph
   reading as chopped fragments. Four audits happen in this read:
   - cadence against the voice template's measured spread (`--json`
     gives `stats.sentenceLengths`); a collapsed spread means the
     splits flattened the rhythm
   - the first and last sentence of each paragraph, read in sequence,
     must chain
   - key terms keep their names across sections; a renamed term breaks
     the reader's thread
   - where a cut or a merge landed, the paragraphs on either side must
     still meet.
   Restore flow with the author's own devices: connective openers,
   asymmetric splits, a short verdict against a long analysis.
   Never restore it by undoing the fixes.
10. Report: findings fixed per category, findings kept with reasons,
    and the before/after stats line including length against target.
    Include the cadence spread before and after.

## Verification

- [ ] The mode matched the user's direction; report-only left the
      document unmodified.
- [ ] A report named what the document does well and the mode that
      fixes each category.
- [ ] The reverse outline ran before the sentence loop; in fix mode,
      `structure` findings got the user's direction first.
- [ ] The reverse outline records each paragraph's claim, and the
      restatement check grouped those claims across the whole
      document, not only across adjacent lines.
- [ ] Every repeated-claim finding lists the full group, names one
      keep, and went to the report for the user's direction.
- [ ] A later instance that advanced its claim raised no finding.
- [ ] The audit covered restatement, length against target and
      budget, and omission on a short draft.
- [ ] When an outline file exists, the audit covered its recorded
      claims and promises.
- [ ] The flow check covered every level: subsection points support
      their sections, and the sections walk the reader from question
      to answer.
- [ ] The checker ran before and after; every remaining flag is a
      documented keep, not a leftover; iteration stopped at the stop
      rules.
- [ ] You visited each sentence once, stages in order, grammar last,
      and carried no grammar finding across a rewrite.
- [ ] Every edit is within the flagged sentence; the author's structure
      and meaning are intact.
- [ ] Cuts removed whole units under the user's direction, and no
      claim shrank to fit a number.
- [ ] Kept findings each carry a tripwire or voice-template reason.
- [ ] You honored the user's stated scope; out-of-scope findings
      appear in the report as decided keeps.
- [ ] Every touched section was re-read whole after the fixes, and the
      cadence spread did not collapse against the voice range.
- [ ] The paragraph transitions chain across cuts and merges, and key
      terms kept their names across sections.
- [ ] The report shows before/after stats and length against target.
