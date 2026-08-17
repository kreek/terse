---
type: regex
target: { source: file, path: README.md }
pattern: "(?i)—|\\b(robust|seamless|powerful|blazingly|effortlessly|leverages?|delves?|streamlines?|crucial|pivotal|ecosystem|journey)\\b|worth noting|here['’]s the thing|(?:it|this|that)['’]s not (?:just |only )?[^,;.]{1,40}[,;] (?:it|this|that)['’]s"
match: not_contains
---
The README contains no em dashes, inflated vocabulary, tell phrases, or
"it's not X, it's Y" constructions.
