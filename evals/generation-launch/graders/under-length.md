---
type: regex
target: { source: file, path: launch.md }
pattern: "(?:\\S+\\s+){200}\\S+"
match: not_contains
---
The launch post stays under 200 words, so the automatic draft path can finish
without the interactive skeleton checkpoint. The content grader
ensures that brevity did not remove required facts.
