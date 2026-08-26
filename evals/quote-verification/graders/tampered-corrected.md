---
type: regex
target: { source: file, path: article.md }
pattern: "(?i)catches the bug the first read"
match: not_contains
---
The altered quote ("catches" for the source's "finds") must not survive:
either corrected to the source wording or removed.
