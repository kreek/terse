---
type: regex
target: { source: file, path: draft.md }
pattern: "(?i)here['’]s the thing|worth noting|importantly|at its core|load[- ]bearing|doing real work|in conclusion"
match: not_contains
---
The edited draft must contain no signpost or tell phrases.
