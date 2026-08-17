---
type: regex
target: { source: file, path: notes.md }
pattern: "(?i)pipeline have|stage run\\b|it['’]s own|tests passes|artifacts is|Their are|canary fail\\b|system revert\\b|happens automatic\\b|You['’]re on-call engineer|rate rise\\b|seperate|to complex|Its now|quater|the affects of"
match: not_contains
---
None of the sixteen planted errors survive: agreement (pipeline have,
stage run, tests passes, artifacts is, canary fail, system revert, rate
rise), homophones and apostrophes (it's own, Their are, You're on-call,
Its now, the affects of), spelling (seperate, quater), and misused forms
(happens automatic, to complex).
