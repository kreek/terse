---
name: claudism-removal
tags: [editing, ai-tells]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit"]
---
Create a file named `draft.md` with exactly the content between the BEGIN and
END markers (do not include the markers), then edit that file to improve its
writing. Keep every factual claim.

BEGIN
# The Sync Service

Here's the thing — the sync service isn't just a scheduler, it's the
load-bearing heart of our platform. It's worth noting that every design
decision underscores our commitment to a robust, seamless, and
transformative data ecosystem.

At its core, the service delves into each customer's change feed and
leverages a multifaceted retry strategy. This approach doesn't just reduce
errors — it fosters resilience across the entire landscape of our
infrastructure, showcasing the synergy between the queue layer and the
storage realm.

Importantly, the service not only batches writes but also deduplicates
them, a testament to the team's journey toward cutting-edge reliability.
The batching logic is doing real work here: it streamlines throughput,
elevates cache hit rates, and unlocks crucial headroom — ensuring
performance, scalability, and maintainability.

In conclusion, the sync service stands as a pivotal component. It's not
just infrastructure, it's the foundation of everything we ship.
END

Facts that must survive the edit: the service reads customer change feeds,
retries failed work, batches writes, deduplicates writes, and improves cache
hit rates and throughput.
