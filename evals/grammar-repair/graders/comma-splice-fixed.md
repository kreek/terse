---
type: regex
target: { source: file, path: notes.md }
pattern: "previous release, this happens"
match: not_contains
---
The comma splice ("...previous release, this happens...") is repaired.
