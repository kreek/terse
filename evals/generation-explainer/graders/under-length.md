---
type: regex
target: { source: file, path: explainer.md }
pattern: "(?:\\S+\\s+){600}\\S+"
match: not_contains
---
The explainer stays under the 600 words the prompt allows. The
`covers-topics` grader is the other half: short because it skipped a
topic fails there.
