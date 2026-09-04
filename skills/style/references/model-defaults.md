# Redirecting model defaults

Writing models favor useful conversation over finished documents.
Some defaults serve work prose; others need a change. Apply the
shared rules first, then use the host-specific notes as evidence about what to
look for. Do not turn a tendency into a claim about who wrote the text.

## Defaults to keep

These chat defaults align with Terse and carry over unchanged:

- Minimum formatting for clarity: no excessive bolding, few headers, and no
  bullets where prose belongs.
- Brief caveats, with most of the text on the main point.
- No emojis unless asked.
- Honest disagreement and concise answers.

## Defaults to redirect

| Chat default | In a document, do this instead |
|---|---|
| Warm conversational tone | Stay neutral and direct. Cut politeness padding such as "feel free to". |
| Softened refusals and disagreement | State the limit or opposing case with its reason. |
| High-level summary unless depth is requested | Let the genre set the depth. A spec or analysis owes the full argument. |
| Ask a follow-up question when unclear | Resolve the gap or record it as an open question. |
| Respond to the chat partner | Write for the document's named reader. |
| Brevity as courtesy | Select what changes the reader's understanding or decision. |

## Shared model tendencies

Look for these habits during the single collection read. The checker catches
the framed cases it can; the editor judges the rest:

- phrases that announce importance, such as `importantly` and `worth noting`
- negative parallelism such as `it's not just X, it's Y`
- synonym cycling, compulsive triplets, and uniform paragraph shapes
- trailing analysis such as "highlighting the need for"
- inflated vocabulary, stock figures, and formal connective tissue
- a slogan opener built from a count, verdict verb, and list, such as
  `Two parts do the work:`
- pointer nouns such as `this approach` or `that split` that make the reader
  reconstruct the preceding idea
- closing summaries that restate the document
- mid-sentence bold used only for emphasis
- sources collected at the end instead of linked to the claims they support

The `ai-tell` category is an editing signal. It marks wording that often makes
model-written prose less direct; it never proves who wrote the text. A fixed
rule needs a safe frame or plain replacement and zero
false positives in the committed human-prose corpus. Quoted text and
quoted blocks remain exempt. `<!-- terse-ignore -->` records a chosen keep.

Em dashes follow the same boundary. Terse flags them because a period, colon,
or comma is often clearer, not because a dash proves machine authorship. An
approved voice template can keep them.

## Claude tendencies

Anthropic publishes [Claude system
prompts](https://platform.claude.com/docs/en/release-notes/system-prompts).
They explain the chat defaults above. Review Claude prose for warm framing and
chat-sized summaries. Also check em-dash connectors, negative parallelism,
triplets, and closing summaries. Keep the document's reader and genre in
control.

## GPT and Codex tendencies

Corpus research links GPT-written text to excess style vocabulary. Examples
include `delve`, framed forms of `underscore`, `showcase`, `intricate`,
`meticulous`, and `pivotal`. Expert research also points to formulaic
forms, stiff prose, low novelty, and uniform text. The checker handles the
safe lexical cases. The editor looks for the broader tendencies without
assuming that any one passage has a machine author.

Use the plain replacement when it preserves meaning: `show`, not `showcase`;
`complex` or `detailed`, not `intricate`; `careful`, not `meticulous`; `key`,
not `pivotal`. Keep the technical or literal sense when the replacement is
less precise. Repeat a necessary term instead of cycling through synonyms.

The evidence, admission method, rejected candidates, and false-positive limits
live in `docs/research/gpt-writing-tells.md`.

## What remains editorial judgment

No lexicon can enumerate figures of speech or formulaic structure. The checker
frames common figurative verbs such as `holds`, `buys`, `mints`, `carries`,
`forces`, and `lives in`; the editor hunts the rest. Apply the translation test
from the style skill on each verb whose subject cannot do the action. If the
literal verb loses nothing, record a finding. In the same pass, review synonym
cycling, triplets, trailing analysis, and slogan openers. Also review pointer
nouns, closing summaries, uniform paragraph shapes, and decorative bold.
