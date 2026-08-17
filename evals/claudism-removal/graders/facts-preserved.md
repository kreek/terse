---
type: llm
target: { source: file, path: draft.md }
criteria: Every listed fact survives the edit with its meaning intact.
---
Check the edited document still states all of these facts, in any wording:
the service reads customer change feeds; it retries failed work; it batches
writes; it deduplicates writes; it improves cache hit rates and throughput.
Score 1 only if all five survive with meaning intact and no new invented
facts appear.
