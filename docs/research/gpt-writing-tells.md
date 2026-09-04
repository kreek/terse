# GPT and Codex writing-tell research

This note records how Terse chooses model-linked editing signals. It does not
try to detect who wrote a passage. The checker's `ai-tell` category marks
wording worth editing; a match cannot prove its source.

## Sources

The first word list comes from two published studies:

- Kobak et al., the [PubMed corpus
  study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12219543/), measures word use
  in more than 15 million PubMed abstracts. Its 2024 style list includes forms
  of `delve`, `underscore`,
  and `showcase`; it also discusses terms such as `intricate`.
- Russell et al., the [expert detection
  study](https://aclanthology.org/2025.acl-long.267/), examines 300 nonfiction
  articles from GPT-4o, Claude, o1, and human writers. Experts noted repeated
  structures and stiff formality. They also noted low originality and uniform
  prose. Those broad judgments do not map to safe regex rules.

Official OpenAI guides define the packaging and runtime method. See the
[Claude-plugin conversion guide](https://developers.openai.com/plugins/guides/submit-claude-plugin),
the [plugin packaging guide](https://developers.openai.com/plugins/build/plugins),
and the [Codex hooks reference](https://learn.chatgpt.com/docs/hooks).

## Admission method

A candidate enters the checker only when it meets all three
conditions:

1. A published source links it to model-written text, or it appears
   in at least two of the four live Codex genres.
2. Terse can give it a safe word frame or a plain replacement.
3. It produces no lexical flags in the committed human-prose corpus.

The four live genres are a README, an explainer, a launch post, and
an edit with planted tells. Each runs once with `terse@terse` enabled and once
with it disabled. Both arms use the active default model in a fresh temporary
workspace with project rules disabled. The comparison records the date, model,
CLI version, checker metrics, fixed graders, and skill activation.

The false-alarm bar is stricter than the source evidence. Increased use in
one corpus does not make a word wrong in every sentence. A word with an
ordinary sense needs a narrow frame, or it remains editorial guidance. Quoted
text and blockquotes stay exempt. An approved voice template can keep any
style choice, including em dashes.

## Admitted signals

| Signal | Checker treatment | Safe edit | False-alarm limit |
|---|---|---|---|
| `delve` and inflections | `ai-tell` lexical family | State the specific action, such as `examines` | Word boundaries; quotations exempt; human corpus clean |
| `underscore` and inflections | `ai-tell` only in claim-emphasis frames | State the evidence or consequence | A literal underscore character stays silent |
| `showcase` and inflections | `simpler-alternative` | `show` | Edit only; never proof of who wrote it |
| `pivotal` | `simpler-alternative` | `key` | Edit only; never proof of who wrote it |

These rules predate the Codex port. This research supplies a published GPT
evidence base. It also adds positive, inflection, literal-sense, quoted, and
human-corpus test coverage. Their labels remain editing signals.

## Rules kept out of the checker

| Candidate | Decision | Reason |
|---|---|---|
| `intricate` | Editor instruction only | `Complex`, `detailed`, and `intricate` do not mean the same thing in every field. A bare rule would flag normal descriptions. |
| `meticulous` | Editor instruction only | It can describe a needed standard of care. No safe general replacement or narrow frame exists. |
| Formulaic structure | Editor instruction only | Paragraph uniformity and repeated structure need document context. Regex would punish valid templates. |
| Formality | Editor instruction only | Register belongs to the audience and genre. Formal prose is not itself a defect. |
| Low originality | Editor instruction only | It requires a baseline and judgment, not a local word match. |
| Em dashes | Existing Terse style rule | Terse prefers a period, colon, or comma. The rule is voice-overridable and is not an authorship signal. |

## Deterministic evidence

`test/corpus.test.js` covers every admitted GPT-linked rule. It tests
positive and inflected forms, literal senses, quoted examples, and the entire
committed human-prose corpus. `npm test` and the repository self-check are the
acceptance commands.

## Live Codex record

The signed-in run tested two CLI builds. Codex CLI 0.139.0 loaded the
direct `$terse:edit` skill, but the active `gpt-5.6-sol` endpoint rejected that
client as too old before generation. The Desktop-bundled Codex CLI
0.149.0-alpha.4.1 completed the live calls on 2026-08-22 and 2026-08-23 UTC.
Direct invocation edited its fixture, and a prose request that did not name
Terse activated an installed Terse skill.

The first corpus contained eight model runs, one intended pair per genre. The
table records the file each run made, not an expected file that was absent.
`Flags/kword`, AI tells, and grade come from `style-check.mjs`.

| Genre | Arm | Artifact | Flags/kword | AI tells | Grade | Skill | Fixed graders | Valid A/B? |
|---|---|---|---:|---:|---:|---|---|---|
| planted edit | on | `draft.md` | 0.0 | 0 | 12 | transcript lost after scorer error | facts pass | No: off-arm override was not effective |
| planted edit | off | `draft.md` | 0.0 | 0 | 11 | not recorded | facts pass | No: off-arm override was not effective |
| README | on | `README-outline.md` | 14.2 | 0 | 12 | yes | target file and length fail | No: workflow stopped for sign-off |
| README | off | `README-outline.md` | 16.2 | 0 | 13 | yes | target file and length fail | No: CLI override left Terse enabled |
| explainer | on | `explainer-outline.md` | 31.7 | 0 | 12 | yes | target file and length fail | No: workflow stopped for sign-off |
| explainer | off | `explainer.md` | 44.8 | 0 | 9 | no | length pass; tell regex fail | No: on arm did not produce the target |
| launch post | on | `launch.md` | 0.0 | 0 | 9 | yes | tells, facts, and length pass | Yes |
| launch post | off | `launch.md` | 33.2 | 0 | 13 | no | tells, facts, and length pass | Yes |

The launch pair met every check, but three pairs were invalid. The run exposed
four defects and fixed them:

- The runner closes Codex stdin.
- Inline regex flags accept `(?is)`.
- Each arm uses an isolated Codex home because CLI 0.149.0-alpha.4.1 ignored
  the per-command plugin override.
- The multi-stop write workflow triggers when the user names it.

The scorer also rejects off-arm skill activation.

### Corrected rerun

The user authorized a second eight-run corpus after those fixes. Codex CLI
0.149.0 ran `gpt-5.6-sol` on 2026-08-26 UTC. Each plugin-on output
had zero tells and zero total flags. Terse activated only in the on arms, and
every generated file kept its supplied facts. We regraded the saved files
after two fact frames learned equivalent wording such as `standard input` for
`stdin`. We did not repeat any model calls.

| Genre | Arm | Flags/kword | AI tells | Grade | Skill | Facts | Result |
|---|---|---:|---:|---:|---|---|---|
| planted edit | on | 0.0 | 0 | 11 | yes | pass | pass |
| planted edit | off | 128.2 | 5 | 15 | no | pass | baseline |
| explainer | on | 0.0 | 0 | 8 | yes | pass | pass |
| explainer | off | 29.8 | 0 | 9 | no | pass | baseline |
| launch post | on | 0.0 | 0 | 8 | yes | pass | pass |
| launch post | off | 37.0 | 1 | 12 | no | pass | baseline |
| README | on | 0.0 | 0 | 5 | yes | pass | pass |
| README | off | 58.8 | 0 | 7 | no | pass | baseline |

The corrected corpus meets the full live acceptance bar. It adds no fixed
rule: every off-arm finding belongs to an existing Terse category, and no new
safe phrase appeared in two genres. Fixed checks and the live comparison now
support the rules above.

### Desktop smoke check

A fresh Codex Desktop task on 2026-08-23 selected `terse:draft` and
`terse:edit` for an unprompted professional-memo request. The saved memo
passed at 30 words, grade 6, with zero tells and zero total flags. A direct
`$terse:edit` follow-up preserved every supplied fact and returned the same
clean result.
