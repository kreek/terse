# Document lengths

A person writes a Slack message in a sentence or two and an email in a
paragraph. A model writes both at memo length. This table gives each common
genre a ceiling and a shape, so a draft lands at the length a person would
write. The evidence behind each row is in `docs/research/document-lengths.md`
in the Terse repository.

Every number is a ceiling, never a target. The draft still says only what the
reader needs, and most pieces land well under the ceiling. Count prose words
only. Code blocks, logs, stack traces, and quoted source text do not count.

## Which length applies

Take the first of these that exists:

1. A length the user states in the request.
2. The `target:` of an approved outline.
3. The approved voice's length for the genre. The `style` skill finds the
   voice in the project's `.terse/voice.md`, then in `~/.terse/voice.md`.
   It records a length under "Lengths by genre" when its samples hold
   three or more pieces of that genre. The voice's maximum replaces the ceiling, and its shape notes
   replace the shape below.
4. The default in the table.

## Defaults

| Genre | Ceiling | Shape | Basis |
|---|---|---|---|
| Text or chat direct message | 25 words | No greeting, sign-off, or formatting. | convention; measured mean about 14 words |
| Slack message or thread reply | 50 words | No headings. A list only for three or more parallel items. Link to a long source instead of pasting it. | convention; measured mean 13 to 23 words |
| Slack announcement | 100 words | The news in the first sentence, then what the reader does. | convention |
| Email | 125 words | The ask in the first sentence, one ask per email, and a subject line that states it. | measured: replies peak at 50 to 125 words |
| Bug report | 150 words | What happens, what should happen, the steps to reproduce, and what it blocks. | measured shape, convention length |
| Feature request | 200 words | The problem and the required behavior. At most five acceptance criteria, one testable line each. No "As a user" story unless the repository's template asks for one. | convention |
| Pull request description | 150 words | What changed, why, and how it was verified. | convention; measured human median 56 words |
| Review comment | 3 sentences | The problem, then the fix or the question. | convention |
| Commit message | 50-character subject | Imperative subject, blank line, then a body only when the why is not obvious. Wrap the body at 72. | guidance for the subject, convention for the wrap |
| ADR | 1 or 2 pages | Context, decision, status, and consequences, in full sentences. | guidance |

A README, memo, design doc, explainer, or article has no default. Those go
through the outline, which sets a target with the user.

An unlisted genre takes the nearest row:

- a Teams or Discord message is a Slack message
- a Jira ticket is a bug report or a feature request
- a reply on an issue is a review comment
