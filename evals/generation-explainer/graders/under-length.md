---
type: regex
target: { source: file, path: explainer.md }
pattern: "(?:\\S+\\s+){200}\\S+"
match: not_contains
---
The explainer stays under 200 words, so automatic drafting finishes without
the interactive skeleton checkpoint. The `covers-topics` grader is the other
half: short because it skipped a topic fails there.
