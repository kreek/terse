---
type: regex
target: { source: file, path: README.md }
pattern: "(?:\\S+\\s+){350}\\S+"
match: not_contains
---
The README stays under 350 words. The facts given fit in about 175
words of skeleton, and the README ceiling is 2x. The `accurate-content`
grader is the other half: short because it dropped the install step
fails there.
