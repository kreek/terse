---
type: llm
target: { source: file, path: notes.md }
criteria: All corrections are grammatical fixes; no facts changed, added, or dropped.
---
Compare against the intent of the original: three pipeline stages, per-stage
containers, upload after tests, two rollback paths, automatic canary
rollback, on-call paging on error rate, config/code separation deferred to
next quarter with monitoring. Score 1 only if all facts survive and every
change is a correctness fix rather than a stylistic rewrite.
