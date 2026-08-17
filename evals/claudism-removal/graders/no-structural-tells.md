---
type: regex
target: { source: file, path: draft.md }
pattern: "(?i)(?:it|this|that)['’]s not (?:just |only )?[^,;.]{1,40}[,;] (?:it|this|that)['’]s|not only [^.;]{1,60}but also|—"
match: not_contains
---
No "it's not X, it's Y" constructions, no "not only X but also Y", and no
em dashes remain.
