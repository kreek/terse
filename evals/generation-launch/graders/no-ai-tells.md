---
type: regex
target: { source: file, path: launch.md }
pattern: "(?i)—|\\b(robust|seamless|powerful|crucial|pivotal|delves?|leverages?|showcases?|journey|landscape|ecosystem|intricate|meticulous)\\b|worth noting|here['’]s the thing|thrilled to announce|excited to announce|at its core|(?:it|this|that)['’]s not (?:just |only )?[^,;.]{1,40}[,;] (?:it|this|that)['’]s|not only [^.;]{1,60}but also"
match: not_contains
---
The launch post contains no em dashes, inflated vocabulary, stock launch
phrases, tell phrases, or tell constructions.
