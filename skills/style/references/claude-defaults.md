# Redirecting Claude's default style

Claude's
[published system prompts](https://platform.claude.com/docs/en/release-notes/system-prompts)
tune it for chat responses, not documents. Some of those defaults serve
document writing; Terse overrides the others when the deliverable is
prose. The redirect is explicit because the model applying this plugin
is the same model those defaults shape.

## Defaults to keep

These chat defaults align with Terse's voice and carry over unchanged:

- Minimum formatting for clarity: no excessive bolding, few headers,
  no bullets where prose belongs.
- Brief caveats: most of the text on the main point.
- No emojis unless asked.
- Honest and willing to push back; concise by default.

## Defaults to redirect

| Chat default | In a document, do this instead |
|---|---|
| Warm, kind conversational tone | Neutral and direct. A document persuades with evidence, not warmth. Cut politeness padding ("feel free to", "you might want to consider"). |
| Soften refusals and disagreement | State the limitation or counterargument plainly, with the reason. |
| High-level summary unless depth is requested | The document's genre sets the depth; a spec or analysis owes the full argument, not a chat-sized digest. |
| Ask a clarifying question when ambiguous | A document cannot ask. Resolve the ambiguity or name the open question in a decisions/open-questions section. |
| Respond to the person | Write for the named reader of the document, who is often not the person in the conversation. |
| Brevity as courtesy to the chat partner | Brevity by selection: include what changes the reader's understanding or decision, at whatever length that takes. |

## Trained habits with no system-prompt source

The system prompt does not cause these, so no instruction there prevents
them; they are model tendencies and need active suppression when editing:

- Em dashes as the default connector.
- "It's not just X, it's Y" and compulsive triplets ("clear, concise, and
  effective").
- Synonym cycling to avoid repeating a word; repeat the word instead.
- Participial analysis tails ("...highlighting the need for").
- Significance announcements (`importantly`, `it's worth noting`) and
  pointers at the argument (`as we will see`).
- A verdict before its evidence: the reader's objection anticipated
  and ruled on by assertion (`and it does not need to`,
  `nor should it`). Cut the ruling; the proof that follows answers.
- Inflated verbs and vocabulary: `leverage`, `delve`, `robust`,
  `seamless`, `crucial`, `foster`, `streamline`.
- Stock figures where a decision or action wants its plain verb:
  `earns its place`, `moves the needle`, `does the heavy lifting`,
  `low-hanging fruit`.
- The slogan opener: a paragraph that starts on a count, a verdict
  verb, and then the list or the point (`Four questions settle it.`,
  `Two parts do the work:`). The shape is the tell, not the verbs the
  checker happens to list. Open with a connection to the paragraph
  before, or state the parts (`Terse has two parts:`), and keep the
  clipped verdict for a closer after a developed point.
- A closing summary that restates what the reader just read.
- Mid-sentence bold for emphasis.
- Citations collected in a sources or references list at the end,
  with bare claims above. Link the claim itself, inline.

The checker's `ai-tell` category now catches the lexical tells:

- the tell phrases (`worth noting`, `at its core`, `load-bearing`),
  in every inflection
- the candor and validation phrases (`the honest answer`,
  `great question`, `spot on`)
- the hedging connectives (`that said`, `to be fair`, `non-trivial`)
  and the metaphor soup (`happy path`, `blast radius`, `spaghetti code`)
- the reframe structures: `it's not X, it's Y` and its `isn't about`
  and em-dash variants, `not only X but also Y`
- signposting and document metadiscourse: `note that`,
  `keep in mind`, `in this document we`, `this section describes`,
  `let's dive`, and the closing summary announced (`in summary`)
- what the markdown itself reveals: a closing-summary heading
  (`Conclusion`, `Key Takeaways`), emoji, and a run of bold-label
  bullets
- single words, with caution. A bare word is a tell only when it has
  no everyday literal sense (`delve`, `synergy`). A word with one
  flags only in its tell frame (`testament to`, `underscores the`,
  `the data ecosystem`), and words with plain synonyms (`robust`,
  `crucial`, `seamless`) flag as wordy, with the swap in the hint

Quoted tells and blockquotes stay silent, and a
`<!-- terse-ignore -->` line records a keep in the file itself. The
editor still owns what no pattern can see:

- synonym cycling and compulsive triplets
- participial analysis tails
- closing summaries and mid-sentence bold
- figures of speech beyond the listed ones, including ordinary verbs
  used as figures

No lexicon can enumerate figures of speech. The checker frames the
common metaphorical verbs (`holds`, `buys`, `mints`, `carries`,
`forces`, `lives in`) in their machine shapes; the editor hunts the rest.
Apply the translation test from the `style` skill's Core Ideas to
every verb whose subject cannot do the action. If the literal verb
loses nothing, the figure is a finding. When `/terse:edit` runs,
hunt these in the same pass and treat them as flags of equal
standing.
