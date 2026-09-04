---
type: regex
target: { source: file, path: draft.md }
pattern: "(?is)(?=.*change\\s+feeds?)(?=.*retr(?:y|ies|ied|ying))(?=.*batch)(?=.*deduplicat)(?=.*writes?)(?=.*cache\\s+hit\\s+rates?)(?=.*throughput)"
match: contains
---
Every planted fact remains mechanically visible after the edit: customer
change feeds, retries, batched writes, deduplicated writes, cache hit rates,
and throughput.
