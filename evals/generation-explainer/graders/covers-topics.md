---
type: llm
target: { source: file, path: explainer.md }
criteria: Technically correct, covers all four required topics, right audience level.
---
Score 1 only if the explainer correctly covers: what an index is, B-tree
lookup versus full table scan, the write penalty of additional indexes, and
when not to index. Terminology beyond SQL basics must be introduced before
use, and there are no technical errors.
