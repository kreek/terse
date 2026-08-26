---
type: regex
target: { source: file, path: README.md }
pattern: "(?:\\S+\\s+){200}\\S+"
match: not_contains
---
The README stays under 200 words, below the interactive skeleton checkpoint.
The `accurate-content` grader is the other half: short because it dropped a
required fact fails there.
