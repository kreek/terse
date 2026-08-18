# Redirecting Claude's default style

Claude's published system prompts
(https://platform.claude.com/docs/en/release-notes/system-prompts) tune it
for chat responses, not documents. Some of those defaults serve document
writing; others must be overridden when the deliverable is prose. Terse
makes the redirect explicit: the model applying this plugin is the same
model those defaults shape.

## Defaults to keep

These chat defaults align with Terse's voice and carry over unchanged:

- Minimum formatting for clarity: no excessive bolding, headers used
  sparingly, no bullets where prose belongs.
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
- Significance announcements ("importantly", "it's worth noting").
- Inflated verbs and vocabulary: leverage, delve, robust, seamless,
  crucial, foster, streamline.
- Stock figures where a decision or action wants its plain verb:
  "earns its place", "moves the needle", "does the heavy lifting",
  "low-hanging fruit".
- A closing summary that restates what the reader just read.
- Mid-sentence bold for emphasis.

The checker's `ai-tell` category now catches the lexical tells
mechanically: the tell phrases ("worth noting", "at its core",
"load-bearing"), the banned vocabulary, and the "it's not X, it's Y" and
"not only X but also Y" structures, alongside the existing em-dash and
simpler-alternative flags. What remains the editor's responsibility is
what no pattern can see: synonym cycling, compulsive triplets,
participial analysis tails, closing summaries, mid-sentence bold, and
stock figures beyond the listed phrases. No lexicon can enumerate
figures of speech, so apply the translation test from the `writing`
skill's Core Ideas: if the literal verb loses nothing, the figure is a
finding. When `/terse:edit` runs, hunt those in the same pass and
treat them as flags of equal standing.
